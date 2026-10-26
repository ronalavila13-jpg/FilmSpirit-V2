/* ============================================================
   ESPACIO 2D DEL STORYBOARD · dibujo a mano por capas y cuadros
   Lápiz, tinta, pincel suave, marcador, borrador, lazo, flechas anchas
   que se curvan, texto, guías de perspectiva, papel cebolla y fotos de
   referencia con opacidad.
   Datos:   sh.ws = '2d' · sh.d2 = { rev, base, baseOp, layers, frames, fps, loop, objs, guides, onion, act }
   Imágenes: FRAMES['<plano>~d~<capa>~<cuadro|all>']  dibujo de cada capa (PNG)
             FRAMES['<plano>~c~<cuadro>']             cuadro compuesto (JPEG) para storyboard, animatic y PDF
   ============================================================ */
const d2Key = (id, lid, fk) => `${id}~d~${lid}~${fk}`;
const d2CKey = (id, fid) => `${id}~c~${fid}`;
const d2Holds = d => d.frames.reduce((n, f) => n + (f.hold || 1), 0);
const d2Len = d => d2Holds(d) / (d.fps || 12);
/* cuadro visible en el segundo t del plano: avanza por sus esperas y, en bucle, vuelve a empezar */
function d2FrameAt(d, t) {
  const tot = d2Holds(d);
  let n = Math.floor(((t || 0) + (d.t0 || 0)) * (d.fps || 12) + 1e-6);   // t0: entrada del plano (al dividirlo o recortarlo en el animatic)
  n = d.loop !== false ? ((n % tot) + tot) % tot : clamp(n, 0, tot - 1);
  for (const f of d.frames) { n -= f.hold || 1; if (n < 0) return f; }
  return d.frames[d.frames.length - 1];
}
/* viñeta de un plano 2D (la usan storyboard, animatic, PDF y video) */
function d2Draw(ctx, sh, t, W, H) {
  const d = sh.d2;
  if (!d || !d.frames || !d.frames.length) return false;
  const ck = d2CKey(sh.id, d2FrameAt(d, t).id), im = cachedImg(ck);
  if (!im && frameHas(ck) && !FRAMES[ck]) framesNeed([ck]);   // el cuadro existe pero aún no llega
  if (im) ctx.drawImage(im, 0, 0, W, H);
  else { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); }
  return true;
}
/* ---------- el 2D y el 3D juntos (lote U) ----------
   La escena 3D es una capa más del dibujo: la «Viñeta 3D» (d.base '3d' se ve, 'paper' no; d.baseOp, su opacidad).
   Las capas encima de ella se superponen; las de debajo son el fondo, detrás de las figuras. Van debajo solo las
   imágenes que dicen «Detrás de las figuras» (L.back); el dibujo (trazos, flechas y textos) va siempre encima. Lo de
   antes no tiene back: todo queda encima, como se veía.
   Con una foto detrás de las figuras, la escena 3D se dibuja sin su entorno (cielo, suelo, muros, habitación), como
   la foto de referencia «Detrás» del editor 3D: quedan las figuras y los objetos con sus sombras sobre un piso
   invisible, y la foto hace de fondo real. Si la foto es transparente a medias, debajo se ve el papel.
   La viñeta del storyboard, el PDF y el animatic muestran las dos cosas juntas, sin elegir entre 2D y 3D (sh.ws solo
   dice en qué espacio se abre el plano). En el editor 3D se ven en la vista de cámara (shot-editor.js).
   d.v = 2: dibujos guardados con este modelo. En uno anterior que se dejó en el 3D (sh.ws '3d'), la viñeta mostraba la
   escena 3D entera: así se sigue viendo (visible y opaca) hasta que se vuelva a guardar en el 2D.
   L.imp: la capa trajo la foto de referencia ('ref') o la anotación ('anno') del editor 3D; esas no se dibujan otra vez */
const d2On = sh => !!(sh && sh.d2 && Array.isArray(sh.d2.frames) && sh.d2.frames.length && Array.isArray(sh.d2.layers));
const d2Back = L => !!(L && L.back && L.kind === 'image');
/* las capas en el orden en que se ven: primero las de fondo (detrás de las figuras), después las de encima */
const d2Layers = d => { const L = ((d && d.layers) || []).filter(l => l && l.id); return [...L.filter(d2Back), ...L.filter(l => !d2Back(l))]; };
const d2Old = (sh, d = sh.d2) => (d.v || 1) < 2 && sh.ws !== '2d';
/* ¿se ve la escena 3D en la viñeta? (sin dibujo 2D: si el plano no es un dibujo a mano) */
function shot3D(sh) {
  if (!d2On(sh)) return !sh || sh.ws !== '2d';
  return d2Old(sh) || sh.d2.base === '3d';
}
const d2Op3D = sh => d2On(sh) && !d2Old(sh) ? clamp(+(sh.d2.baseOp ?? .45) || 0, 0, 1) : 1;
/* ¿la capa trajo la imagen de referencia o la anotación del editor 3D? (las de antes se reconocen por su nombre) */
const d2Imp = (d, k) => !!d && ((d.layers || []).some(l => l && (l.imp === k || (l.imp == null && (d.v || 1) < 2 && (k === 'ref' ? l.kind === 'image' && l.name === 'Referencia' : l.name === 'Anotaciones')))));
/* el editor 3D cambió su referencia o su anotación: desde ahora se ve la nueva (la capa que la trajo queda como una más) */
function d2Unimp(sh, k) {
  const d = sh && sh.d2; if (!d || !d2Imp(d, k)) return;
  if ((d.v || 1) < 2) d2Norm(sh, d);
  for (const l of d.layers || []) if (l && l.imp === k) delete l.imp;
  d.rev = (d.rev || 0) + 1;
}
/* un dibujo anterior al modelo de capas, puesto como se veía: la Viñeta 3D visible y opaca si se dejó en el 3D; las
   capas que trajeron la referencia o la anotación, marcadas */
function d2Norm(sh, d) {
  if ((d.v || 1) >= 2) return d;
  if (sh.ws !== '2d') { d.base = '3d'; d.baseOp = 1; }
  for (const l of d.layers || []) if (l && l.imp == null) { if (l.kind === 'image' && l.name === 'Referencia') l.imp = 'ref'; else if (l.name === 'Anotaciones') l.imp = 'anno'; }
  d.v = 2;
  return d;
}
/* las imágenes de las capas que se ven en el cuadro del segundo t (todas las de todos los cuadros con t null) */
function d2LayerKeys(sh, t = 0) {
  if (!d2On(sh)) return [];
  const d = sh.d2, Fs = t == null ? d.frames : [d2FrameAt(d, t)], out = [];
  for (const L of d2Layers(d)) { if (!L.vis) continue; for (const k of L.shared ? [d2Key(sh.id, L.id, 'all')] : Fs.map(F => d2Key(sh.id, L.id, F.id))) if (frameHas(k) && !out.includes(k)) out.push(k); }
  return out;
}
/* las que necesita la viñeta combinada (sin la Viñeta 3D la viñeta es el cuadro ya compuesto, que ya cuenta) */
const d2ViewKeys = (sh, t = 0) => d2On(sh) && shot3D(sh) ? d2LayerKeys(sh, t) : [];
/* las imágenes que necesita la viñeta (la del storyboard, el animatic y el PDF) */
const shotViewKeys = (sh, t = null) => sh ? [...frameViewKeys(sh.id), ...d2ViewKeys(sh, t)] : [];
/* ¿hay una foto detrás de las figuras en el cuadro F? */
const d2Under = (sh, F) => d2Layers(sh.d2).some(L => d2Back(L) && L.vis && (L.op ?? 1) > 0 && frameHas(d2Key(sh.id, L.id, L.shared ? 'all' : F.id)));
/* las capas de fondo (back) o las de encima de un cuadro, con su opacidad, en un lienzo de W×H (alineadas al cuadro) */
function d2Paint(ctx, sh, F, W, H, back) {
  const d = sh.d2, [DW, DH] = frameDims(1280);
  for (const L of d2Layers(d)) {
    if (!L.vis || d2Back(L) !== !!back) continue;
    const fk = L.shared ? 'all' : F.id, k = d2Key(sh.id, L.id, fk), op = clamp(+(L.op ?? 1) || 0, 0, 1);
    if (frameHas(k)) { if (!FRAMES[k]) framesNeed([k]); const im = cachedImg(k); if (im) { ctx.globalAlpha = op; ctx.drawImage(im, 0, 0, W, H); ctx.globalAlpha = 1; } }
    const objs = d.objs && d.objs[L.id + '~' + fk];
    if (Array.isArray(objs) && objs.length) { ctx.save(); ctx.scale(W / DW, H / DH); for (const o of objs) if (o && o.type) d2DrawObj(ctx, o, op); ctx.restore(); }
  }
}
const d2Sig = (sh, t) => {
  if (!d2On(sh)) return '';
  const d = sh.d2, f = d2FrameAt(d, t);
  if (!shot3D(sh)) return `2d:${d.rev || 0}:${f.id}:${!!cachedImg(d2CKey(sh.id, f.id))}`;
  // con la escena 3D: las capas de ese cuadro (y si ya cargaron), la opacidad de la Viñeta 3D y lo que va detrás
  return `2d3:${d.rev || 0}:${f.id}:${d2ViewKeys(sh, t).map(k => cachedImg(k) ? 1 : 0).join('')}:${d2LaySig(sh)}`;
};
/* lo que cambia la viñeta combinada sin depender de qué imágenes ya cargaron (la clave que se guarda en el navegador) */
const d2LaySig = sh => d2On(sh) ? `${shot3D(sh) ? d2Op3D(sh) : 'p'}:${JSON.stringify(d2Layers(sh.d2).map(L => [L.id, !!L.vis, L.op, d2Back(L), L.imp || 0]))}` : '';
/* todas las imágenes de un plano: referencia, anotación, capas 2D y cuadros compuestos */
const shotKeys = id => frameKeysOf(id);   // cargadas o no (con el servidor llegan a medida que hacen falta)
function delShotFrames(id) {
  for (const k of shotKeys(id)) { delete FRAMES[k]; IMGS.delete(k); Store.saveFrame(P.id, k, null).catch(() => { }); }
}
async function copyShotFrames(from, to) {
  return framesHold(async () => {
  await framesNeed(shotKeys(from));
  const ks = shotKeys(from).filter(k => FRAMES[k]);
  const r = await Promise.allSettled(ks.map(k => { const nk = to + k.slice(from.length); FRAMES[nk] = FRAMES[k]; return Store.saveFrame(P.id, nk, FRAMES[nk]); }));
  const bad = ks.filter((k, i) => r[i].status === 'rejected');
  if (bad.length) problem(bad.length === 1 ? 'Un dibujo del plano no se pudo copiar.' : `${bad.length} dibujos del plano no se pudieron copiar.`, () => Promise.allSettled(bad.map(k => Store.saveFrame(P.id, to + k.slice(from.length), FRAMES[to + k.slice(from.length)]))).then(x => { if (x.some(y => y.status === 'rejected')) problem('Siguen sin copiarse algunos dibujos.'); else toast('Dibujos copiados.'); }));
  return r;
  });
}
/* borra un plano con sus tomas y dibujos; el aviso trae «Deshacer» (devuelve también los dibujos) */
function deleteShot(id, loaded) {
  if (!P.shots[id]) return;
  // para poder deshacerlo, sus dibujos tienen que estar en la memoria: si faltan, se traen y se borra enseguida
  if (!loaded && shotKeys(id).some(k => !FRAMES[k])) { FR_HOLD++; framesNeed(shotKeys(id)).finally(() => { try { deleteShot(id, true); } finally { FR_HOLD--; } }); return; }
  if (loaded && shotKeys(id).some(k => !FRAMES[k])) { problem('No se borró el plano: sus dibujos no se pudieron leer para poder deshacerlo. Revisa tu conexión e inténtalo otra vez.'); return; }
  const code = D.code[id] || '';
  const frames = Object.fromEntries(shotKeys(id).map(k => [k, FRAMES[k]]));
  histNote(`Eliminar el plano ${code}`.trim(), frames, 'board');
  delete P.shots[id]; if (P.sup && P.sup.takes) delete P.sup.takes[id];
  delShotFrames(id);
  if (P.animatic) P.animatic.order = (P.animatic.order || []).filter(x => x !== id);
  changed('data'); derive(); render();
  toastUndo(`Plano ${code} eliminado.`.replace('  ', ' '));
}

/* ---------- herramientas ---------- */
const D2_PAL = ['#16171B', '#4A4D55', '#8C9099', '#C9CCD2', '#FFFFFF', '#C8382C', '#E8622C', '#F2B63C', '#3E9A57', '#2E8FBF', '#2C47CF', '#7A4CC2', '#D9478F', '#7A4B2E', '#E9C7A5', '#B5835A'];
const D2_TOOLS = [
  ['move', 'Mover', 'V'], ['pencil', 'Lápiz', 'B'], ['ink', 'Tinta', 'I'], ['brush', 'Pincel suave', 'R'], ['marker', 'Marcador', 'M'], ['eraser', 'Borrador', 'E'],
  ['lasso', 'Lazo', 'L'], ['arrow', 'Flecha', 'A'], ['text', 'Texto', 'T'], ['persp', 'Perspectiva', 'G'], ['hand', 'Mano', 'H'],
];
const D2_BRUSH = new Set(['pencil', 'ink', 'brush', 'marker', 'eraser']);
const D2_ARROW_RED = '#C8382C';
const D2_DEF = {
  pencil: { size: 3, op: .9, smooth: 35 }, ink: { size: 6, op: 1, smooth: 50 }, brush: { size: 46, op: .7, smooth: 25 },
  marker: { size: 20, op: .5, smooth: 40 }, eraser: { size: 30, op: 1, smooth: 25 },
  arrow: { w: 34, head: 1, tail: .55, outline: 'none', op: 1, double: false, _v2: 1 }, text: { size: 44, bold: true, bg: 'none' },
};
const D2_MAX = { pencil: 40, ink: 60, brush: 240, marker: 120, eraser: 240 };
const D2_ICO = {
  move: '<path d="M6 3l13 7.2-5.6 1.6L11 18z"/><path d="M13.4 11.8l4.6 6.2"/>',
  pencil: '<path d="M4 20l1.2-4.6L15.6 5a2 2 0 012.8 0l.6.6a2 2 0 010 2.8L8.6 18.8z"/><path d="M13.6 7l3.4 3.4"/>',
  ink: '<path d="M12 21V12"/><path d="M12 3l5.5 7.5L12 21 6.5 10.5z"/><circle cx="12" cy="10.5" r="1.4"/>',
  brush: '<path d="M14.5 4.5l5 5-6.2 6.2-5-5z"/><path d="M8.3 10.7c-2.6.6-4 2.6-4.3 8.8 5.6-.2 7.7-1.7 8.3-4.3"/>',
  marker: '<path d="M8.5 13.5l7-9.5 4.5 3.3-7 9.5z"/><path d="M8.5 13.5l-2.5 2 1 2.5 3 .5 2.5-2"/><path d="M4 20.5h7"/>',
  eraser: '<path d="M4.5 15.5l9-10a2 2 0 012.8-.1l3.3 3a2 2 0 01.1 2.8L13 18.5H8.2z"/><path d="M9 9.5l6 5.5"/><path d="M8 20.5h12"/>',
  lasso: '<ellipse cx="12" cy="9.5" rx="8" ry="5.2" stroke-dasharray="3.2 2.4"/><path d="M8.3 14.2c-1.6 2.4-.4 5.8 3.2 5.8"/>',
  arrow: '<path d="M3.5 19c1.6-6.6 5.8-10.4 11.5-11.2V4.8l5.5 5-5.5 5v-3.1c-4 .6-7.5 3.4-11.5 8.3z"/>',
  text: '<path d="M5 7V5h14v2"/><path d="M12 5v14"/><path d="M9 19h6"/>',
  persp: '<path d="M2 12h20"/><path d="M12 12L3 21M12 12l9 9M12 12L4.5 3M12 12l7.5-9"/><circle cx="12" cy="12" r="1.6"/>',
  hand: '<path d="M8 12.5V6a1.5 1.5 0 013 0v5m0-6.5a1.5 1.5 0 013 0V11m0-5a1.5 1.5 0 013 0v7.5c0 4-2.6 7-6.5 7-2.8 0-4.4-1.4-5.8-4l-1.6-3a1.5 1.5 0 012.6-1.5L8 14"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 000 11H13"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.6A9.6 9.6 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 01-2.6 3.3M6.3 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/>',
  unlock: '<rect x="5" y="10.5" width="14" height="9.5" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 017.6-1.7"/>',
  dup: '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5.5A1.5 1.5 0 0014.5 4h-9A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16H8"/>',
  clear: '<path d="M4.5 15.5l9-10a2 2 0 012.8-.1l3.3 3a2 2 0 01.1 2.8L13 18.5H8.2z"/><path d="M9 9.5l6 5.5"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/><path d="M10 11v5.5M14 11v5.5"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
};
const d2Ico = (k, cls = '') => `<svg class="s2i ${ea(cls)}" viewBox="0 0 24 24" aria-hidden="true">${D2_ICO[k]}</svg>`;
let D2F = '';
const D2_FONT = () => D2F || (D2F = getComputedStyle(document.body).getPropertyValue('--font-ui').trim() || 'system-ui, sans-serif');

/* textura de grafito para el lápiz: ruido de transparencia que se repite */
let D2_GRAIN = null;
function d2Grain(g) {
  if (!D2_GRAIN) {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const x = c.getContext('2d'), im = x.createImageData(96, 96);
    for (let i = 0; i < im.data.length; i += 4) { im.data[i] = im.data[i + 1] = im.data[i + 2] = 0; im.data[i + 3] = 120 + Math.random() * 135; }
    x.putImageData(im, 0, 0); D2_GRAIN = c;
  }
  return g.createPattern(D2_GRAIN, 'repeat');
}

/* ---------- geometría de la flecha ancha ---------- */
/* curva cúbica que pasa por dos puntos de doblez (h1 a un tercio, h2 a dos tercios): permite arcos y eses */
function d2Ctrl(o) {
  const A1 = { x: 27 * o.h1.x - 8 * o.p0.x - o.p1.x, y: 27 * o.h1.y - 8 * o.p0.y - o.p1.y };
  const A2 = { x: 27 * o.h2.x - o.p0.x - 8 * o.p1.x, y: 27 * o.h2.y - o.p0.y - 8 * o.p1.y };
  return [{ x: (2 * A1.x - A2.x) / 18, y: (2 * A1.y - A2.y) / 18 }, { x: (2 * A2.x - A1.x) / 18, y: (2 * A2.y - A1.y) / 18 }];
}
const cb = (a, c1, c2, b, t) => { const u = 1 - t; return { x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y }; };
/* contorno de la flecha: cuerpo que se afina hacia la cola y punta ancha que sigue la curva */
function d2ArrowPoly(o) {
  const N = 56, pts = [], L = [0];
  const [c1, c2] = d2Ctrl(o);
  for (let i = 0; i <= N; i++) pts.push(cb(o.p0, c1, c2, o.p1, i / N));
  for (let i = 1; i <= N; i++) L.push(L[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const tot = L[N];
  if (tot < 2) return null;
  const w = o.w, hl = Math.min(tot * (o.double ? .38 : .6), w * 1.45 * (o.head || 1)), hw = w * 2.1 * Math.sqrt(o.head || 1);
  const tan = i => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], l = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: (b.x - a.x) / l, y: (b.y - a.y) / l }; };
  const at = s => { let i = 1; while (i < N && L[i] < s) i++; const f = (s - L[i - 1]) / ((L[i] - L[i - 1]) || 1); return { p: { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f }, t: tan(i) }; };
  const s0 = o.double ? hl : 0, s1 = tot - hl;
  const tail = o.double ? 1 : (o.tail ?? .55);
  const wAt = s => w * (tail + (1 - tail) * clamp((s - s0) / ((s1 - s0) || 1), 0, 1));
  const left = [], right = [];
  const add = (p, t, ww) => { left.push({ x: p.x - t.y * ww / 2, y: p.y + t.x * ww / 2 }); right.push({ x: p.x + t.y * ww / 2, y: p.y - t.x * ww / 2 }); };
  const A = at(s0); add(A.p, A.t, wAt(s0));
  for (let i = 1; i < N; i++) if (L[i] > s0 && L[i] < s1) add(pts[i], tan(i), wAt(L[i]));
  const B = at(s1); add(B.p, B.t, w);
  const head = (base, t, tip) => [{ x: base.x - t.y * hw / 2, y: base.y + t.x * hw / 2 }, tip, { x: base.x + t.y * hw / 2, y: base.y - t.x * hw / 2 }];
  const hR = head(B.p, B.t, pts[N]);
  const out = [...left, hR[0], hR[1], hR[2], ...right.reverse()];
  if (o.double) { const hT = head(A.p, { x: -A.t.x, y: -A.t.y }, pts[0]); out.push(hT[0], hT[1], hT[2]); }
  return out;
}
function d2PathOf(poly) { const p = new Path2D(); poly.forEach((q, i) => i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)); p.closePath(); return p; }
function d2DrawObj(g, o, alpha = 1) {
  g.save(); g.globalAlpha *= alpha * (o.op ?? 1);
  if (o.type === 'arrow') {
    const poly = d2ArrowPoly(o);
    if (poly) {
      const path = d2PathOf(poly);
      if (o.outline && o.outline !== 'none') { g.lineJoin = 'round'; g.lineWidth = Math.max(3, o.w * .2); g.strokeStyle = o.outline === 'dark' ? '#16171B' : '#FFFFFF'; g.stroke(path); }
      g.fillStyle = o.color; g.fill(path);
    }
  } else if (o.type === 'text') {
    const b = d2TextBox(o);
    g.font = d2TextFont(o); g.textBaseline = 'top';
    if (o.bg === 'white' || o.bg === 'dark') { g.fillStyle = o.bg === 'white' ? 'rgba(255,255,255,.94)' : 'rgba(22,23,27,.86)'; roundRect(g, b.x, b.y, b.w, b.h, o.size * .22); g.fill(); }
    const lines = (o.text || '').split('\n');
    lines.forEach((ln, i) => {
      const y = o.y + i * o.size * 1.18;
      if (o.bg === 'halo') { g.lineJoin = 'round'; g.lineWidth = o.size * .2; g.strokeStyle = '#FFFFFF'; g.strokeText(ln, o.x, y); }
      g.fillStyle = o.color; g.fillText(ln, o.x, y);
    });
  }
  g.restore();
}
const d2TextFont = o => `${o.bold ? 750 : 500} ${o.size}px ${D2_FONT()}`;
let D2_MEAS = null;
function d2TextBox(o) {
  const g = D2_MEAS || (D2_MEAS = document.createElement('canvas').getContext('2d'));
  g.font = d2TextFont(o);
  const lines = (o.text || ' ').split('\n');
  const w = Math.max(o.size * .6, ...lines.map(l => g.measureText(l || ' ').width)), h = lines.length * o.size * 1.18, pad = o.size * .28;
  return { x: o.x - pad, y: o.y - pad * .8, w: w + pad * 2, h: h + pad * 1.4 };
}

/* ---------- abrir ---------- */
let S2 = null;
function d2New(sh, isNew) {
  const L = (name, o = {}) => ({ id: uid('l'), name, kind: 'draw', vis: true, op: 1, shared: false, ...o });
  const layers = [], imp = [];
  // la foto de referencia del editor 3D: detrás de las figuras si allá iba detrás (opaca, como se veía); delante, para
  // calcar sobre papel (tapaba la escena)
  const ref = !!FRAMES[sh.id], back = ref && !!sh.refBack;
  if (ref) { const l = L('Referencia', { kind: 'image', shared: true, op: back ? 1 : .6, imp: 'ref', ...(back ? { back: true } : {}) }); layers.push(l); imp.push([l.id, sh.id]); }
  const fondo = L('Fondo', { shared: true }), dib = L('Dibujo');
  layers.push(fondo, dib);
  if (FRAMES[sh.id + '~a']) { const l = L('Anotaciones', { shared: true, imp: 'anno' }); layers.push(l); imp.push([l.id, sh.id + '~a']); }
  // la Viñeta 3D entra entera (es una capa más del cuadro); su opacidad se baja en Capas para calcar
  return {
    v: 2, rev: 0, base: isNew || (ref && !back) ? 'paper' : '3d', baseOp: 1, layers, frames: [{ id: uid('f'), hold: 2 }], fps: 12, loop: true,
    objs: {}, guides: { type: 'none', vp: null, snap: false, show: true }, onion: { on: false, prev: 1, next: 1, op: .4 }, act: dib.id, _imp: imp,
  };
}
async function openShot2D(id, isNew) {
  const sh = P.shots[id];
  if (!sh) return;
  const s = sceneOfKey(sh.sc);
  if (!s) return;
  closeModal(); closePop();
  if ($('#s2Modal')) $('#s2Modal').remove();
  await ensureFrames('index');
  await framesNeed(frameKeysOf(id));
  const [DW, DH] = frameDims(1280);
  const fresh = !sh.d2;
  const d = fresh ? d2New(sh, isNew) : d2Norm(sh, JSON.parse(JSON.stringify(sh.d2)));
  if (!d.frames || !d.frames.length) d.frames = [{ id: uid('f'), hold: 2 }];
  if (!d.layers || !d.layers.length) d.layers = [{ id: uid('l'), name: 'Dibujo', kind: 'draw', vis: true, op: 1, shared: false }];
  d.objs = d.objs || {}; d.guides = d.guides || { type: 'none', vp: null, snap: false, show: true }; d.onion = d.onion || { on: false, prev: 1, next: 1, op: .32 };
  if (!d.layers.some(l => l.id === d.act)) d.act = d.layers[d.layers.length - 1].id;
  const tools = { ...JSON.parse(JSON.stringify(D2_DEF)), ...ls.get('d2tools', {}) };
  for (const k of Object.keys(D2_DEF)) tools[k] = { ...D2_DEF[k], ...(tools[k] || {}) };
  if (!tools.arrow._v2) { tools.arrow.outline = 'none'; tools.arrow._v2 = 1; }   // antes el contorno blanco venía puesto
  const E = S2 = {
    id, sh, s, isNew, fresh, d, DW, DH, R: new Map(), saved: false, fi: 0, tool: ls.get('d2tool', 'pencil'), T: tools,
    color: ls.get('d2color', '#16171B'), recent: ls.get('d2recent', []), sel: null, float: null, lasso: null, stroke: null, text: null, drag: null,
    // las flechas recuerdan su propio color (rojo de entrada); lápices, pinceles y textos comparten el otro
    colors: { draw: ls.get('d2color', '#16171B'), arrow: ls.get('d2acolor', D2_ARROW_RED) }, mask: null, bsz: null, alt: false,
    V: { z: 1, x: 0, y: 0 }, hist: [], redo: [], dirty: false, playing: false, BGs: new Map(), v3sel: false, ver: 0, hover: null, space: false, ro: UI.readOnly,
  };
  d.layers = d2Layers(d);   // las de fondo (detrás de las figuras) primero: el orden de la lista es el que se ve
  if (!D2_TOOLS.some(t => t[0] === E.tool)) E.tool = 'pencil';
  E.color = E.colors[E.tool === 'arrow' ? 'arrow' : 'draw'];
  const list = D.shotsBy[sh.sc] || [];
  const idx = list.indexOf(sh);
  const ar = DW / DH;
  const ov = document.createElement('div');
  ov.className = 's2'; ov.id = 's2Modal';
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', `Plano ${D.code[id] || ''} · dibujo 2D`);
  ov.style.setProperty('--ar', ar);
  ov.innerHTML = `<header class="s2-top">
      <div class="s2-title"><b>Plano ${esc(D.code[id] || '')}</b><span>Esc. ${esc(s.key)} · ${esc(s.heading)}</span></div>
      <div class="seg s2-ws" role="group" aria-label="Espacio de trabajo"><button data-ws="3d" aria-pressed="false" title="Figuras, cámara y luces en 3D">3D</button><button data-ws="2d" aria-pressed="true" title="Dibujo a mano por capas">2D</button></div>
      <span class="grow"></span>
      <div class="s2-grp"><button class="btn ghost sm s2-ib" data-s2="undo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer">${d2Ico('undo')}</button><button class="btn ghost sm s2-ib s2-redo" data-s2="redo" title="Rehacer (Ctrl+Mayús+Z)" aria-label="Rehacer">${d2Ico('redo')}</button></div>
      <div class="s2-grp s2-zoom"><button class="btn ghost sm s2-ib" data-s2="zo" aria-label="Alejar">−</button><button class="btn ghost sm" data-s2="fit" id="s2Z" title="Ajustar a la ventana (0)">100 %</button><button class="btn ghost sm s2-ib" data-s2="zi" aria-label="Acercar">+</button></div>
      <div class="s2-grp hide-sm"><button class="btn ghost sm s2-ib" data-s2="prev" ${idx > 0 ? '' : 'disabled'} title="Guardar e ir al plano anterior" aria-label="Plano anterior">◀</button><button class="btn ghost sm s2-ib" data-s2="next" ${idx >= 0 && idx < list.length - 1 ? '' : 'disabled'} title="Guardar e ir al plano siguiente" aria-label="Plano siguiente">▶</button></div>
      <button class="btn ghost sm s2-ib" data-s2="more" aria-label="Más opciones del plano" title="Más opciones">${ICO.more}</button>
      <button class="btn" data-s2="cancel" aria-label="Cancelar"><span class="s2-cl">Cancelar</span><span class="s2-x" aria-hidden="true">${ICO.close}</span></button><button class="btn primary" data-s2="save" ${E.ro ? 'disabled title="Solo lectura"' : ''}>Guardar</button>
    </header>
    <div class="s2-body">
      <nav class="s2-rail" role="toolbar" aria-label="Herramientas">${D2_TOOLS.map(([k, n, key]) => `<button data-tool="${k}" aria-pressed="${ea(E.tool === k)}" title="${n} (${ea(key)})" aria-label="${n}">${d2Ico(k)}</button>`).join('')}
        <span class="s2-cur" title="Color actual"><i style="--c:${ea(E.color)}"></i></span></nav>
      <div class="s2-stage" id="s2Stage" data-tool="${ea(E.tool)}"><canvas id="s2C" aria-label="Hoja de dibujo"></canvas><textarea class="s2-text" id="s2Tx" hidden spellcheck="false" aria-label="Texto"></textarea><div class="s2-load" id="s2Ld">Cargando dibujos…</div></div>
      <aside class="s2-insp" id="s2In"></aside>
    </div>
    <footer class="s2-fr" id="s2Fr"></footer>`;
  document.body.appendChild(ov);
  const $o = q => ov.querySelector(q);
  const C = $o('#s2C'), stage = $o('#s2Stage'), TX = $o('#s2Tx');
  let cx = C.getContext('2d'), DPR = 1;
  const mk = (w = DW, h = DH) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c._v = 0; return c; };
  const cloneC = c => { const n = mk(c.width, c.height); n.getContext('2d').drawImage(c, 0, 0); return n; };
  const TMP = mk(), tctx = TMP.getContext('2d'), TMP2 = mk(), SCR = mk(), sctx = SCR.getContext('2d');
  EDT = { saveNow: () => save(), redraw: () => req(), is2d: true };

  /* ---------- datos ---------- */
  const curF = () => d.frames[E.fi];
  const actL = () => d.layers.find(l => l.id === d.act) || d.layers[d.layers.length - 1];
  const rk = (L, F) => L.id + '~' + (L.shared ? 'all' : F.id);
  const ras = (L, F, make) => { const k = rk(L, F); let c = E.R.get(k); if (!c && make) { c = mk(); E.R.set(k, c); } return c; };
  const objsOf = (L, F) => d.objs[rk(L, F)] || [];
  const allObjs = F => d.layers.filter(l => l.vis).flatMap(L => objsOf(L, F).map(o => ({ o, L })));
  const findObj = oid => { for (const [k, arr] of Object.entries(d.objs)) { const o = arr.find(x => x.id === oid); if (o) return { o, k, arr }; } return null; };
  const touched = () => { E.dirty = true; E.ver++; ONION.clear(); thumbsSoon(); req(); };

  /* ---------- historial ---------- */
  function push(h) { E.hist.push(h); if (E.hist.length > 60) E.hist.shift(); E.redo = []; touched(); syncHist(); }
  function syncHist() { $o('[data-s2="undo"]').disabled = !E.hist.length && !E.float; $o('[data-s2="redo"]').disabled = !E.redo.length; }
  const putPx = (k, x, y, im) => { let c = E.R.get(k); if (!c) { c = mk(); E.R.set(k, c); } c.getContext('2d').putImageData(im, x, y); c._v++; };
  const putC = (k, src) => { let c = E.R.get(k); if (!c) { c = mk(); E.R.set(k, c); } const g = c.getContext('2d'); g.clearRect(0, 0, DW, DH); g.drawImage(src, 0, 0); c._v++; };
  const snap = () => ({ d: JSON.stringify({ ...d, _imp: undefined }), R: new Map(E.R), fi: E.fi });
  function restore(st) { const nd = JSON.parse(st.d); for (const k of Object.keys(d)) delete d[k]; Object.assign(d, nd); E.R = new Map(st.R); E.fi = clamp(st.fi, 0, d.frames.length - 1); E.sel = null; }
  function structural(fn) { applyFloat(); commitText(); const a = snap(); fn(); d.layers = d2Layers(d); const b = snap(); push({ undo: () => restore(a), redo: () => restore(b) }); fullRefresh(); }
  function objEdit(before) { const after = JSON.stringify(d.objs); if (after === before) return; push({ undo: () => { d.objs = JSON.parse(before); }, redo: () => { d.objs = JSON.parse(after); } }); }
  function undo() {
    if (E.text) { commitText(); }
    if (E.float) { cancelFloat(); touched(); insp(); syncHist(); return; }
    const h = E.hist.pop(); if (!h) return; h.undo(); E.redo.push(h); afterHist();
  }
  function redo() { if (E.float) applyFloat(); const h = E.redo.pop(); if (!h) return; h.redo(); E.hist.push(h); afterHist(); }
  function afterHist() { E.sel = E.sel && findObj(E.sel) ? E.sel : null; touched(); fullRefresh(); }

  /* ---------- vista ---------- */
  let raf = 0;
  const req = () => { if (!raf) raf = requestAnimationFrame(draw); };
  function sizeStage() {
    const r = stage.getBoundingClientRect();
    DPR = Math.min(2, devicePixelRatio || 1);
    const ow = C._w || r.width, oh = C._h || r.height;
    C.width = Math.max(1, Math.round(r.width * DPR)); C.height = Math.max(1, Math.round(r.height * DPR));
    C.style.width = r.width + 'px'; C.style.height = r.height + 'px';
    if (!C._w) fit(); else { E.V.x += (r.width - ow) / 2; E.V.y += (r.height - oh) / 2; }
    C._w = r.width; C._h = r.height;
    cx = C.getContext('2d'); req();
  }
  function fit() {
    const r = stage.getBoundingClientRect(), m = r.width < 600 ? 14 : 36;
    const z = Math.max(.05, Math.min((r.width - m * 2) / DW, (r.height - m * 2) / DH));
    E.V = { z, x: (r.width - DW * z) / 2, y: (r.height - DH * z) / 2 };
    zoomLabel(); req();
  }
  function zoomAt(f, sx, sy) {
    const r = stage.getBoundingClientRect();
    if (sx == null) { sx = r.width / 2; sy = r.height / 2; }
    const z = clamp(E.V.z * f, .05, 12);
    E.V.x = sx - (sx - E.V.x) * z / E.V.z; E.V.y = sy - (sy - E.V.y) * z / E.V.z; E.V.z = z;
    zoomLabel(); placeText(); req();
  }
  const zoomLabel = () => { $o('#s2Z').textContent = Math.round(E.V.z * 100) + ' %'; };
  const toDoc = e => { const r = C.getBoundingClientRect(); return { x: (e.clientX - r.left - E.V.x) / E.V.z, y: (e.clientY - r.top - E.V.y) / E.V.z }; };

  /* ---------- composición ---------- */
  const ONION = new Map();
  function onionOf(F, col) {
    const key = F.id + col;
    if (ONION.has(key)) return ONION.get(key);
    const c = mk(), g = c.getContext('2d');
    for (const L of d.layers) {
      if (!L.vis || L.shared) continue;
      const r = ras(L, F); if (r) { g.globalAlpha = L.op; g.drawImage(r, 0, 0); g.globalAlpha = 1; }
      for (const o of objsOf(L, F)) d2DrawObj(g, o, L.op);
    }
    g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, DW, DH);
    ONION.set(key, c);
    return c;
  }
  function drawOnion(g, F) {
    const O = d.onion, i = d.frames.indexOf(F);
    for (const [dir, n, col] of [[-1, O.prev, '#E5484D'], [1, O.next, '#2F9E64']]) for (let k = n; k >= 1; k--) {
      const j = i + dir * k;
      if (j < 0 || j >= d.frames.length) continue;
      g.globalAlpha = O.op * (1 - (k - 1) / (n + .6)); g.drawImage(onionOf(d.frames[j], col), 0, 0); g.globalAlpha = 1;
    }
  }
  /* imagen del trazo en curso, con la textura de grafito en el lápiz */
  function strokeImg(st) {
    if (st.tool !== 'pencil') return TMP;
    const g = TMP2.getContext('2d');
    g.globalCompositeOperation = 'copy'; g.drawImage(TMP, 0, 0);
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = d2Grain(g); g.fillRect(0, 0, DW, DH);
    g.globalCompositeOperation = 'source-over';
    return TMP2;
  }
  function liveLayer(c) {
    sctx.globalCompositeOperation = 'copy';
    if (c) sctx.drawImage(c, 0, 0); else sctx.clearRect(0, 0, DW, DH);
    sctx.globalCompositeOperation = 'source-over';
    const st = E.stroke;
    if (st) { sctx.save(); if (st.mask) sctx.clip(st.mask); sctx.globalAlpha = st.T.op; if (st.tool === 'eraser') sctx.globalCompositeOperation = 'destination-out'; sctx.drawImage(strokeImg(st), 0, 0); sctx.restore(); }
    return SCR;
  }
  function drawFloat(g, f) { g.save(); g.translate(f.cx, f.cy); g.rotate(f.rot); g.scale(f.sx, f.sy); g.imageSmoothingQuality = 'high'; g.drawImage(f.c, -f.w / 2, -f.h / 2); g.restore(); }
  /* un cuadro completo: papel, las fotos de fondo, la Viñeta 3D (capa de la escena) y encima las demás capas con su
     opacidad y sus flechas y textos */
  function compose(g, F, o = {}) {
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, DW, DH);
    const lays = d2Layers(d), nb = lays.filter(d2Back).length;
    let onion = o.onion, did3 = false;
    const v3 = () => { did3 = true; if (d.base !== '3d') return; const bg = bgOf(F, plateOf(F)); if (bg) { g.globalAlpha = d.baseOp ?? .45; g.drawImage(bg, 0, 0, DW, DH); g.globalAlpha = 1; } };
    lays.forEach((L, i) => {
      if (i === nb) v3();
      if (!L.vis) return;
      if (onion && !L.shared) { drawOnion(g, F); onion = false; }
      const live = o.live && L.id === d.act && F === curF();
      let src = ras(L, F);
      if (live && E.stroke) src = liveLayer(src);
      if (src) { g.globalAlpha = L.op; g.drawImage(src, 0, 0); g.globalAlpha = 1; }
      if (live && E.float && E.float.k === rk(L, F)) { g.globalAlpha = L.op; drawFloat(g, E.float); g.globalAlpha = 1; }
      for (const ob of objsOf(L, F)) if (!(o.live && E.text && E.text.id === ob.id)) d2DrawObj(g, ob, L.op);
    });
    if (!did3) v3();
    if (onion) drawOnion(g, F);
  }
  /* ¿hay una foto detrás de las figuras en el cuadro F? (entonces la escena 3D va sin su entorno) */
  const plateOf = F => d.layers.some(L => d2Back(L) && L.vis && L.op > 0 && (ras(L, F) || (E.float && E.float.k === rk(L, F))));
  /* el segundo del plano en que empieza el cuadro F (para ver la escena 3D en ese momento) */
  const fStart = F => { let n = 0; for (const f of d.frames) { if (f === F) break; n += f.hold || 1; } return Math.max(0, n / (d.fps || 12) - (d.t0 || 0)); };
  function draw() {
    raf = 0;
    const g = cx, z = E.V.z;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, C.width, C.height);
    g.setTransform(DPR * z, 0, 0, DPR * z, DPR * E.V.x, DPR * E.V.y);
    g.save(); g.shadowColor = 'rgba(0,0,0,.22)'; g.shadowBlur = 18 * DPR; g.shadowOffsetY = 3 * DPR; g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, DW, DH); g.restore();
    g.save(); g.beginPath(); g.rect(0, 0, DW, DH); g.clip();
    compose(g, curF(), { live: true, onion: d.onion.on && !E.playing && d.frames.length > 1 });
    if (!E.playing) drawGuides(g);
    g.restore();
    if (!E.playing) overlay(g);
  }

  /* ---------- guías de perspectiva ---------- */
  function defaultVP(type, spread) {
    const hy = DH * .42, sp = (spread ?? .45) * DW;
    if (type === '1p') return [{ x: DW / 2, y: hy }];
    const v = [{ x: DW / 2 - sp, y: hy }, { x: DW / 2 + sp, y: hy }];
    if (type === '3p') v.push({ x: DW / 2, y: DH * 2.1 });
    return v;
  }
  function drawGuides(g) {
    const G = d.guides;
    if (G.type === 'none' || !G.vp) return;
    const act = E.tool === 'persp';
    if (G.show === false) return;   // ocultas: la perspectiva se conserva (y el ajuste de trazos sigue si está activo)
    const z = E.V.z;
    g.save();
    g.lineWidth = 1 / z; g.strokeStyle = act ? 'rgba(46,143,191,.6)' : 'rgba(46,143,191,.32)';
    const R = Math.hypot(DW, DH) * 3;
    g.beginPath();
    G.vp.forEach((v, i) => {
      const n = i === 2 ? 22 : 30;
      for (let k = 0; k < n; k++) { const a = Math.PI * 2 * k / n + (i === 2 ? 0 : Math.PI / n); g.moveTo(v.x, v.y); g.lineTo(v.x + Math.cos(a) * R, v.y + Math.sin(a) * R); }
    });
    if (G.type === '1p') { for (let y = 0; y <= DH; y += DH / 8) { g.moveTo(0, y); g.lineTo(DW, y); } for (let x = 0; x <= DW; x += DW / 10) { g.moveTo(x, 0); g.lineTo(x, DH); } }
    if (G.type === '2p') for (let x = 0; x <= DW; x += DW / 12) { g.moveTo(x, 0); g.lineTo(x, DH); }
    g.stroke();
    g.lineWidth = 2 / z; g.strokeStyle = act ? 'rgba(46,143,191,.9)' : 'rgba(46,143,191,.5)';
    g.beginPath(); g.moveTo(-DW, G.vp[0].y); g.lineTo(DW * 2, G.vp[0].y); g.stroke();
    g.restore();
  }

  /* ---------- capa de controles ---------- */
  const HS = () => 7 / E.V.z;
  function handle(g, p, kind = 'sq') {
    const r = HS();
    g.beginPath();
    if (kind === 'ci') g.arc(p.x, p.y, r * 1.05, 0, Math.PI * 2); else g.rect(p.x - r * .85, p.y - r * .85, r * 1.7, r * 1.7);
    g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 1.6 / E.V.z; g.strokeStyle = '#2E8FBF'; g.stroke();
  }
  function floatCorners(f) {
    const c = Math.cos(f.rot), s = Math.sin(f.rot), hw = f.w / 2 * f.sx, hh = f.h / 2 * f.sy;
    const T = (x, y) => ({ x: f.cx + x * c - y * s, y: f.cy + x * s + y * c });
    const D0 = Math.abs(hh), D1 = D0 + 30 / E.V.z;
    return { T, pts: [T(-hw, -hh), T(hw, -hh), T(hw, hh), T(-hw, hh)], mids: [T(0, -hh), T(hw, 0), T(0, hh), T(-hw, 0)], top: { x: f.cx + s * D0, y: f.cy - c * D0 }, rot: { x: f.cx + s * D1, y: f.cy - c * D1 } };
  }
  /* lo que se ve de la hoja (en unidades de la hoja), con un margen: un punto de fuga fuera de ahí se muestra en el borde */
  function vpView() { const z = E.V.z, m = 22 / z; return { x0: -E.V.x / z + m, y0: -E.V.y / z + m, x1: (C.clientWidth - E.V.x) / z - m, y1: (C.clientHeight - E.V.y) / z - m }; }
  function vpShown(v) { const r = vpView(); const x = clamp(v.x, r.x0, Math.max(r.x0, r.x1)), y = clamp(v.y, r.y0, Math.max(r.y0, r.y1)); return { x, y, out: x !== v.x || y !== v.y }; }
  function overlay(g) {
    const z = E.V.z;
    // guías: puntos de fuga movibles (los que quedan fuera, como una marca en el borde que apunta hacia ellos)
    if (E.tool === 'persp' && d.guides.type !== 'none' && d.guides.vp && d.guides.show !== false) d.guides.vp.forEach((v, i) => {
      const s = vpShown(v);
      g.save(); g.font = `700 ${11 / z}px ${D2_FONT()}`;
      if (!s.out) { g.restore(); handle(g, v, 'ci'); g.save(); g.font = `700 ${11 / z}px ${D2_FONT()}`; g.fillStyle = '#2E8FBF'; g.fillText('PF' + (i + 1), v.x + 10 / z, v.y - 10 / z); g.restore(); return; }
      const a = Math.atan2(v.y - s.y, v.x - s.x), r = 11 / z;
      g.fillStyle = '#2E8FBF'; g.beginPath(); g.arc(s.x, s.y, r, 0, Math.PI * 2); g.fill();
      g.translate(s.x, s.y); g.rotate(a); g.beginPath(); g.moveTo(r * 1.9, 0); g.lineTo(r * .9, -r * .7); g.lineTo(r * .9, r * .7); g.closePath(); g.fill(); g.rotate(-a);
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${9 / z}px ${D2_FONT()}`; g.fillText(String(i + 1), 0, .5 / z);
      g.restore();
    });
    // lazo en curso
    if (E.lasso && E.lasso.length > 1) {
      g.save(); g.lineWidth = 1.5 / z; g.beginPath(); E.lasso.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
      g.strokeStyle = '#FFFFFF'; g.stroke(); g.setLineDash([5 / z, 4 / z]); g.strokeStyle = '#16171B'; g.stroke(); g.restore();
    }
    // máscara activa: borde punteado y lo de afuera en sombra (fuera de ella no se pinta)
    if (E.mask && !E.float && E.mask.length > 2) {
      g.save(); g.lineWidth = 1.4 / z; const mp = maskPath(E.mask);
      const out = new Path2D(); out.rect(0, 0, DW, DH); out.addPath(mp);
      g.fillStyle = 'rgba(22,23,27,.24)'; g.fill(out, 'evenodd');
      g.strokeStyle = '#FFFFFF'; g.stroke(mp); g.setLineDash([6 / z, 4 / z]); g.strokeStyle = '#2E8FBF'; g.stroke(mp); g.restore();
    }
    // selección flotante
    if (E.float) {
      const f = E.float, k = floatCorners(f);
      g.save(); g.lineWidth = 1.4 / z; g.beginPath(); k.pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath();
      g.strokeStyle = '#FFFFFF'; g.stroke(); g.setLineDash([5 / z, 4 / z]); g.strokeStyle = '#2E8FBF'; g.stroke(); g.setLineDash([]);
      g.beginPath(); g.moveTo(k.top.x, k.top.y); g.lineTo(k.rot.x, k.rot.y); g.strokeStyle = '#2E8FBF'; g.stroke();
      k.pts.forEach(p => handle(g, p)); k.mids.forEach(p => handle(g, p)); handle(g, k.rot, 'ci');
      g.restore();
    }
    // objeto elegido
    const so = E.sel && findObj(E.sel);
    if (so && !E.text) {
      const o = so.o;
      g.save(); g.lineWidth = 1.4 / z; g.strokeStyle = '#2E8FBF'; g.setLineDash([4 / z, 3 / z]);
      if (o.type === 'arrow') {
        const [c1, c2] = d2Ctrl(o);
        g.beginPath(); g.moveTo(o.p0.x, o.p0.y); g.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, o.p1.x, o.p1.y); g.stroke(); g.setLineDash([]);
        handle(g, o.p0, 'ci'); handle(g, o.p1, 'ci'); handle(g, o.h1); handle(g, o.h2);
      } else { const b = d2TextBox(o); g.strokeRect(b.x, b.y, b.w, b.h); g.setLineDash([]); handle(g, { x: b.x + b.w, y: b.y + b.h }); }
      g.restore();
    }
    // Alt + clic derecho: el pincel con su tamaño y opacidad mientras se ajusta
    if (E.bsz && D2_BRUSH.has(E.tool)) {
      const T = E.T[E.tool], c = E.bsz.p, r = Math.max(T.size / 2, 1.5 / z);
      g.save();
      g.globalAlpha = E.tool === 'eraser' ? .25 : T.op; g.fillStyle = E.tool === 'eraser' ? '#8C9099' : E.color; g.beginPath(); g.arc(c.x, c.y, r, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1; g.lineWidth = 1 / z; g.strokeStyle = 'rgba(255,255,255,.95)'; g.stroke(); g.beginPath(); g.arc(c.x, c.y, r + 1 / z, 0, Math.PI * 2); g.strokeStyle = 'rgba(0,0,0,.55)'; g.stroke();
      const txt = `${T.size} px · ${Math.round(T.op * 100)} %`;
      g.font = `700 ${12 / z}px ${D2_FONT()}`; const tw = g.measureText(txt).width, px = 7 / z, ty = c.y + r + 10 / z;
      g.fillStyle = 'rgba(22,23,27,.88)'; g.fillRect(c.x - tw / 2 - px, ty, tw + px * 2, 22 / z);
      g.fillStyle = '#FFFFFF'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(txt, c.x, ty + 11 / z);
      g.restore();
    }
    // cursor del pincel
    if (E.hover && D2_BRUSH.has(E.tool) && !E.drag && !E.alt) {
      const r = E.T[E.tool].size / 2;
      g.save(); g.lineWidth = 1 / z; g.beginPath(); g.arc(E.hover.x, E.hover.y, Math.max(r, 1.5 / z), 0, Math.PI * 2);
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke(); g.beginPath(); g.arc(E.hover.x, E.hover.y, Math.max(r, 1.5 / z) + 1 / z, 0, Math.PI * 2); g.strokeStyle = 'rgba(0,0,0,.55)'; g.stroke(); g.restore();
    }
  }

  /* ---------- trazos ---------- */
  let DAB = null, DABc = '';
  function dab() {
    if (DAB && DABc === E.color) return DAB;
    DAB = mk(128, 128); DABc = E.color;
    const g = DAB.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    const [r, gg, b] = hexRGB(E.color);
    gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(.45, `rgba(${r},${gg},${b},.55)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return DAB;
  }
  const hexRGB = h => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(h || '') || [0, '16', '17', '1b']; return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]; };
  const prOf = e => e.pointerType === 'pen' ? clamp(e.pressure || .5, .02, 1) : 1;
  function widthOf(st, pr) {
    const s = st.T.size;
    if (!st.pen) return s;
    if (st.tool === 'ink') return s * (.12 + .88 * Math.pow(pr, 1.15));
    if (st.tool === 'pencil') return s * (.45 + .55 * pr);
    return s * (.3 + .7 * pr);
  }
  function grow(st, x, y, w) { const b = st.bb, r = w / 2 + 2; b[0] = Math.min(b[0], x - r); b[1] = Math.min(b[1], y - r); b[2] = Math.max(b[2], x + r); b[3] = Math.max(b[3], y + r); }
  function seg(st, a, b, w, pr) {
    const g = tctx;
    if (st.tool === 'brush') {
      const dist = Math.hypot(b.x - a.x, b.y - a.y), step = Math.max(.8, w * .1);
      let t = st.carry || 0;
      const D = dab();
      g.globalAlpha = .1 + .14 * pr;
      if (dist === 0 && !st.started) { g.drawImage(D, a.x - w / 2, a.y - w / 2, w, w); st.started = true; }
      for (; t <= dist; t += step) { const f = dist ? t / dist : 0; g.drawImage(D, a.x + (b.x - a.x) * f - w / 2, a.y + (b.y - a.y) * f - w / 2, w, w); }
      st.carry = t - dist; g.globalAlpha = 1;
    } else {
      g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = st.tool === 'eraser' ? '#000' : E.color; g.lineWidth = w;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x + (a.x === b.x && a.y === b.y ? .01 : 0), b.y); g.stroke();
    }
    grow(st, a.x, a.y, w); grow(st, b.x, b.y, w);
  }
  function snapDirs(p0) {
    const G = d.guides, out = [];
    for (const v of G.vp || []) { const dx = v.x - p0.x, dy = v.y - p0.y, l = Math.hypot(dx, dy); if (l > 1) out.push([dx / l, dy / l]); }
    if (G.type === '1p') out.push([1, 0], [0, 1]);
    if (G.type === '2p') out.push([0, 1]);
    return out;
  }
  const lockedMsg = L => toast(`La capa «${L.name}» está bloqueada. Toca su candado para desbloquearla.`);
  function strokeStart(e, p) {
    const L = actL();
    if (e.altKey && E.tool !== 'eraser') { pickColor(p); return false; }
    if (!L.vis) { toast(`La capa «${L.name}» está oculta. Muéstrala para dibujar en ella.`); return false; }
    if (L.lock) { lockedMsg(L); return false; }
    applyFloat(); commitText(); E.sel = null;
    tctx.clearRect(0, 0, DW, DH);
    const pr = prOf(e);
    const st = E.stroke = { tool: E.tool, T: E.T[E.tool], pen: e.pointerType === 'pen', p0: p, last: p, sm: { ...p }, bb: [p.x, p.y, p.x, p.y], pr, line: e.shiftKey, dir: null, mask: E.mask ? maskPath(E.mask) : null };
    seg(st, p, p, widthOf(st, pr), pr);
    req();
    return true;
  }
  function strokeMove(e, pts) {
    const st = E.stroke;
    const G = d.guides, snapOn = G.snap && G.type !== 'none' && G.vp;
    st.line = st.line || e.shiftKey;
    const p = pts[pts.length - 1], pr = prOf(e);
    if (st.line || snapOn) {
      let q = p;
      if (snapOn && !(e.shiftKey && !st.dir)) {
        if (!st.dir && Math.hypot(p.x - st.p0.x, p.y - st.p0.y) > 10 / E.V.z) {
          const dx = p.x - st.p0.x, dy = p.y - st.p0.y, l = Math.hypot(dx, dy);
          let best = null, bv = -1;
          for (const dd of snapDirs(st.p0)) { const v = Math.abs((dx * dd[0] + dy * dd[1]) / l); if (v > bv) { bv = v; best = dd; } }
          st.dir = best;
        }
        if (st.dir) { const k = (p.x - st.p0.x) * st.dir[0] + (p.y - st.p0.y) * st.dir[1]; q = { x: st.p0.x + st.dir[0] * k, y: st.p0.y + st.dir[1] * k }; }
        else if (!st.line) { return; }
      }
      tctx.clearRect(0, 0, DW, DH); st.carry = 0; st.started = false; st.bb = [st.p0.x, st.p0.y, st.p0.x, st.p0.y];
      seg(st, st.p0, q, widthOf(st, pr), pr); st.last = q; st.pr = pr; req(); return;
    }
    const k = 1 - clamp(st.T.smooth ?? 30, 0, 95) / 100 * .88;
    for (const q of pts) {
      st.sm.x += (q.x - st.sm.x) * k; st.sm.y += (q.y - st.sm.y) * k;
      const n = { x: st.sm.x, y: st.sm.y };
      if (Math.hypot(n.x - st.last.x, n.y - st.last.y) < .35) continue;
      const w = widthOf(st, (st.pr + pr) / 2);
      seg(st, st.last, n, w, pr); st.last = n; st.pr = pr;
    }
    req();
  }
  function strokeEnd(e, p) {
    const st = E.stroke;
    if (!st) return;
    if (!st.line && !st.dir && p && Math.hypot(p.x - st.last.x, p.y - st.last.y) > .5) seg(st, st.last, p, widthOf(st, st.pr), st.pr);
    E.stroke = null;
    const L = actL(), F = curF(), k = rk(L, F), c = ras(L, F, true), g = c.getContext('2d');
    const x0 = clamp(Math.floor(st.bb[0]), 0, DW), y0 = clamp(Math.floor(st.bb[1]), 0, DH), x1 = clamp(Math.ceil(st.bb[2]), 0, DW), y1 = clamp(Math.ceil(st.bb[3]), 0, DH);
    if (x1 - x0 < 1 || y1 - y0 < 1) { req(); return; }
    const before = g.getImageData(x0, y0, x1 - x0, y1 - y0);
    g.save(); if (st.mask) g.clip(st.mask); g.globalAlpha = st.T.op; if (st.tool === 'eraser') g.globalCompositeOperation = 'destination-out'; g.drawImage(strokeImg(st), 0, 0); g.restore();
    const after = g.getImageData(x0, y0, x1 - x0, y1 - y0);
    c._v++;
    push({ undo: () => putPx(k, x0, y0, before), redo: () => putPx(k, x0, y0, after) });
    if (st.tool !== 'eraser') useColor(E.color);
  }
  function pickColor(p) {
    const c = mk(1, 1), g = c.getContext('2d');
    g.translate(-Math.floor(p.x), -Math.floor(p.y)); compose(g, curF());
    const [r, gg, b] = g.getImageData(0, 0, 1, 1).data;
    setColor('#' + [r, gg, b].map(v => v.toString(16).padStart(2, '0')).join(''));
  }

  /* ---------- lazo y selección flotante ----------
     La selección también es una máscara: mientras está activa, lápices, pinceles y borrador pintan solo dentro.
     Esc, Ctrl + D o un toque fuera con el lazo la quitan. */
  function maskPts() {
    const f = E.float;
    if (!f) return E.mask;
    if (!f.path0) return null;
    const c = Math.cos(f.rot), s = Math.sin(f.rot);
    return f.path0.map(p => { const x = (p.x - f.ox) * f.sx, y = (p.y - f.oy) * f.sy; return { x: f.cx + x * c - y * s, y: f.cy + x * s + y * c }; });
  }
  const maskPath = pts => { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)); p.closePath(); return p; };
  function clearMask() { if (!E.mask && !E.float) return false; applyFloat(); E.mask = null; insp(); req(); return true; }
  function floatFrom(path, rect) {
    applyFloat(); commitText();
    const L = actL(), F = curF();
    if (!L.vis) { toast(`La capa «${L.name}» está oculta.`); return; }
    if (L.lock) { lockedMsg(L); return; }
    const k = rk(L, F), c = ras(L, F, true);
    let x0, y0, x1, y1;
    if (rect) [x0, y0, x1, y1] = rect;
    else { x0 = Math.min(...path.map(p => p.x)); y0 = Math.min(...path.map(p => p.y)); x1 = Math.max(...path.map(p => p.x)); y1 = Math.max(...path.map(p => p.y)); }
    x0 = clamp(Math.floor(x0), 0, DW); y0 = clamp(Math.floor(y0), 0, DH); x1 = clamp(Math.ceil(x1), 0, DW); y1 = clamp(Math.ceil(y1), 0, DH);
    const w = x1 - x0, h = y1 - y0;
    if (w < 2 || h < 2) return;
    const fc = mk(w, h), fg = fc.getContext('2d');
    fg.save(); fg.translate(-x0, -y0);
    if (path) { fg.beginPath(); path.forEach((p, i) => i ? fg.lineTo(p.x, p.y) : fg.moveTo(p.x, p.y)); fg.closePath(); fg.clip(); }
    fg.drawImage(c, 0, 0); fg.restore();
    const px = fg.getImageData(0, 0, w, h).data;
    let any = false; for (let i = 3; i < px.length; i += 16) if (px[i]) { any = true; break; }
    const shape = path ? path.map(p => ({ ...p })) : [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
    if (!any) { E.mask = shape; insp(); req(); return; }   // zona vacía: queda solo la máscara para pintar dentro
    const before = cloneC(c), g = c.getContext('2d');
    g.save(); g.beginPath();
    if (path) { path.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); } else g.rect(x0, y0, w, h);
    g.clip(); g.clearRect(x0, y0, w, h); g.restore(); c._v++;
    E.mask = null;
    E.float = { c: fc, k, before, cx: x0 + w / 2, cy: y0 + h / 2, w, h, sx: 1, sy: 1, rot: 0, path0: shape, ox: x0 + w / 2, oy: y0 + h / 2 };
    insp(); syncHist(); req();
  }
  function contentBox(c) {
    const W = c.width, H = c.height, px = c.getContext('2d').getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
  }
  function selectAll() {
    if (E.float) applyFloat();
    const c = ras(actL(), curF());
    const b = c && contentBox(c);
    if (!b) { toast(`La capa «${actL().name}» está vacía en este cuadro.`); return; }
    setTool('lasso', true); floatFrom(null, b);
  }
  function applyFloat() {
    const f = E.float;
    if (!f) return;
    const m = maskPts();
    E.float = null; E.mask = m;
    let c = E.R.get(f.k); if (!c) { c = mk(); E.R.set(f.k, c); }
    drawFloat(c.getContext('2d'), f); c._v++;
    const after = cloneC(c);
    push({ undo: () => putC(f.k, f.before), redo: () => putC(f.k, after) });
    insp();
  }
  function cancelFloat() { const f = E.float; if (!f) return; E.float = null; E.mask = null; putC(f.k, f.before); insp(); req(); }
  function dropFloat() {
    const f = E.float; if (!f) return; const m = maskPts(); E.float = null; E.mask = m;
    const c = E.R.get(f.k), after = cloneC(c);
    push({ undo: () => putC(f.k, f.before), redo: () => putC(f.k, after) });
    insp();
  }
  function stampFloat() { const f = E.float; if (!f) return; const c = E.R.get(f.k); drawFloat(c.getContext('2d'), f); c._v++; touched(); f.cx += 24; f.cy += 24; req(); }
  function floatHit(p) {
    const f = E.float, k = floatCorners(f), r = HS() * 1.5;
    const near = q => Math.hypot(p.x - q.x, p.y - q.y) <= r;
    if (near(k.rot)) return { kind: 'rot' };
    for (let i = 0; i < 4; i++) if (near(k.pts[i])) return { kind: 'corner', i };
    for (let i = 0; i < 4; i++) if (near(k.mids[i])) return { kind: 'edge', i };
    const c = Math.cos(-f.rot), s = Math.sin(-f.rot), dx = p.x - f.cx, dy = p.y - f.cy;
    const lx = dx * c - dy * s, ly = dx * s + dy * c;
    if (Math.abs(lx) <= Math.abs(f.w * f.sx) / 2 && Math.abs(ly) <= Math.abs(f.h * f.sy) / 2) return { kind: 'move' };
    return null;
  }
  function floatDrag(h, p0) {
    const f = E.float, s0 = { ...f }, k0 = floatCorners(f);
    const sgn = [[-1, -1], [1, -1], [1, 1], [-1, 1]], em = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    return (p, e) => {
      if (h.kind === 'move') { f.cx = s0.cx + p.x - p0.x; f.cy = s0.cy + p.y - p0.y; }
      else if (h.kind === 'rot') {
        let a = Math.atan2(p.y - f.cy, p.x - f.cx) + Math.PI / 2;
        if (e.shiftKey) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12);
        f.rot = a;
      } else {
        const corner = h.kind === 'corner';
        const dir = corner ? sgn[h.i] : em[h.i];
        const anchor = corner ? k0.pts[(h.i + 2) % 4] : k0.mids[(h.i + 2) % 4];
        const c = Math.cos(-s0.rot), s = Math.sin(-s0.rot), dx = p.x - anchor.x, dy = p.y - anchor.y;
        let vx = dx * c - dy * s, vy = dx * s + dy * c;
        const fx = Math.sign(s0.sx) * dir[0], fy = Math.sign(s0.sy) * dir[1];
        let W = s0.w * Math.abs(s0.sx), H = s0.h * Math.abs(s0.sy);
        if (dir[0]) W = Math.max(4, vx * fx); if (dir[1]) H = Math.max(4, vy * fy);
        if (corner && !e.shiftKey) { const k = Math.max(W / (s0.w * Math.abs(s0.sx)), H / (s0.h * Math.abs(s0.sy))); W = s0.w * Math.abs(s0.sx) * k; H = s0.h * Math.abs(s0.sy) * k; }
        f.sx = Math.sign(s0.sx) * W / s0.w; f.sy = Math.sign(s0.sy) * H / s0.h;
        const ox = dir[0] ? fx * W / 2 : 0, oy = dir[1] ? fy * H / 2 : 0;
        const cc = Math.cos(s0.rot), ss = Math.sin(s0.rot);
        f.cx = anchor.x + ox * cc - oy * ss; f.cy = anchor.y + ox * ss + oy * cc;
      }
      req();
    };
  }

  /* ---------- flechas y textos ---------- */
  function hitObj(p) {
    const F = curF(), list = allObjs(F).reverse();
    for (const { o, L } of list) {
      if (L.lock) continue;   // lo de una capa bloqueada no se toma
      if (o.type === 'arrow') { const poly = d2ArrowPoly(o); if (poly && D2_HIT().isPointInPath(d2PathOf(poly), p.x, p.y)) return o; }
      else { const b = d2TextBox(o); if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return o; }
    }
    return null;
  }
  let HITC = null; const D2_HIT = () => HITC || (HITC = document.createElement('canvas').getContext('2d'));
  function objHandle(o, p) {
    const r = HS() * 1.6, near = q => Math.hypot(p.x - q.x, p.y - q.y) <= r;
    if (o.type === 'arrow') { if (near(o.p1)) return 'p1'; if (near(o.p0)) return 'p0'; if (near(o.h2)) return 'h2'; if (near(o.h1)) return 'h1'; }
    else { const b = d2TextBox(o); if (near({ x: b.x + b.w, y: b.y + b.h })) return 'size'; }
    return null;
  }
  function objDrag(o, h, p0) {
    const s0 = JSON.parse(JSON.stringify(o));
    return (p, e) => {
      const dx = p.x - p0.x, dy = p.y - p0.y;
      if (o.type === 'arrow') {
        if (h === 'p0' || h === 'p1') {
          // al estirar, los dobleces acompañan: giro y escala alrededor del otro extremo
          o[h] = { x: s0[h].x + dx, y: s0[h].y + dy };
          const fix = h === 'p0' ? s0.p1 : s0.p0, a = { x: s0[h].x - fix.x, y: s0[h].y - fix.y }, b = { x: o[h].x - fix.x, y: o[h].y - fix.y };
          const la = a.x * a.x + a.y * a.y || 1, cr = (a.x * b.x + a.y * b.y) / la, sr = (a.x * b.y - a.y * b.x) / la;
          for (const k of ['h1', 'h2']) { const v = { x: s0[k].x - fix.x, y: s0[k].y - fix.y }; o[k] = { x: fix.x + v.x * cr - v.y * sr, y: fix.y + v.x * sr + v.y * cr }; }
        } else if (h === 'h1' || h === 'h2') {
          o[h] = { x: s0[h].x + dx, y: s0[h].y + dy };
          if (e.shiftKey) { const k = h === 'h1' ? 'h2' : 'h1'; o[k] = { x: s0[k].x + dx, y: s0[k].y + dy }; }   // Mayúsculas: arco parejo
        }
        else for (const k of ['p0', 'p1', 'h1', 'h2']) o[k] = { x: s0[k].x + dx, y: s0[k].y + dy };
      } else if (h === 'size') { const b = d2TextBox(s0); o.size = clamp(Math.round(s0.size * Math.max(.15, (b.w + dx) / b.w)), 8, 400); }
      else { o.x = s0.x + dx; o.y = s0.y + dy; }
      req();
    };
  }
  function newObj(o) {
    const L = actL(), k = rk(L, curF());
    (d.objs[k] = d.objs[k] || []).push(o);
    return o;
  }
  function delObj(oid) { const f = findObj(oid); if (!f) return; f.arr.splice(f.arr.indexOf(f.o), 1); if (!f.arr.length) delete d.objs[f.k]; }
  /* texto: se escribe en un cuadro encima de la hoja */
  function editText(o, before) {
    E.text = o; E.textBefore = before ?? JSON.stringify(d.objs); E.sel = o.id;
    TX.hidden = false; TX.value = o.text || '';
    placeText(); setTimeout(() => { TX.focus(); TX.select(); }, 0); insp(); req();
  }
  function placeText() {
    const o = E.text; if (!o) return;
    const z = E.V.z;
    Object.assign(TX.style, { left: (E.V.x + o.x * z) + 'px', top: (E.V.y + o.y * z) + 'px', fontSize: o.size * z + 'px', fontWeight: o.bold ? 750 : 500, color: o.color, lineHeight: 1.18 });
    fitTX();
  }
  function fitTX() { TX.style.width = '10px'; TX.style.height = '10px'; TX.style.width = Math.max(40, TX.scrollWidth + 12) + 'px'; TX.style.height = TX.scrollHeight + 'px'; }
  function commitText() {
    const o = E.text; if (!o) return;
    E.text = null; TX.hidden = true; TX.blur();
    o.text = TX.value.replace(/\s+$/, '');
    if (!o.text.trim()) { delObj(o.id); E.sel = null; }
    objEdit(E.textBefore);
    insp(); req();
  }
  TX.addEventListener('input', () => { if (E.text) { E.text.text = TX.value; fitTX(); } });
  TX.addEventListener('blur', () => setTimeout(() => { if (E.text && document.activeElement !== TX) commitText(); }, 0));
  TX.addEventListener('keydown', e => { if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); e.stopPropagation(); commitText(); } });

  /* ---------- puntero ---------- */
  const PTR = new Map();
  let pinch = null;
  C.addEventListener('pointerdown', e => {
    if (E.ro) return;
    if (E.playing) stopPlay();
    try { C.setPointerCapture(e.pointerId); } catch (er) { }
    PTR.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.pointerType });
    if (PTR.size === 2 && [...PTR.values()].every(q => q.t === 'touch')) {
      if (E.stroke) { E.stroke = null; tctx.clearRect(0, 0, DW, DH); }
      E.drag = null; E.lasso = null;
      const [a, b] = [...PTR.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, V: { ...E.V } };
      req(); return;
    }
    if (PTR.size > 1) return;
    e.preventDefault();
    const p = toDoc(e);
    if (e.button === 1 || E.space || E.tool === 'hand') { E.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, V: { ...E.V } }; stage.classList.add('panning'); return; }
    // Alt + clic derecho y arrastrar: a los lados el tamaño del pincel, arriba y abajo su opacidad
    if (e.button === 2) {
      if (e.altKey && D2_BRUSH.has(E.tool)) { const T = E.T[E.tool]; E.bsz = { p, sx: e.clientX, sy: e.clientY, size: T.size, op: T.op }; E.drag = { kind: 'bsz' }; stage.classList.add('sizing'); req(); }
      return;
    }
    const tool = E.tool;
    if (D2_BRUSH.has(tool)) { if (strokeStart(e, p)) E.drag = { kind: 'stroke' }; return; }
    if (tool === 'lasso') {
      if (E.float) { const h = floatHit(p); if (h) { E.drag = { kind: 'float', fn: floatDrag(h, p) }; return; } applyFloat(); }
      E.lasso = [p]; E.drag = { kind: 'lasso' }; return;
    }
    if (tool === 'persp') {
      const G = d.guides;
      if (G.type !== 'none' && G.vp) {
        const shown = G.vp.map(vpShown);
        const i = G.show === false ? -1 : shown.findIndex(v => Math.hypot(v.x - p.x, v.y - p.y) < HS() * 2.2);
        const before = JSON.stringify(G);
        // tomar la marca del borde trae el punto de fuga hasta donde se suelte
        if (i >= 0) { E.drag = { kind: 'vp', i, before, p0: p, v0: G.vp.map((v, j) => j === i && shown[j].out ? { x: shown[j].x, y: shown[j].y } : { ...v }) }; return; }
        if (Math.abs(p.y - G.vp[0].y) < HS() * 1.6) { E.drag = { kind: 'hz', before, p0: p, v0: G.vp.map(v => ({ ...v })) }; return; }
      }
      return;
    }
    // flechas, textos y mover
    const before = JSON.stringify(d.objs);
    const so = E.sel && findObj(E.sel);
    if (so && (tool === 'move' || tool === so.o.type)) { const h = objHandle(so.o, p); if (h) { E.drag = { kind: 'obj', before, fn: objDrag(so.o, h, p) }; return; } }
    const hit = (tool === 'move' || tool === 'arrow' || tool === 'text') ? hitObj(p) : null;
    if (hit && (tool === 'move' || hit.type === tool)) {
      commitText();
      E.sel = hit.id; insp();
      if (tool === 'text') { editText(hit); return; }
      E.drag = { kind: 'obj', before, fn: objDrag(hit, 'body', p) }; req(); return;
    }
    if (E.text) { commitText(); if (tool === 'text') return; }
    if ((tool === 'arrow' || tool === 'text') && actL().lock) { lockedMsg(actL()); return; }
    if (tool === 'arrow') {
      const A = E.T.arrow;
      const o = newObj({ id: uid('o'), type: 'arrow', p0: p, p1: { ...p }, h1: { ...p }, h2: { ...p }, w: A.w, head: A.head, tail: A.tail, outline: A.outline, op: A.op, double: A.double, color: E.color });
      E.sel = o.id; E.drag = { kind: 'newArrow', before, o, p0: p }; insp(); return;
    }
    if (tool === 'text') {
      if (!actL().vis) { toast(`La capa «${actL().name}» está oculta.`); return; }
      const T = E.T.text;
      const o = newObj({ id: uid('o'), type: 'text', x: p.x, y: p.y - T.size * .6, text: '', size: T.size, bold: T.bold, bg: T.bg, color: E.color, op: 1 });
      editText(o, before); return;
    }
    if (E.sel) { E.sel = null; insp(); req(); }
  });
  C.addEventListener('pointermove', e => {
    if (PTR.has(e.pointerId)) PTR.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.pointerType });
    if (pinch && PTR.size >= 2) {
      const [a, b] = [...PTR.values()], dd = Math.hypot(a.x - b.x, a.y - b.y), r = stage.getBoundingClientRect();
      const z = clamp(pinch.V.z * dd / pinch.d, .05, 12), cx0 = pinch.cx - r.left, cy0 = pinch.cy - r.top, ncx = (a.x + b.x) / 2 - r.left, ncy = (a.y + b.y) / 2 - r.top;
      E.V = { z, x: ncx - (cx0 - pinch.V.x) * z / pinch.V.z, y: ncy - (cy0 - pinch.V.y) * z / pinch.V.z };
      zoomLabel(); placeText(); req(); return;
    }
    const p = toDoc(e);
    if (e.pointerType !== 'touch') { if (E.alt !== e.altKey && !E.drag) setAlt(e.altKey); E.hover = p; if (!E.drag && D2_BRUSH.has(E.tool)) req(); }
    const dr = E.drag;
    if (!dr) { hoverCursor(p); return; }
    if (dr.kind === 'pan') { E.V.x = dr.V.x + e.clientX - dr.sx; E.V.y = dr.V.y + e.clientY - dr.sy; placeText(); req(); return; }
    if (dr.kind === 'bsz') {
      const B = E.bsz, T = E.T[E.tool], dx = e.clientX - B.sx, dy = e.clientY - B.sy;
      T.size = clamp(Math.round(B.size * Math.pow(2, dx / 110) + dx / 40), 1, D2_MAX[E.tool]);
      T.op = clamp(Math.round((B.op - dy / 220) * 100) / 100, .05, 1);
      req(); return;
    }
    if (dr.kind === 'stroke') { const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; strokeMove(e, (evs.length ? evs : [e]).map(toDoc)); return; }
    if (dr.kind === 'lasso') { const l = E.lasso[E.lasso.length - 1]; if (Math.hypot(l.x - p.x, l.y - p.y) > 2 / E.V.z) E.lasso.push(p); req(); return; }
    if (dr.kind === 'float' || dr.kind === 'obj') { dr.moved = true; dr.fn(p, e); return; }
    if (dr.kind === 'newArrow') { const o = dr.o; o.p1 = p; o.h1 = { x: o.p0.x + (p.x - o.p0.x) / 3, y: o.p0.y + (p.y - o.p0.y) / 3 }; o.h2 = { x: o.p0.x + (p.x - o.p0.x) * 2 / 3, y: o.p0.y + (p.y - o.p0.y) * 2 / 3 }; req(); return; }
    if (dr.kind === 'vp' || dr.kind === 'hz') {
      const G = d.guides, dy = p.y - dr.p0.y, dx = p.x - dr.p0.x;
      if (dr.kind === 'hz') G.vp.forEach((v, i) => { if (i < 2) v.y = dr.v0[i].y + dy; });
      else { const v = G.vp[dr.i]; v.x = dr.v0[dr.i].x + dx; v.y = dr.v0[dr.i].y + dy; if (dr.i < 2 && G.vp.length > 1) G.vp.forEach((w, j) => { if (j < 2) w.y = v.y; }); }
      req();
    }
  });
  const up = e => {
    PTR.delete(e.pointerId);
    if (pinch) { if (PTR.size < 2) pinch = null; return; }
    const dr = E.drag; E.drag = null; stage.classList.remove('panning');
    if (!dr) return;
    const p = toDoc(e);
    if (dr.kind === 'bsz') { E.bsz = null; stage.classList.remove('sizing'); saveTools(); insp(); req(); return; }
    if (dr.kind === 'stroke') strokeEnd(e, e.type === 'pointercancel' ? null : p);
    else if (dr.kind === 'lasso') { const path = E.lasso; E.lasso = null; if (path && path.length > 2) floatFrom(path); else if (E.mask) { E.mask = null; insp(); } req(); }
    else if (dr.kind === 'float') { E.dirty = true; req(); }
    else if (dr.kind === 'obj') { if (dr.moved) objEdit(dr.before); insp(); req(); }
    else if (dr.kind === 'newArrow') {
      const o = dr.o;
      if (Math.hypot(o.p1.x - o.p0.x, o.p1.y - o.p0.y) < 14 / E.V.z) { delObj(o.id); E.sel = null; toast('Arrastra para trazar la flecha. Luego tira de sus puntos cuadrados para doblarla.'); }
      else objEdit(dr.before);
      insp(); req();
    } else if (dr.kind === 'vp' || dr.kind === 'hz') { const a = dr.before, b = JSON.stringify(d.guides); if (a !== b) push({ undo: () => { d.guides = JSON.parse(a); }, redo: () => { d.guides = JSON.parse(b); } }); }
  };
  C.addEventListener('pointerup', up); C.addEventListener('pointercancel', up);
  C.addEventListener('contextmenu', e => e.preventDefault());   // el clic derecho es para Alt + arrastrar (tamaño y opacidad)
  C.addEventListener('pointerleave', () => { E.hover = null; req(); });
  C.addEventListener('dblclick', e => { if (E.tool === 'move' || E.tool === 'text') { const o = hitObj(toDoc(e)); if (o && o.type === 'text') editText(o); } });
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * .0022), e.clientX - r.left, e.clientY - r.top);
    else { E.V.x -= e.deltaX; E.V.y -= e.deltaY; placeText(); req(); }
  }, { passive: false });
  function hoverCursor(p) {
    let cur = '';
    if (E.tool === 'lasso' && E.float) { const h = floatHit(p); cur = !h ? 'crosshair' : h.kind === 'move' ? 'move' : h.kind === 'rot' ? 'grab' : 'nwse-resize'; }
    else if (E.tool === 'move' || E.tool === 'arrow' || E.tool === 'text') { const so = E.sel && findObj(E.sel); const h = so && objHandle(so.o, p); const o = h ? null : hitObj(p); cur = h ? (h === 'size' ? 'nwse-resize' : 'grab') : o && (E.tool === 'move' || o.type === E.tool) ? 'move' : ''; }
    else if (E.tool === 'persp' && d.guides.vp && d.guides.show !== false) cur = d.guides.vp.some(v => { const s = vpShown(v); return Math.hypot(s.x - p.x, s.y - p.y) < HS() * 2.2; }) ? 'grab' : Math.abs(p.y - d.guides.vp[0].y) < HS() * 1.6 ? 'ns-resize' : '';
    C.style.cursor = cur;
  }
  /* soltar o pegar una imagen la pone en una capa nueva */
  stage.addEventListener('dragover', e => { if ([...(e.dataTransfer.items || [])].some(i => i.kind === 'file')) { e.preventDefault(); stage.classList.add('drop'); } });
  stage.addEventListener('dragleave', () => stage.classList.remove('drop'));
  stage.addEventListener('drop', e => { e.preventDefault(); stage.classList.remove('drop'); const f = [...e.dataTransfer.files].find(f => /^image\//.test(f.type)); if (f) addImage(f); });
  const onPaste = e => { if (!$('#s2Modal') || E.text) return; const it = [...(e.clipboardData ? e.clipboardData.items : [])].find(i => /^image\//.test(i.type)); if (it) { e.preventDefault(); addImage(it.getAsFile()); } };
  document.addEventListener('paste', onPaste);

  /* ---------- imágenes de referencia ---------- */
  function addImage(file) {
    if (!file) return;
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const s = Math.min(DW / im.naturalWidth, DH / im.naturalHeight);
      const w = Math.max(2, Math.round(im.naturalWidth * Math.min(1.6, s * 1.6))), h = Math.max(2, Math.round(im.naturalHeight * Math.min(1.6, s * 1.6)));
      const fc = mk(w, h); fc.getContext('2d').drawImage(im, 0, 0, w, h);
      URL.revokeObjectURL(url);
      let L;
      // una foto nueva va detrás de las figuras (de fondo), arriba de las otras fotos de fondo; en Capas se pasa delante
      structural(() => {
        L = { id: uid('l'), name: (file.name || 'Imagen').replace(/\.[^.]+$/, '').slice(0, 40) || 'Imagen', kind: 'image', vis: true, op: .5, shared: true, back: true };
        d.layers.splice(d.layers.filter(d2Back).length, 0, L);
        d.act = L.id; E.v3sel = false;
      });
      const k = rk(L, curF()); if (!E.R.get(k)) E.R.set(k, mk());
      setTool('lasso', true);
      E.float = { c: fc, k, before: mk(), cx: DW / 2, cy: DH / 2, w, h, sx: s / Math.min(1.6, s * 1.6), sy: s / Math.min(1.6, s * 1.6), rot: 0 };
      insp(); syncHist(); req();
      toast('Imagen en una capa nueva al 50 %, detrás de las figuras. Muévela o escálala y pulsa Intro; en Capas cambias su opacidad o la pasas delante.', 5200);
    };
    im.onerror = () => { URL.revokeObjectURL(url); toast('No se pudo leer esa imagen. Prueba con un JPG o un PNG.'); };
    im.src = url;
  }
  const pickImage = () => { const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.onchange = () => addImage(fi.files[0]); fi.click(); };

  /* ---------- inspector ---------- */
  const rr = (label, key, val, min, max, step, out) => `<label class="rr"><span>${label}</span><input type="range" min="${ea(min)}" max="${ea(max)}" step="${ea(step)}" value="${ea(val)}" data-k="${ea(key)}" style="--p:${ea((val - min) / (max - min) * 100)}%"><output>${out}</output></label>`;
  const segH = (key, opts, cur) => `<div class="seg s2-seg">${opts.map(([v, n]) => `<button data-k="${ea(key)}" data-v="${ea(v)}" aria-pressed="${ea(String(cur) === String(v))}">${n}</button>`).join('')}</div>`;
  function toolHTML() {
    const t = E.tool, so = E.sel && findObj(E.sel), o = so && so.o;
    const name = (D2_TOOLS.find(x => x[0] === t) || [])[1] || '';
    let h = `<div class="s2-h"><b>${esc(name)}</b><span>${esc((D2_TOOLS.find(x => x[0] === t) || [])[2] || '')}</span></div>`;
    if (D2_BRUSH.has(t)) {
      const T = E.T[t];
      h += rr('Tamaño', 'size', T.size, 1, D2_MAX[t], 1, T.size + ' px') + rr(t === 'eraser' ? 'Fuerza' : 'Opacidad', 'op', T.op, .05, 1, .05, Math.round(T.op * 100) + ' %') + rr('Estabilizador', 'smooth', T.smooth, 0, 95, 5, T.smooth + ' %');
      h += `<p class="hint">${t === 'eraser' ? 'Borra en la capa activa.' : 'Mayúsculas traza una recta. Mantén Alt para tomar un color de la hoja.'} Alt + clic derecho y arrastrar: a los lados cambia el tamaño, arriba y abajo la ${t === 'eraser' ? 'fuerza' : 'opacidad'}.${d.guides.snap && d.guides.type !== 'none' ? ' Los trazos se ajustan a las guías de perspectiva.' : ''}</p>`;
      if (E.mask || E.float) h += `<div class="s2-mask"><span>Selección activa: solo se pinta dentro.</span><button class="btn ghost sm" data-a="sel-none">Quitar <kbd>Esc</kbd></button></div>`;
    } else if (t === 'lasso') {
      h += E.float ? `<div class="s2-btns"><button class="btn primary sm" data-a="fl-ok">Aplicar <kbd>Intro</kbd></button><button class="btn sm" data-a="fl-x">Cancelar <kbd>Esc</kbd></button></div>
        <div class="s2-btns"><button class="btn sm" data-a="fl-fh">Voltear ↔</button><button class="btn sm" data-a="fl-fv">Voltear ↕</button><button class="btn sm" data-a="fl-dup">Estampar copia</button><button class="btn sm danger" data-a="fl-del">Borrar</button></div>
        <p class="hint">Arrastra dentro para mover, las esquinas para escalar (Mayúsculas deforma libre), los lados para estirar y el círculo de arriba para girar.</p>`
        : `<p class="hint">Rodea una zona de la capa activa para moverla, escalarla o girarla. Mientras la selección está activa, los pinceles pintan solo dentro de ella.</p><div class="s2-btns"><button class="btn sm" data-a="sel-all">Seleccionar todo <kbd>Ctrl+A</kbd></button>${E.mask ? '<button class="btn sm" data-a="sel-none">Quitar la selección <kbd>Esc</kbd></button>' : ''}</div>`;
    } else if (t === 'persp') {
      const G = d.guides;
      if (G.type !== 'none') h = h.replace('</div>', `<button class="icbtn s2-gv" data-a="g-vis" aria-pressed="${ea(G.show !== false)}" title="${ea(G.show !== false ? 'Ocultar las guías y los puntos de fuga (la perspectiva se conserva)' : 'Mostrar las guías y los puntos de fuga')}" aria-label="${ea(G.show !== false ? 'Ocultar las guías' : 'Mostrar las guías')}">${d2Ico(G.show !== false ? 'eye' : 'eyeoff')}</button></div>`);
      h += segH('g-type', [['none', 'Ninguna'], ['1p', '1 punto'], ['2p', '2 puntos'], ['3p', '3 puntos']], G.type);
      if (G.type !== 'none') {
        if (G.type !== '1p') { const sp = G.vp && G.vp.length > 1 ? Math.round(Math.abs(G.vp[1].x - G.vp[0].x) / 2 / DW * 100) : 45; h += rr('Separación', 'g-sp', sp, 10, 200, 1, sp + ' %'); }
        h += `<label class="opt-in"><input type="checkbox" data-k="g-snap" ${G.snap ? 'checked' : ''}> Ajustar los trazos a las guías</label>
          ${G.show === false ? '<p class="hint">Guías ocultas: la perspectiva sigue guardada. El ojo de arriba las vuelve a mostrar.</p>' : `<p class="hint">Arrastra los puntos de fuga (PF) o la línea del horizonte. Si un punto queda fuera de la vista, aparece como una marca en el borde: arrástrala para traerlo. Con el ajuste activo, cada trazo sigue la guía más cercana; Mayúsculas al empezar lo deja libre.</p>`}`;
      } else h += '<p class="hint">Elige 1, 2 o 3 puntos de fuga para dibujar fondos y objetos en perspectiva.</p>';
    } else if (t === 'hand') h += '<p class="hint">Arrastra para mover la hoja. Ctrl + rueda, o pellizcar, acerca y aleja. La barra espaciadora mueve la hoja con cualquier herramienta.</p>';
    if (o && o.type === 'arrow') {
      h += `<div class="s2-h sub"><b>Flecha</b><button class="btn ghost sm danger" data-a="obj-del">Eliminar</button></div>` + arrowCtl(o);
    } else if (t === 'arrow') h += arrowCtl(E.T.arrow) + '<p class="hint">Arrastra para trazar la flecha. Sus dos puntos cuadrados la doblan (en arco o en ese); Mayúsculas los mueve juntos. Los extremos la estiran y giran.</p>';
    if (o && o.type === 'text') h += `<div class="s2-h sub"><b>Texto</b><button class="btn ghost sm danger" data-a="obj-del">Eliminar</button></div>` + textCtl(o) + '<p class="hint">Doble clic para cambiar lo que dice. La esquina inferior derecha cambia el tamaño.</p>';
    else if (t === 'text') h += textCtl(E.T.text) + '<p class="hint">Toca la hoja para escribir. Ctrl + Intro o Esc termina.</p>';
    if (t === 'move' && !o) h += '<p class="hint">Toca una flecha o un texto para moverlo o cambiarlo. Para mover dibujos usa el Lazo.</p>';
    return h;
  }
  const arrowCtl = A => rr('Grosor', 'a-w', A.w, 6, 160, 1, A.w + ' px') + rr('Punta', 'a-head', A.head, .5, 2.2, .1, A.head.toFixed(1) + '×') + (A.double ? '' : rr('Cola', 'a-tail', A.tail, .1, 1, .05, Math.round(A.tail * 100) + ' %')) + rr('Opacidad', 'a-op', A.op, .1, 1, .05, Math.round(A.op * 100) + ' %') +
    `<div class="fld"><span>Contorno</span>${segH('a-outline', [['none', 'Sin'], ['white', 'Blanco'], ['dark', 'Oscuro']], A.outline)}</div><label class="opt-in"><input type="checkbox" data-k="a-double" ${A.double ? 'checked' : ''}> Punta en los dos extremos</label>`;
  const textCtl = T => rr('Tamaño', 't-size', T.size, 10, 220, 1, T.size + ' px') + `<div class="fld"><span>Fondo</span>${segH('t-bg', [['none', 'Sin'], ['white', 'Caja'], ['dark', 'Oscura'], ['halo', 'Borde']], T.bg)}</div><label class="opt-in"><input type="checkbox" data-k="t-bold" ${T.bold ? 'checked' : ''}> Negrita</label>`;
  function colorHTML() {
    return `<div class="s2-h"><b>Color</b><input type="text" class="hexin s2-hexin" data-k="hex" value="${esc(E.color.toUpperCase())}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Código del color (hexadecimal)" title="Escribe un código como #C8382C y pulsa Intro"></div>
      <div class="s2-pal">${D2_PAL.map(c => `<button class="sw" style="--sw:${ea(c)}" data-col="${ea(c)}" aria-pressed="${ea(c.toLowerCase() === E.color.toLowerCase())}" aria-label="Color ${ea(colorName(c))}"></button>`).join('')}
        <label class="sw sw-pick" style="--sw:${ea(E.color)}" title="Otro color"><input type="color" value="${ea(E.color)}" data-k="col" data-nohex aria-label="Elegir otro color"></label></div>
      ${E.recent.length ? `<div class="s2-rec"><span class="hint">Recientes</span>${E.recent.map(c => `<button class="sw" style="--sw:${ea(c)}" data-col="${ea(c)}" aria-label="Color ${ea(colorName(c))}"></button>`).join('')}</div>` : ''}`;
  }
  function layersHTML() {
    const F = curF();
    return `<div class="s2-h"><b>Capas</b><span class="s2-lbtn"><button class="icbtn" data-a="ly-add" title="Capa nueva" aria-label="Capa nueva"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button><button class="icbtn" data-a="ly-img" title="Cargar una imagen: queda de fondo, detrás de las figuras (en la capa se pasa delante o se baja para calcar)" aria-label="Cargar una imagen"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/></svg></button></span></div>
      <div class="s2-lys">${(() => {
      // la lista va de arriba abajo: las capas de encima, la Viñeta 3D y las fotos de fondo (detrás de las figuras)
      const lays = d2Layers(d), row = L => {
        const a = L.id === d.act && !E.v3sel;
        return `<div class="s2-ly${ea(a ? ' on' : '')}${ea(L.vis ? '' : ' off')}" data-l="${ea(L.id)}">
          <button class="s2-eye" data-a="ly-vis" aria-pressed="${ea(L.vis)}" aria-label="${ea(L.vis ? 'Ocultar' : 'Mostrar')} «${esc(L.name)}»" title="${ea(L.vis ? 'Ocultar' : 'Mostrar')}">${d2Ico(L.vis ? 'eye' : 'eyeoff')}</button>
          <canvas class="s2-lth" width="64" height="${Math.round(64 / ar)}" data-lth="${ea(L.id)}"></canvas>
          <span class="s2-lnm" title="Doble clic para cambiar el nombre">${esc(L.name)}</span>
          ${L.shared ? `<span class="s2-lsh" title="Igual en todos los cuadros">${d2Ico('link')}</span>` : '<i></i>'}
          <button class="s2-lk${ea(L.lock ? ' on' : '')}" data-a="ly-lock" aria-pressed="${ea(!!L.lock)}" title="${ea(L.lock ? 'Desbloquear la capa' : 'Bloquear la capa: no se pinta, borra ni mueve')}" aria-label="${ea(L.lock ? 'Desbloquear' : 'Bloquear')} «${esc(L.name)}»">${d2Ico(L.lock ? 'lock' : 'unlock')}</button>
          <span class="s2-lop">${Math.round(L.op * 100)}%</span>
        </div>${a ? `<div class="s2-lyx">${rr('Opacidad', 'ly-op', L.op, 0, 1, .05, Math.round(L.op * 100) + ' %')}
          ${L.kind === 'image' ? `<label class="opt-in" title="La foto queda de fondo: las figuras y los objetos de la escena 3D se ven encima, con sus sombras"><input type="checkbox" data-k="ly-back" ${d2Back(L) ? 'checked' : ''}> Detrás de las figuras</label>` : ''}
          <div class="s2-lyb"><label class="opt-in"><input type="checkbox" data-k="ly-sh" ${L.shared ? 'checked' : ''}> Igual en todos los cuadros</label>
          <span class="s2-lya"><button class="icbtn" data-a="ly-dup" title="Duplicar la capa" aria-label="Duplicar la capa">${d2Ico('dup')}</button><button class="icbtn" data-a="ly-clear" ${L.lock ? 'disabled' : ''} title="Vaciar la capa en este cuadro" aria-label="Vaciar la capa">${d2Ico('clear')}</button><button class="icbtn danger" data-a="ly-del" ${d.layers.length < 2 || L.lock ? 'disabled' : ''} title="Eliminar la capa" aria-label="Eliminar la capa">${d2Ico('trash')}</button></span></div></div>` : ''}`;
      };
      const on3 = d.base === '3d', op3 = d.baseOp ?? .45, backs = lays.filter(d2Back);
      const v3 = `<div class="s2-ly v3d${ea(E.v3sel ? ' on' : '')}${ea(on3 ? '' : ' off')}" data-v3="1" title="La escena 3D del plano: las capas de encima se superponen; las de abajo quedan de fondo">
          <button class="s2-eye" data-a="v3-vis" aria-pressed="${ea(on3)}" aria-label="${ea(on3 ? 'Ocultar la Viñeta 3D' : 'Mostrar la Viñeta 3D')}" title="${ea(on3 ? 'Ocultar la escena 3D (queda el papel)' : 'Mostrar la escena 3D')}">${d2Ico(on3 ? 'eye' : 'eyeoff')}</button>
          <canvas class="s2-lth" width="64" height="${Math.round(64 / ar)}" data-lth3="1"></canvas>
          <span class="s2-lnm">Viñeta 3D</span><i></i><i></i>
          <span class="s2-lop">${on3 ? Math.round(op3 * 100) + '%' : 'Papel'}</span>
        </div>${E.v3sel ? `<div class="s2-lyx">${on3 ? rr('Opacidad', 'base-op', op3, .05, 1, .05, Math.round(op3 * 100) + ' %') : ''}<p class="hint">${on3 ? 'La escena 3D del plano. Las capas de encima se superponen; las imágenes «Detrás de las figuras» quedan debajo, de fondo.' : 'Oculta: se ve el papel. El ojo la vuelve a mostrar.'}</p></div>` : ''}`;
      return lays.filter(L => !d2Back(L)).reverse().map(row).join('') + v3 + backs.slice().reverse().map(row).join('');
    })()}
      </div>`;
  }
  function insp() {
    const el = $o('#s2In');
    el.innerHTML = `<section class="s2-sec" id="s2Tl">${toolHTML()}</section>${['eraser', 'hand', 'lasso', 'persp'].includes(E.tool) ? '' : `<section class="s2-sec">${colorHTML()}</section>`}<section class="s2-sec">${layersHTML()}</section>`;
    layerThumbs();
    $o('.s2-cur i').style.setProperty('--c', E.color);
    syncHist();
  }
  function layerThumbs() {
    const F = curF();
    for (const cv of ov.querySelectorAll('[data-lth]')) {
      const L = d.layers.find(l => l.id === cv.dataset.lth); if (!L) continue;
      const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
      g.save(); g.scale(cv.width / DW, cv.height / DH);
      const r = ras(L, F); if (r) g.drawImage(r, 0, 0);
      if (E.float && E.float.k === rk(L, F)) drawFloat(g, E.float);
      for (const o of objsOf(L, F)) d2DrawObj(g, o);
      g.restore();
    }
    // la de la Viñeta 3D: la escena (sin su entorno si hay una foto detrás)
    const c3 = ov.querySelector('[data-lth3]');
    if (c3) { const g = c3.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, c3.width, c3.height); const bg = bgOf(F, plateOf(F)); if (bg) g.drawImage(bg, 0, 0, c3.width, c3.height); }
  }
  const setLive = (el, txt) => { const o = el.parentElement.querySelector('output'); if (o) o.textContent = txt; el.style.setProperty('--p', (el.value - el.min) / (el.max - el.min) * 100 + '%'); };
  let objBefore = null, docBefore = null;
  $o('#s2In').addEventListener('pointerdown', e => { if (e.target.matches('input[type=range]')) { objBefore = JSON.stringify(d.objs); docBefore = snap(); } });
  $o('#s2In').addEventListener('input', e => {
    const el = e.target, k = el.dataset.k; if (!k) return;
    const v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
    const so = E.sel && findObj(E.sel), o = so && so.o;
    if (D2_BRUSH.has(E.tool) && ['size', 'op', 'smooth'].includes(k)) { E.T[E.tool][k] = v; setLive(el, k === 'op' ? Math.round(v * 100) + ' %' : k === 'size' ? v + ' px' : v + ' %'); saveTools(); req(); return; }
    if (k === 'col') { setColor(v, true); return; }
    if (k.startsWith('a-') || k.startsWith('t-')) {
      const prop = k.slice(2), tgt = o && (o.type === 'arrow') === k.startsWith('a-') ? o : E.T[k.startsWith('a-') ? 'arrow' : 'text'];
      if (el.type === 'range') { tgt[prop] = v; setLive(el, prop === 'w' || prop === 'size' ? v + ' px' : prop === 'head' ? v.toFixed(1) + '×' : Math.round(v * 100) + ' %'); }
      if (tgt !== o) saveTools();
      if (o && E.text === o) placeText();
      req(); return;
    }
    if (k === 'ly-op') { actL().op = v; setLive(el, Math.round(v * 100) + ' %'); const t = ov.querySelector('.s2-ly.on .s2-lop'); if (t) t.textContent = Math.round(v * 100) + '%'; ONION.clear(); req(); return; }
    if (k === 'base-op') { d.baseOp = v; setLive(el, Math.round(v * 100) + ' %'); req(); return; }
    if (k === 'g-sp') { const G = d.guides, c = DW / 2, s = v / 100 * DW; G.vp[0].x = c - s; G.vp[1].x = c + s; setLive(el, v + ' %'); req(); return; }
  });
  $o('#s2In').addEventListener('change', e => {
    const el = e.target, k = el.dataset.k; if (!k) return;
    const v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
    const so = E.sel && findObj(E.sel), o = so && so.o;
    if (k === 'col') { setColor(v); return; }
    if (k === 'hex') { const h = normHex(v); if (h) setColor(h); else el.value = E.color.toUpperCase(); return; }
    if (k.startsWith('a-') || k.startsWith('t-')) {
      const prop = k.slice(2), tgt = o && (o.type === 'arrow') === k.startsWith('a-') ? o : E.T[k.startsWith('a-') ? 'arrow' : 'text'];
      const before = objBefore || JSON.stringify(d.objs); objBefore = null;
      if (el.type === 'checkbox') tgt[prop] = v;
      if (tgt === o) objEdit(before); else saveTools();
      if (o && E.text === o) placeText();
      insp(); req(); return;
    }
    if (k === 'ly-op' || k === 'base-op' || k === 'g-sp') { const a = docBefore || snap(); docBefore = null; const b = snap(); if (a.d !== b.d) push({ undo: () => restore(a), redo: () => restore(b) }); fullRefresh(); return; }
    if (k === 'ly-sh') { toggleShared(actL(), v); return; }
    // una imagen detrás de las figuras (de fondo) o encima de la escena 3D
    if (k === 'ly-back') { structural(() => { const L = actL(); if (v && L.kind === 'image') L.back = true; else delete L.back; }); ensureBG(); return; }
    if (k === 'g-snap' || k === 'g-show') { structural(() => { d.guides[k === 'g-snap' ? 'snap' : 'show'] = v; }); return; }
  });
  $o('#s2In').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const so = E.sel && findObj(E.sel), o = so && so.o;
    if (b.dataset.col) { setColor(b.dataset.col); return; }
    if (b.dataset.k) {
      const k = b.dataset.k, v = b.dataset.v;
      if (k === 'g-type') { structural(() => { d.guides.type = v; d.guides.vp = v === 'none' ? null : defaultVP(v); }); return; }
      const prop = k.slice(2), tgt = o && (o.type === 'arrow') === k.startsWith('a-') ? o : E.T[k.startsWith('a-') ? 'arrow' : 'text'];
      const before = JSON.stringify(d.objs);
      tgt[prop] = v;
      if (tgt === o) objEdit(before); else saveTools();
      if (o && E.text === o) placeText();
      insp(); req(); return;
    }
    const a = b.dataset.a; if (!a) return;
    const row = b.closest('[data-l]');
    if (a === 'ly-vis' && row) { structural(() => { const L = d.layers.find(l => l.id === row.dataset.l); L.vis = !L.vis; }); return; }
    if (a === 'v3-vis') { structural(() => { d.base = d.base === '3d' ? 'paper' : '3d'; if (!(d.baseOp > 0)) d.baseOp = 1; }); ensureBG(); return; }
    if (a === 'ly-lock' && row) { structural(() => { const L = d.layers.find(l => l.id === row.dataset.l); L.lock = !L.lock; }); return; }
    if (a === 'fl-ok') { applyFloat(); req(); return; }
    if (a === 'fl-x') { cancelFloat(); return; }
    if (a === 'fl-del') { dropFloat(); req(); return; }
    if (a === 'fl-fh') { E.float.sx *= -1; req(); return; }
    if (a === 'fl-fv') { E.float.sy *= -1; req(); return; }
    if (a === 'fl-dup') { stampFloat(); return; }
    if (a === 'sel-all') { selectAll(); return; }
    if (a === 'sel-none') { clearMask(); return; }
    if (a === 'obj-del' && o) { const before = JSON.stringify(d.objs); if (E.text) { E.text = null; TX.hidden = true; } delObj(o.id); E.sel = null; objEdit(before); insp(); req(); return; }
    if (a === 'g-vis') { structural(() => { d.guides.show = d.guides.show === false; }); return; }
    if (a === 'ly-add') { structural(() => { const L = { id: uid('l'), name: 'Capa ' + (d.layers.length + 1), kind: 'draw', vis: true, op: 1, shared: false }; d.layers.splice(d.layers.indexOf(actL()) + 1, 0, L); d.act = L.id; E.v3sel = false; }); return; }
    if (a === 'ly-img') { pickImage(); return; }
    if (a === 'ly-dup') {
      structural(() => {
        const L = actL(), N = { ...L, id: uid('l'), name: L.name + ' (copia)' }; delete N.imp;
        d.layers.splice(d.layers.indexOf(L) + 1, 0, N);
        for (const [k, c] of [...E.R]) if (k.startsWith(L.id + '~')) E.R.set(N.id + k.slice(L.id.length), cloneC(c));
        for (const [k, arr] of Object.entries(d.objs)) if (k.startsWith(L.id + '~')) d.objs[N.id + k.slice(L.id.length)] = arr.map(x => ({ ...JSON.parse(JSON.stringify(x)), id: uid('o') }));
        d.act = N.id;
      }); return;
    }
    if ((a === 'ly-clear' || a === 'ly-del') && actL().lock) { lockedMsg(actL()); return; }
    if (a === 'ly-clear') { structural(() => { const L = actL(), k = rk(L, curF()); if (E.R.get(k)) E.R.set(k, mk()); delete d.objs[k]; }); return; }
    if (a === 'ly-del') {
      if (d.layers.length < 2) return;
      structural(() => { const L = actL(), i = d.layers.indexOf(L); d.layers.splice(i, 1); for (const k of [...E.R.keys()]) if (k.startsWith(L.id + '~')) E.R.delete(k); for (const k of Object.keys(d.objs)) if (k.startsWith(L.id + '~')) delete d.objs[k]; d.act = d.layers[Math.max(0, i - 1)].id; });
      return;
    }
  });
  $o('#s2In').addEventListener('pointerdown', e => {
    // la Viñeta 3D: se elige para ver su opacidad (no se dibuja en ella ni se mueve)
    const r3 = e.target.closest('.s2-ly.v3d');
    if (r3 && !e.target.closest('button,input')) { E.v3sel = !E.v3sel; insp(); return; }
    const row = e.target.closest('.s2-ly[data-l]');
    if (!row || e.target.closest('button,input')) return;
    if (row.dataset.l !== d.act || E.v3sel) { applyFloat(); commitText(); d.act = row.dataset.l; E.v3sel = false; E.sel = null; insp(); req(); }
    if (E.ro || e.button) return;
    // como las tiras del plan: con el ratón, presionar y mover la arrastra; con el dedo, mantener y arrastrar
    const id = row.dataset.l;
    pressGesture(e, { target: $o(`.s2-ly[data-l="${CSS.escape(id)}"]`), onLift: ev => layerDrag(ev, id) });
  });
  function layerDrag(e, id) {
    const box = $o('.s2-lys'), row = box.querySelector(`.s2-ly[data-l="${CSS.escape(id)}"]`); if (!row) return;
    box.querySelectorAll('.s2-lyx').forEach(x => x.remove());
    const rect = row.getBoundingClientRect(), ghost = row.cloneNode(true);
    ghost.classList.add('s2-ghost'); Object.assign(ghost.style, { width: rect.width + 'px', left: rect.left + 'px', top: rect.top + 'px' });
    document.body.appendChild(ghost); row.classList.add('ph');
    const dy = e.clientY - rect.top, sc = $o('#s2In');
    let lastY = e.clientY, raf = 0;
    // la Viñeta 3D también cuenta como lugar: soltar una imagen debajo de ella la deja detrás de las figuras
    const rows = () => [...box.querySelectorAll('.s2-ly[data-l], .s2-ly.v3d')].filter(r => r !== row);
    const place = y => {
      ghost.style.top = (y - dy) + 'px';
      const rs = rows(), next = rs.find(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2; });
      if (next ? row.nextElementSibling === next : rs.length && rs[rs.length - 1].nextElementSibling === row) return;
      const snapR = flipSnap(rs);
      if (next) box.insertBefore(row, next); else if (rs.length) box.insertBefore(row, rs[rs.length - 1].nextElementSibling);
      flipPlay(snapR);
    };
    const tick = () => { edgeScroll(sc, 0, lastY); place(lastY); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    const move = ev => { lastY = ev.clientY; };
    const up = () => {
      cancelAnimationFrame(raf); removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
      ghost.remove(); row.classList.remove('ph'); flipClear(rows());
      // la lista va de arriba (última capa) a abajo; lo que quedó bajo la Viñeta 3D va detrás de las figuras (solo las
      // imágenes: un dibujo que se suelta ahí queda justo encima de la escena)
      const all = [...box.querySelectorAll('.s2-ly[data-l], .s2-ly.v3d')], i3 = all.findIndex(r => r.classList.contains('v3d'));
      const byId = id => d.layers.find(l => l.id === id), top = all.slice(0, i3).map(r => byId(r.dataset.l)), bot = all.slice(i3 + 1).map(r => byId(r.dataset.l));
      const botImg = bot.filter(L => L.kind === 'image'), botDraw = bot.filter(L => L.kind !== 'image');
      const order = [...botImg.slice().reverse(), ...botDraw.slice().reverse(), ...top.slice().reverse()].map(L => L.id);
      const backs = new Set(botImg.map(L => L.id));
      if (order.join() !== d.layers.map(l => l.id).join() || d.layers.some(L => d2Back(L) !== backs.has(L.id))) {
        structural(() => { for (const L of d.layers) { if (backs.has(L.id)) L.back = true; else delete L.back; } d.layers.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)); });
        ensureBG();
        if (botDraw.length) toast('El dibujo va siempre encima de las figuras: detrás solo van imágenes.', 3600);
      } else insp();
    };
    addEventListener('pointermove', move, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
  }
  $o('#s2In').addEventListener('dblclick', e => {
    const nm = e.target.closest('.s2-ly[data-l] .s2-lnm'); if (!nm) return;
    const L = d.layers.find(l => l.id === nm.closest('[data-l]').dataset.l);
    const inp = document.createElement('input'); inp.type = 'text'; inp.value = L.name; inp.className = 's2-lin'; inp.maxLength = 40;
    nm.replaceWith(inp); inp.focus(); inp.select();
    const done = ok => { if (ok && inp.value.trim() && inp.value.trim() !== L.name) structural(() => { d.layers.find(l => l.id === L.id).name = inp.value.trim(); }); else insp(); };
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); done(true); } if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done(false); } });
    inp.addEventListener('blur', () => done(true), { once: true });
  });
  function toggleShared(L, on) {
    const F = curF();
    structural(() => {
      const LL = d.layers.find(l => l.id === L.id);
      if (on) {
        const cur = E.R.get(LL.id + '~' + F.id), objs = d.objs[LL.id + '~' + F.id];
        for (const k of [...E.R.keys()]) if (k.startsWith(LL.id + '~')) E.R.delete(k);
        for (const k of Object.keys(d.objs)) if (k.startsWith(LL.id + '~')) delete d.objs[k];
        if (cur) E.R.set(LL.id + '~all', cur);
        if (objs) d.objs[LL.id + '~all'] = objs;
        LL.shared = true;
      } else {
        const all = E.R.get(LL.id + '~all'), objs = d.objs[LL.id + '~all'];
        E.R.delete(LL.id + '~all'); delete d.objs[LL.id + '~all'];
        for (const f of d.frames) { if (all) E.R.set(LL.id + '~' + f.id, cloneC(all)); if (objs) d.objs[LL.id + '~' + f.id] = objs.map(x => ({ ...JSON.parse(JSON.stringify(x)), id: uid('o') })); }
        LL.shared = false;
      }
    });
    if (on && d.frames.length > 1) toast('La capa queda igual en todos los cuadros, con el dibujo de este cuadro.', 3600);
  }
  function setColor(c, live) {
    const so0 = E.sel && findObj(E.sel);
    E.color = c; E.colors[E.tool === 'arrow' || (so0 && so0.o.type === 'arrow') ? 'arrow' : 'draw'] = c;
    ls.set('d2acolor', E.colors.arrow);
    const so = E.sel && findObj(E.sel);
    if (so && !live) { const before = JSON.stringify(d.objs); so.o.color = c; objEdit(before); if (E.text) placeText(); }
    else if (so && live) { so.o.color = c; if (E.text) placeText(); }
    ls.set('d2color', E.colors.draw);
    if (!live) { if (so) useColor(c); insp(); }
    else { $o('.s2-cur i').style.setProperty('--c', c); const hx = $o('.s2-hexin'); if (hx && document.activeElement !== hx) hx.value = c.toUpperCase(); }
    req();
  }
  function useColor(c) {
    if (D2_PAL.some(x => x.toLowerCase() === c.toLowerCase())) return;
    E.recent = [c, ...E.recent.filter(x => x.toLowerCase() !== c.toLowerCase())].slice(0, 8); ls.set('d2recent', E.recent);
  }
  const saveTools = () => ls.set('d2tools', E.T);
  function setTool(t, keep) {
    if (t === E.tool && !keep) return;
    if (t !== 'lasso') applyFloat();
    if (t !== 'text') commitText();
    if (E.sel) { const so = findObj(E.sel); if (!so || (t !== 'move' && t !== so.o.type)) E.sel = null; }
    if ((t === 'arrow') !== (E.tool === 'arrow')) E.color = E.colors[t === 'arrow' ? 'arrow' : 'draw'];
    E.tool = t; ls.set('d2tool', t);
    if (t === 'persp' && d.guides.type === 'none') { const a = snap(); d.guides.type = '2p'; d.guides.vp = defaultVP('2p'); const b = snap(); push({ undo: () => restore(a), redo: () => restore(b) }); }
    stage.dataset.tool = t;
    for (const b of ov.querySelectorAll('[data-tool]')) b.setAttribute('aria-pressed', b.dataset.tool === t);
    C.style.cursor = '';
    insp(); req();
  }
  $o('.s2-rail').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool); });

  /* ---------- cuadros (papel cebolla y animación) ---------- */
  function framesHTML() {
    const F = curF(), O = d.onion, sec = d2Len(d);
    return `<button class="btn primary sm s2-ib s2-play" data-f="play" aria-label="${ea(E.playing ? 'Pausa' : 'Reproducir')}" title="Reproducir la animación" ${d.frames.length < 2 ? 'disabled' : ''}>${d2Ico(E.playing ? 'pause' : 'play')}</button>
      <div class="s2-strip" id="s2Strip">${d.frames.map((f, i) => `<button class="s2-fth${ea(i === E.fi ? ' on' : '')}" data-fi="${i}" aria-label="Cuadro ${ea(i + 1)}"><canvas width="${Math.round(58 * ar)}" height="58" data-fth="${i}"></canvas><span>${i + 1}${(f.hold || 1) > 1 ? ` · ×${f.hold}` : ''}</span></button>`).join('')}
        <button class="s2-fadd" data-f="add" title="Cuadro nuevo en blanco después de este" aria-label="Cuadro nuevo">+</button></div>
      <div class="s2-fr2">
        <div class="s2-btns"><select data-f="fps" class="s2-sel" aria-label="Cuadros por segundo" title="Cuadros por segundo">${[6, 8, 12, 24].map(f => `<option value="${ea(f)}" ${f === (d.fps || 12) ? 'selected' : ''}>${f} cps</option>`).join('')}</select>
        <button class="btn ghost sm" data-f="loop" aria-pressed="${ea(d.loop !== false)}" title="Al llegar al final vuelve a empezar">Bucle</button></div>
        <div class="s2-btns"><button class="btn ghost sm" data-f="dup" title="Copia este cuadro para dibujar el siguiente gesto">Duplicar</button><button class="btn ghost sm s2-ib" data-f="left" ${E.fi ? '' : 'disabled'} aria-label="Mover el cuadro a la izquierda">◀</button><button class="btn ghost sm s2-ib" data-f="right" ${E.fi < d.frames.length - 1 ? '' : 'disabled'} aria-label="Mover el cuadro a la derecha">▶</button><button class="btn ghost sm danger" data-f="del" ${d.frames.length > 1 ? '' : 'disabled'}>Eliminar</button></div>
        <label class="s2-hold">Dura <select data-f="hold" class="s2-sel">${[1, 2, 3, 4, 6, 8, 12].map(h => `<option value="${ea(h)}" ${h === (F.hold || 1) ? 'selected' : ''}>${h} ${h === 1 ? 'cuadro' : 'cuadros'}</option>`).join('')}</select></label>
        <button class="btn ghost sm s2-onion" data-f="onion" aria-pressed="${ea(!!O.on)}" ${d.frames.length < 2 ? 'disabled' : ''} title="Muestra el cuadro anterior en rojo y el siguiente en verde">Papel cebolla</button>
        ${O.on ? `<select data-f="oprev" class="s2-sel" aria-label="Cuadros anteriores">${[1, 2, 3].map(n => `<option value="${n}" ${n === O.prev ? 'selected' : ''}>${n} antes</option>`).join('')}</select><select data-f="onext" class="s2-sel" aria-label="Cuadros siguientes">${[0, 1, 2, 3].map(n => `<option value="${n}" ${n === O.next ? 'selected' : ''}>${n} después</option>`).join('')}</select>` : ''}
        <span class="hint s2-dur">${d.frames.length} ${d.frames.length === 1 ? 'cuadro' : 'cuadros'} · ${sec.toFixed(1)} s${d.frames.length > 1 ? (d.loop !== false ? ' en bucle' : '') : ''}</span>
      </div>`;
  }
  function frames() { $o('#s2Fr').innerHTML = framesHTML(); frameThumbs(); const on = $o('.s2-fth.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  function frameThumbs(only) {
    for (const cv of ov.querySelectorAll('[data-fth]')) {
      const i = +cv.dataset.fth; if (only != null && i !== only) continue;
      const g = cv.getContext('2d'); g.setTransform(cv.width / DW, 0, 0, cv.height / DH, 0, 0); compose(g, d.frames[i], { live: i === E.fi });
    }
  }
  const thumbsSoon = debounce(() => { if (!ov.isConnected) return; frameThumbs(E.fi); layerThumbs(); }, 160);
  function goFrame(i) {
    i = clamp(i, 0, d.frames.length - 1);
    if (i === E.fi) return;
    applyFloat(); commitText(); E.sel = null;
    E.fi = i; frames(); insp(); req();
  }
  function fullRefresh() { E.fi = clamp(E.fi, 0, d.frames.length - 1); frames(); insp(); req(); }
  $o('#s2Fr').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.fi != null) { if (E.playing) stopPlay(); goFrame(+b.dataset.fi); return; }
    const f = b.dataset.f;
    if (f === 'play') { E.playing ? stopPlay() : startPlay(); return; }
    if (E.playing) stopPlay();
    if (f === 'loop') { structural(() => { d.loop = d.loop === false; }); return; }
    if (f === 'onion') { structural(() => { d.onion.on = !d.onion.on; }); return; }
    if (f === 'add' || f === 'dup') {
      structural(() => {
        const F = curF(), N = { id: uid('f'), hold: F.hold || 1 };
        d.frames.splice(E.fi + 1, 0, N);
        if (f === 'dup') for (const L of d.layers) if (!L.shared) {
          const c = E.R.get(L.id + '~' + F.id); if (c) E.R.set(L.id + '~' + N.id, cloneC(c));
          const os = d.objs[L.id + '~' + F.id]; if (os) d.objs[L.id + '~' + N.id] = os.map(x => ({ ...JSON.parse(JSON.stringify(x)), id: uid('o') }));
        }
        E.fi++;
        if (d.frames.length === 2 && !d.onion.on) d.onion.on = true;
      });
      if (!d.layers.some(l => !l.shared)) toast('Todas las capas son iguales en todos los cuadros: crea una capa nueva para dibujar lo que cambia.', 4200);
      return;
    }
    if (f === 'del') { if (d.frames.length < 2) return; structural(() => { const F = curF(); for (const k of [...E.R.keys()]) if (k.endsWith('~' + F.id)) E.R.delete(k); for (const k of Object.keys(d.objs)) if (k.endsWith('~' + F.id)) delete d.objs[k]; d.frames.splice(E.fi, 1); E.fi = Math.min(E.fi, d.frames.length - 1); }); return; }
    if (f === 'left' || f === 'right') { structural(() => { const j = E.fi + (f === 'left' ? -1 : 1); if (j < 0 || j >= d.frames.length) return; const [F] = d.frames.splice(E.fi, 1); d.frames.splice(j, 0, F); E.fi = j; }); return; }
  });
  $o('#s2Fr').addEventListener('change', e => {
    const el = e.target, f = el.dataset.f; if (!f) return;
    if (E.playing) stopPlay();
    structural(() => {
      if (f === 'fps') d.fps = +el.value;
      if (f === 'hold') curF().hold = +el.value;
      if (f === 'oprev') d.onion.prev = +el.value;
      if (f === 'onext') d.onion.next = +el.value;
    });
  });
  let playRaf = 0;
  function startPlay() {
    if (d.frames.length < 2) return;
    applyFloat(); commitText();
    E.playing = true; E.fi0 = E.fi; const t0 = performance.now();
    const tick = now => {
      if (!E.playing || !ov.isConnected) return;
      const F = d2FrameAt(d, (now - t0) / 1000), i = d.frames.indexOf(F);
      if (i !== E.fi) { E.fi = i; for (const b of ov.querySelectorAll('.s2-fth')) b.classList.toggle('on', +b.dataset.fi === i); }
      draw();
      if (d.loop === false && (now - t0) / 1000 >= d2Len(d)) { stopPlay(); return; }
      playRaf = requestAnimationFrame(tick);
    };
    playRaf = requestAnimationFrame(tick);
    const b = $o('[data-f="play"]'); if (b) { b.innerHTML = d2Ico('pause'); b.setAttribute('aria-label', 'Pausa'); }
  }
  function stopPlay() { E.playing = false; cancelAnimationFrame(playRaf); frames(); insp(); req(); }

  /* ---------- teclado ---------- */
  const setAlt = on => { if (E.alt === on) return; E.alt = on; stage.classList.toggle('picking', on && D2_BRUSH.has(E.tool) && E.tool !== 'eraser'); req(); };
  addEventListener('blur', () => setAlt(false));
  const onKey = e => {
    if (!ov.isConnected || $('#modal')) return;
    const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
    if (e.key === 'Alt') { if (!typing) e.preventDefault(); setAlt(e.type === 'keydown'); return; }   // Alt: cuentagotas mientras se mantiene
    if (e.type === 'keyup') { if (e.key === ' ') { E.space = false; stage.classList.remove('space'); } return; }
    if (typing) { if (e.key === 'Escape') { e.stopImmediatePropagation(); document.activeElement.blur(); } else if (!ov.contains(document.activeElement)) e.stopImmediatePropagation(); return; }
    const k = e.key, mod = e.ctrlKey || e.metaKey;
    let used = true;
    if (mod && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && k.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if (mod && k.toLowerCase() === 'a') { e.preventDefault(); selectAll(); }
    else if (mod && k.toLowerCase() === 's') { e.preventDefault(); save(); }
    else if (mod && k.toLowerCase() === 'd') { e.preventDefault(); clearMask(); }
    else if (mod) used = false;
    else if (k === 'Escape') { closePop(); if (E.float) cancelFloat(); else if (E.lasso) { E.lasso = null; } else if (E.mask) { E.mask = null; insp(); } else if (E.sel) { E.sel = null; insp(); } else if (E.playing) stopPlay(); req(); }
    else if (k === 'Enter') { if (E.float) { applyFloat(); req(); } else used = false; }
    else if (k === 'Delete' || k === 'Backspace') { if (E.float) { dropFloat(); req(); } else if (E.sel) { const before = JSON.stringify(d.objs); delObj(E.sel); E.sel = null; objEdit(before); insp(); } else used = false; }
    else if (k === ' ') { e.preventDefault(); if (!E.space) { E.space = true; stage.classList.add('space'); } }
    else if (k === '[' || k === ']') { if (D2_BRUSH.has(E.tool)) { const T = E.T[E.tool]; T.size = clamp(Math.round(T.size * (k === ']' ? 1.2 : 1 / 1.2) + (k === ']' ? 1 : -1)), 1, D2_MAX[E.tool]); saveTools(); insp(); req(); } }
    else if (k === ',' || k === '.') goFrame(E.fi + (k === ',' ? -1 : 1));
    else if (k === '0') fit();
    else if (k === '+' || k === '=') zoomAt(1.25);
    else if (k === '-') zoomAt(.8);
    else { const t = D2_TOOLS.find(x => x[2].toLowerCase() === k.toLowerCase()); if (t) setTool(t[0]); else used = false; }
    e.stopImmediatePropagation();
    if (!used) return;
  };
  addEventListener('keydown', onKey, true);
  addEventListener('keyup', onKey, true);

  /* ---------- botones de arriba ---------- */
  ov.querySelector('.s2-top').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ws === '3d') { toWs3D(); return; }
    const a = b.dataset.s2;
    if (a === 'undo') undo(); else if (a === 'redo') redo();
    else if (a === 'zi') zoomAt(1.25); else if (a === 'zo') zoomAt(.8); else if (a === 'fit') fit();
    else if (a === 'save') save();
    else if (a === 'cancel') cancel();
    else if (a === 'prev' && list[idx - 1]) save(() => openShotEditor(list[idx - 1].id));
    else if (a === 'next' && list[idx + 1]) save(() => openShotEditor(list[idx + 1].id));
    else if (a === 'more') popover(b, `<div class="menu"><button data-m="dup">Duplicar plano</button><button data-m="del">Eliminar plano</button></div>`, p => p.addEventListener('click', ev => {
      const m = ev.target.closest('[data-m]'); if (!m) return; closePop();
      if (m.dataset.m === 'dup') save(async () => { const nsh = P.shots[id], next = (D.shotsBy[nsh.sc] || [])[(D.shotsBy[nsh.sc] || []).indexOf(nsh) + 1]; const copy = { ...JSON.parse(JSON.stringify(nsh)), id: uid('s'), ord: next ? (nsh.ord + next.ord) / 2 : nsh.ord + 1, done: false }; if (isMaster(nsh) || copy.master) copy.master = false; P.shots[copy.id] = copy; await copyShotFrames(id, copy.id); changed('data'); derive(); render(); openShotEditor(copy.id); toast('Plano duplicado.'); });
      if (m.dataset.m === 'del') { close(true); deleteShot(id); }
    }));
  });
  function close(keepShot) {
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); document.removeEventListener('paste', onPaste);
    cancelAnimationFrame(raf); cancelAnimationFrame(playRaf); E.playing = false;
    roObs.disconnect(); ov.remove(); closePop();
    if (S2 === E) S2 = null;
    if (EDT && EDT.is2d) EDT = null;
    if (!keepShot && E.isNew && !E.saved && P.shots[id] && !sh.d2 && !sh.s3) { delete P.shots[id]; changed('data'); derive(); render(); }
  }
  function cancel() {
    commitText();
    if (E.dirty || E.float) confirmBox('Descartar los cambios', 'Los trazos de esta sesión no se guardarán.', 'Descartar', () => close());
    else close();
  }
  function toWs3D() {
    if (E.dirty || E.float) save(() => openShotEditor(id, false, true));
    else { const nw = E.isNew && !sh.d2; close(true); openShotEditor(id, nw, true); }
  }

  /* ---------- guardar ---------- */
  async function blank(c) { const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < px.length; i += 4) if (px[i]) return false; return true; }
  async function save(after) {
    if (E.ro) { close(); return; }
    commitText(); applyFloat();
    if (E.playing) stopPlay();
    E.saved = true;
    const btn = $o('[data-s2="save"]'); btn.disabled = true; btn.textContent = 'Guardando…';
    await new Promise(r => setTimeout(r, 20));
    const writes = [], keep = new Set();
    for (const [k, c] of E.R) {
      const [lid, fk] = k.split('~'), L = d.layers.find(l => l.id === lid);
      if (!L || (L.shared ? fk !== 'all' : !d.frames.some(f => f.id === fk))) continue;
      const fkey = d2Key(id, lid, fk);
      if (E.saved_.get(k) === c && c._v === c._v0 && FRAMES[fkey]) { keep.add(fkey); continue; }
      if (await blank(c)) continue;
      keep.add(fkey);
      // la capa de una imagen subida: WebP de hasta unos 170 kB con su transparencia (imagenes.js); el trazo, PNG
      const url = L.kind === 'image' ? imgUrl(c, { alpha: true, fixed: true }) : c.toDataURL('image/png');
      FRAMES[fkey] = url; writes.push([fkey, url]);
    }
    const ckeep = new Set(d.frames.map(f => d2CKey(id, f.id)));
    const need = E.dirty || d.base === '3d' || d.frames.some(f => !FRAMES[d2CKey(id, f.id)]);
    if (need) {
      const [CW, CH] = frameDims(1280), cc = mk(CW, CH), g = cc.getContext('2d');
      for (const F of d.frames) {
        g.setTransform(CW / DW, 0, 0, CH / DH, 0, 0); compose(g, F);
        const url = cc.toDataURL('image/jpeg', .86), k = d2CKey(id, F.id);
        FRAMES[k] = url; writes.push([k, url]);
      }
    }
    for (const k of Object.keys(FRAMES)) if ((k.startsWith(id + '~d~') && !keep.has(k)) || (k.startsWith(id + '~c~') && !ckeep.has(k))) { delete FRAMES[k]; writes.push([k, null]); }
    for (const [k] of writes) IMGS.delete(k);
    delete d._imp;
    d.rev = (sh.d2 && sh.d2.rev || 0) + 1;
    const target = P.shots[id] || sh;
    target.d2 = JSON.parse(JSON.stringify(d)); target.ws = '2d';
    delete target.auto;
    close(true);
    changed('data'); derive(); render();
    if (writes.length && !UI.readOnly) {
      if (P._sample && !P._saved) await flushSave();
      const res = await Promise.allSettled(writes.map(([k, v]) => Store.saveFrame(P.id, k, v || null)));
      const bad = writes.filter((w, i) => res[i].status === 'rejected');
      if (bad.length) problem('No se pudieron guardar todos los dibujos.', async () => { const r2 = await Promise.allSettled(bad.map(([k, v]) => Store.saveFrame(P.id, k, v || null))); if (r2.some(x => x.status === 'rejected')) problem('Siguen sin guardarse algunos dibujos. Revisa la conexión o el espacio disponible.'); else toast('Dibujos guardados.'); });
    }
    if (after) after();
  }

  /* ---------- la Viñeta 3D ----------
     La escena del plano en el segundo en que empieza el cuadro (si se mueve) y, con una foto detrás de las figuras,
     sin su entorno (plate). Se dibuja una vez por momento y modo, y se guarda mientras el editor está abierto */
  function bgOf(F, plate) {
    const s3 = s3Of(sh), still = (s3.keys || []).length < 2 && !s3.shake, t = still ? 0 : round2(fStart(F)), key = (plate ? 'p' : 'n') + t;
    let c = E.BGs.get(key);
    if (c) return c;
    c = mk(); const g = c.getContext('2d');
    const o = { plate, atm: typeof sceneOfKey === 'function' ? envFromScene(sceneOfKey(sh.sc)).atm : null };
    if (sh.noNames) o.labels = false;
    try { r3Init(); if (!r3Draw(g, s3, t, DW, DH, o) && !plate) drawAutoFrame(g, DW, DH, shotSketchInfo(sh)); }
    catch (e) { if (!plate) drawAutoFrame(g, DW, DH, shotSketchInfo(sh)); }
    E.BGs.set(key, c); if (E.BGs.size > 24) E.BGs.delete(E.BGs.keys().next().value);
    thumbsSoon();
    return c;
  }
  function ensureBG() { if (d.base === '3d') { bgOf(curF(), plateOf(curF())); req(); } }

  /* ---------- arranque ---------- */
  const roObs = new ResizeObserver(() => sizeStage());
  roObs.observe(stage);
  E.saved_ = new Map();
  const pre = id + '~d~';
  await Promise.all(Object.keys(FRAMES).filter(k => k.startsWith(pre)).map(k => new Promise(res => {
    const im = new Image();
    im.onload = () => { const c = mk(); c.getContext('2d').drawImage(im, 0, 0, DW, DH); c._v0 = c._v; const rkey = k.slice(pre.length); E.R.set(rkey, c); E.saved_.set(rkey, c); res(); };
    im.onerror = () => res();
    im.src = FRAMES[k];
  })));
  if (d._imp && d._imp.length) {
    await Promise.all(d._imp.map(([lid, key]) => new Promise(res => {
      const L = d.layers.find(l => l.id === lid), im = new Image();
      im.onload = () => { const c = ras(L, d.frames[0], true); c.getContext('2d').drawImage(im, 0, 0, DW, DH); c._v++; res(); };
      im.onerror = () => res();
      im.src = FRAMES[key];
    })));
    E.dirty = true;
  }
  delete d._imp;
  // la Viñeta 3D se dibuja una vez por momento: antes, que lleguen las figuras articuladas (si no, quedaría el maniquí simple)
  if (typeof FIG3D !== 'undefined' && FIG3D.ready && !FIG3D.failed) { try { await FIG3D.ready(6000, fig3dBodiesOf([{ ...sh, ws: '3d', d2: null }])); } catch (e) { } E.BGs.clear(); }
  if (d.base === '3d') ensureBG();
  $o('#s2Ld').remove();
  // los cuadros cargados quedan marcados como guardados
  for (const [k, c] of E.R) if (E.saved_.get(k) === c) c._v0 = c._v;
  sizeStage(); frames(); insp(); syncHist();
  if (fresh && !isNew) toast('Espacio 2D: dibuja encima de la viñeta o sobre papel. «3D» arriba vuelve a la escena 3D.', 4600);
}
