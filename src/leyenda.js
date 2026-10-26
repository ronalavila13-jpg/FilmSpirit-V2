/* ============================================================
   APARIENCIA: LOS COLORES DEL PROYECTO (LEYENDAS Y PALETAS) Y LO DE CADA PANTALLA
   · Cada tabla tiene arriba su leyenda: qué representa cada color. Los colores se cambian ahí (tocar el color),
     nunca fila por fila: lo que se resalta (una escena o un evento del plan, una jornada, una tarea) elige un
     color de la leyenda, que tiene su nombre («Toma compleja»).
   · Los colores viven en el proyecto, cada uno con su pestaña (los cambia quien la edita) y salen igual en los PDF
     y los Excel: el plan (día, noche, jornada y cierre, evento y sus resaltados) en P.schedule.legend; el
     calendario (fases y etiquetas) en P.calendar.legend; la nota de la hoja de llamado en P.call.legend; las
     categorías del desglose en P.catCol; la escala de grises en P.meta.mono y la paleta elegida en P.meta.pal.
     Solo se guarda lo que cambió.
   · Lo de cada persona, en su pantalla (ls «screen» y «theme»): el modo (claro u oscuro), el color de las etapas,
     la letra, las barras y el grosor de las líneas. No cambia el proyecto.
   · El panel «Personalización» (antes «Apariencia»: se abre con el botón de la barra de pestañas, en el teléfono desde
     el menú de arriba, y desde la leyenda) tiene las dos cosas separadas: «Tu pantalla» (el modo, las pestañas
     visibles, el color de las etapas, la letra, las barras y las líneas) y «Colores del proyecto» (las paletas, color
     por color y «Mis paletas», guardadas en la cuenta de la persona o, sin cuenta, en este navegador o esta
     computadora). Una paleta no toca la pantalla de nadie.
   ============================================================ */
const LG_HEX = /^#[0-9A-Fa-f]{6}$/;
const lgHexOk = v => typeof v === 'string' && LG_HEX.test(v);
/* los colores de siempre de cada leyenda: [nombre, color, para qué]. Los de siempre son los del tema Pastel; los de
   antes quedan en el tema «Original» */
const LG = {
  plan: {
    d: ['Día', '#FFE9A8', 'Las escenas de día: en la hoja de script y el guion técnico. En el plan de rodaje y la hoja de llamado, la tira de exterior de día.'],
    n: ['Noche', '#C9D8F5', 'Las escenas de noche: en la hoja de script y el guion técnico. En el plan de rodaje y la hoja de llamado, la tira de interior de noche.'],
    // (lote U) las tiras estándar del plan de rodaje: interior de día blanca, exterior de noche verde, amanecer y atardecer rosa
    di: ['Día interior', '#FFFFFF', 'La tira de interior de día en el plan de rodaje y la hoja de llamado.'],
    ne: ['Noche exterior', '#CFE7C6', 'La tira de exterior de noche en el plan de rodaje y la hoja de llamado.'],
    dd: ['Amanecer o atardecer', '#F8CFC4', 'La tira de amanecer y atardecer en el plan de rodaje y la hoja de llamado.'],
    brk: ['Jornada y cierre', '#3A3A3A', 'La barra de cada jornada y su cierre.'],
    ev: ['Evento', '#EFEDEA', 'Traslados, comidas, ensayos y lo demás con hora.'],
  },
  cal: {
    pre: ['Preproducción', '#8FA6E6', 'Las tareas de preproducción.'],
    rod: ['Rodaje', '#E0907D', 'Las jornadas y las tareas de rodaje.'],
    post: ['Posproducción', '#8CBF96', 'Las tareas de posproducción.'],
    otro: ['Otras fechas', '#A3A6AE', 'Estrenos, festivales y otras fechas.'],
  },
  call: { note: ['Nota para el equipo', '#FFE9A0', 'El recuadro de la nota en la hoja de llamado.'] },
};
const LG_SEC = { plan: 'plan', cal: 'calendario', call: 'llamado', cat: 'desglose', tab: 'guion' };
/* el color de cada pestaña (el de Pastel): también el de los PDF y los Excel. Su escala (barra, elegido, tono profundo…)
   sale del color (tabTones) */
/* (octubre de 2026) las pestañas ya no llevan un color propio: el color de la app es el del oficio (día y noche, eventos,
   departamentos, fases y revisiones). Su escala queda neutra —un gris cálido— en la pantalla, los PDF y los Excel; los
   colores de pestaña que un proyecto guardó antes (P.meta.tabc) se conservan pero ya no se usan */
const TAB_NEUTRAL = '#E4E3DF';
const TAB_PASTEL = Object.fromEntries(['build', 'script', 'project', 'lined', 'breakdown', 'scout', 'casting', 'board', 'animatic', 'plan', 'cal', 'budget', 'call', 'sup'].map(k => [k, TAB_NEUTRAL]));
const TAB_COL0 = Object.fromEntries(Object.entries(TAB_PASTEL).map(([k, v]) => [k, [v]]));
const CAT_COL0 = Object.fromEntries(CATS.map(c => [c.id, c.color]));
const SHEET_COL0 = Object.fromEntries(SHEET.map(b => [b.id, b.color]));
/* la paleta para elegir: los colores de las etapas, las tiras y neutros */
const LG_SW = ['#F3CD5B', '#FFD733', '#FFEB99', '#FFBE0B', '#FFA066', '#FAC5BD', '#F58A7B', '#E35A5A',
  '#FF6F8E', '#FFB7C7', '#CFA0D8', '#A291C8', '#93B1EA', '#BAD9FE', '#74B2FD', '#6699EF',
  '#36C6F4', '#9BE3FA', '#7BE6FF', '#9AC6BE', '#CDE3DF', '#4FB57A', '#CFCAC3', '#E7E5E1', '#8A919C', '#222222'];

/* ---------- colores: mezclar y la letra que se lee encima ---------- */
const lgRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lgHexOf = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const lgMix = (a, b, t) => { const A = lgRGB(a), B = lgRGB(b); return lgHexOf(A.map((v, i) => v * t + B[i] * (1 - t))); };
function lgLum(h) { const L = lgRGB(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * L[0] + .7152 * L[1] + .0722 * L[2]; }
/* « dk» si sobre ese color la letra va clara (una fila o una franja de un color oscuro elegido en la leyenda) */
const lgDark = h => lgHexOk(h) && lgInk(h) === '#FFFFFF' ? ' dk' : '';
const lgInk = h => { const Y = lgLum(h); return (Y + .05) / .0634 >= 1.05 / (Y + .05) ? '#1A1A1A' : '#FFFFFF'; };

/* ---------- tonos: escalas en OKLCH (mismo matiz, pasos iguales de luz) ---------- */
const okLin = v => (v /= 255) <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
const okGam = v => 255 * (v <= .0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - .055);
/* #RRGGBB → [L, C, h] */
function okOf(hex) {
  const [r, g, b] = lgRGB(hex).map(okLin);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  const L = .2104542553 * l + .7936177850 * m - .0040720468 * s, A = 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s, B = .0259040371 * l + .7827717662 * m - .8086757660 * s;
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
}
/* [L, C, h] → #RRGGBB; si el color no cabe en la pantalla, baja el croma (no la luz ni el matiz) */
function okHex(L, C, h) {
  L = Math.max(0, Math.min(1, L));
  const lin = c => {
    const A = c * Math.cos(h * Math.PI / 180), B = c * Math.sin(h * Math.PI / 180);
    const l = (L + .3963377774 * A + .2158037573 * B) ** 3, m = (L - .1055613458 * A - .0638541728 * B) ** 3, s = (L - .0894841775 * A - 1.2914855480 * B) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.7076147010 * s];
  };
  const out = v => v.some(x => x < -1e-4 || x > 1 + 1e-4);
  let c = Math.max(0, C), v = lin(c);
  if (out(v)) { let lo = 0, hi = c; for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (out(lin(mid))) hi = mid; else lo = mid; } v = lin(lo); }
  return lgHexOf(v.map(x => okGam(Math.max(0, Math.min(1, x)))));
}
/* contraste WCAG entre dos colores */
const lgContrast = (a, b) => { const A = lgLum(a), B = lgLum(b); return (Math.max(A, B) + .05) / (Math.min(A, B) + .05); };
/* la letra que se lee sobre un color: la de la persona (oscura) si alcanza 4.5:1; si no, blanca */
function toneInk(bg, ink) {
  ink = ink || '#1A1A1A';
  if (lgContrast(bg, ink) >= 4.5) return ink;
  return lgContrast(bg, '#FFFFFF') > lgContrast(bg, ink) ? '#FFFFFF' : ink;
}
/* la escala de una pestaña a partir de su color: la barra (el color, apenas más claro), al pasar el mouse un paso más
   oscuro, lo elegido dos pasos y medio (mismo matiz y el croma más vivo: nada de gris), el tono profundo para títulos y
   acentos, la mesa, el papel y un velo para lo que no está elegido. Una barra oscura (un color propio) va hacia lo claro */
const TONE_STEP = .055, TONES = new Map();
function tabTones(hex, ink) {
  hex = lgHexOk(hex) ? hex.toUpperCase() : '#E5E5E5'; ink = ink || inkNow();
  const key = hex + ink; if (TONES.has(key)) return TONES.get(key);
  const [L, C, h] = okOf(hex), gray = C < .02;
  const Lb = L + (.985 - L) * .16, Cb = C * .86, dir = Lb < .5 ? 1 : -1;
  const bar = okHex(Lb, Cb, h);
  const hov = okHex(Lb + dir * TONE_STEP, gray ? Cb : Cb * 1.2, h);
  const sel = okHex(Lb + dir * TONE_STEP * 2.6, gray ? Cb : Math.min(Math.max(Cb * 1.75, .075), .17), h);
  const deep = gray ? okHex(.27, C * .5, h) : okHex(Math.min(.42, Math.max(.3, L - .3)), Math.min(Math.max(C, .06), .13), h);
  const T = { base: hex, bar, hov, sel, deep, soft: okHex(.958, Math.min(C * .2, .022), h), paper: okHex(.982, Math.min(C * .1, .011), h),
    tint: okHex(L + (.975 - L) * .62, C * .42, h), tint2: okHex(L + (.975 - L) * .28, C * .75, h), line: okHex(.86, Math.min(C * .45, .05), h) };
  T.barInk = toneInk(bar, ink); T.hovInk = toneInk(hov, ink); T.selInk = toneInk(sel, ink);
  TONES.set(key, T);
  return T;
}

/* ---------- leer ---------- */
function lgStore(k, make) {
  if (!P) return null;
  if (k === 'plan') { if (!P.schedule) return null; if (!P.schedule.legend && make) P.schedule.legend = {}; return P.schedule.legend || null; }
  if (k === 'cal') { if (!P.calendar) { if (!make) return null; P.calendar = { tasks: [] }; } if (!P.calendar.legend && make) P.calendar.legend = {}; return P.calendar.legend || null; }
  if (k === 'call') { if (!P.call) { if (!make) return null; P.call = {}; } if (!P.call.legend && make) P.call.legend = {}; return P.call.legend || null; }
  return null;
}
/* el color de una entrada fija de una leyenda (el del proyecto o el de siempre) */
function lgCol(k, key) { const o = lgStore(k), v = o && o[key]; return lgG(lgHexOk(v) ? v : LG[k][key][1]); }
/* Monocromo (P.meta.mono): todo color que importa sale en gris, con su misma luz (los guardados no se pierden: con otro
   tema vuelven): leyendas, resaltados, pestañas, categorías, etapas, tramas… en la pantalla y en los PDF */
const lgMono = () => !!(typeof P !== 'undefined' && P && P.meta && P.meta.mono);
const LGG = new Map();
const lgGray = c => { if (!lgHexOk(c)) return c; let g = LGG.get(c); if (!g) { g = okHex(okOf(c)[0], 0, 0); LGG.set(c, g); } return g; };
let LG_RAW = false;   // los colores guardados, sin pasar a gris (para comparar temas)
const lgG = c => lgMono() && !LG_RAW ? lgGray(c) : c;
/* los colores con nombre que se suman para resaltar */
const lgHl = k => { const o = lgStore(k); return o && Array.isArray(o.hl) ? o.hl.filter(h => h && h.id && lgHexOk(h.c)) : []; };
/* el color con que se resalta algo (una fila, una jornada, una tarea): el de su entrada de la leyenda */
function hlc(x, k = 'plan') {
  if (!x) return '';
  if (x.hl) { const h = lgHl(k).find(h => h.id === x.hl); if (h) return lgG(h.c); }
  return lgHexOk(x.col) ? lgG(x.col) : '';
}
const hlName = (x, k = 'plan') => { const h = x && x.hl && lgHl(k).find(h => h.id === x.hl); return h ? h.name : ''; };
/* la escala neutra de las pestañas (barra, elegido, tono profundo…) para la pantalla, los PDF y los Excel: la misma
   en todas (en monocromo, en grises) */
const tabHex = () => lgG(TAB_NEUTRAL);
const tabTone = () => tabTones(tabHex());
const tabDeep = () => tabTone().deep;
const catHex = id => { const c = P && P.catCol && P.catCol[id]; return lgG(lgHexOk(c) ? c : CAT_COL0[id]); };

/* ---------- quién puede cambiar cada leyenda ---------- */
function lgCan(k) {
  if (!P || UI.readOnly) return false;
  if (typeof SHARE !== 'undefined' && SHARE) {
    if (k === 'cat') return typeof canEditBdAll === 'function' ? canEditBdAll() : canEditSec('desglose');
    return canEditSec(LG_SEC[k]);
  }
  return true;
}
const LG_WHO = { plan: 'el plan de rodaje', cal: 'el calendario', call: 'la hoja de llamado', cat: 'todo el desglose', tab: 'el guion' };

/* ---------- cambiar (pasa por el deshacer, se guarda y se repinta) ---------- */
function lgDo(label, fn) {
  histNote(label);
  fn();
  changed('data');
  render();
}
/* key: una entrada fija («d», «pre»…), «h:<id>» un color con nombre, una pestaña (k «tab») o una categoría (k «cat») */
function lgSet(k, key, c) {
  if (c && !lgHexOk(c)) return;
  c = c ? c.toUpperCase() : '';
  lgDo('Color de la leyenda', () => {
    if (k === 'tab') { const o = { ...((P.meta && P.meta.tabc) || {}) }; if (c && c !== TAB_COL0[key][0]) o[key] = c; else delete o[key]; P.meta.tabc = o; if (!Object.keys(o).length) delete P.meta.tabc; return; }
    if (k === 'cat') { const o = { ...(P.catCol || {}) }; if (c && c !== CAT_COL0[key]) o[key] = c; else delete o[key]; P.catCol = o; if (!Object.keys(o).length) delete P.catCol; return; }
    const L = lgStore(k, true);
    if (key.startsWith('h:')) { const h = (L.hl || []).find(x => x.id === key.slice(2)); if (h && c) h.c = c; return; }
    if (c && c !== LG[k][key][1]) L[key] = c; else delete L[key];
  });
}
function lgHlAdd(k, name, c) {
  let id = '';
  lgDo('Color nuevo en la leyenda', () => {
    const L = lgStore(k, true); L.hl = Array.isArray(L.hl) ? L.hl : [];
    id = uid('h');
    L.hl.push({ id, name: String(name || '').trim().slice(0, 40) || 'Color ' + (L.hl.length + 1), c: c.toUpperCase() });
  });
  return id;
}
function lgHlRename(k, id, name) {
  const h = lgHl(k).find(x => x.id === id); name = String(name || '').trim().slice(0, 40);
  if (!h || !name || h.name === name) return;
  lgDo('Nombre del color', () => { h.name = name; });
}
/* quitar un color con nombre: lo resaltado con él vuelve a su color de siempre */
function lgHlDel(k, id) {
  lgDo('Quitar color de la leyenda', () => {
    const L = lgStore(k, true); L.hl = (L.hl || []).filter(x => x.id !== id);
    const clear = x => { if (x && x.hl === id) delete x.hl; };
    if (k === 'plan') (P.schedule.items || []).forEach(clear);
    if (k === 'cal') ((P.calendar || {}).tasks || []).forEach(clear);
  });
}
/* cuántas cosas usan un color con nombre (para avisar antes de quitarlo) */
const lgHlUses = (k, id) => k === 'plan' ? (P.schedule.items || []).filter(x => x && x.hl === id).length : k === 'cal' ? ((P.calendar || {}).tasks || []).filter(x => x && x.hl === id).length : 0;

/* ---------- versiones anteriores: colores sueltos → colores con nombre en la leyenda ---------- */
function lgHlFor(L, c, name) {
  L.hl = Array.isArray(L.hl) ? L.hl : [];
  let h = L.hl.find(x => x && lgHexOk(x.c) && x.c.toUpperCase() === c.toUpperCase());
  if (!h) { h = { id: uid('h'), name: name || 'Color ' + (L.hl.length + 1), c: c.toUpperCase() }; L.hl.push(h); }
  return h.id;
}
function lgClean(L, keys) {
  const o = L && typeof L === 'object' && !Array.isArray(L) ? L : {};
  for (const k of Object.keys(o)) if (k !== 'hl' && !(keys.includes(k) && lgHexOk(o[k]))) delete o[k];
  if (o.hl !== undefined) {
    o.hl = Array.isArray(o.hl) ? o.hl.filter(h => h && typeof h === 'object' && /^[\w-]{1,40}$/.test(String(h.id || '')) && lgHexOk(h.c)).slice(0, 40)
      .map(h => ({ id: String(h.id), name: String(h.name || '').slice(0, 40) || 'Color', c: h.c.toUpperCase() })) : [];
    if (!o.hl.length) delete o.hl;
  }
  return o;
}
function lgMigrate(Px) {
  const S = Px.schedule;
  if (S && typeof S === 'object') {
    const L = lgClean(S.legend, Object.keys(LG.plan));
    const nm = c => { const r = typeof ROW_COLORS !== 'undefined' && ROW_COLORS.find(x => x[0].toUpperCase() === String(c).toUpperCase()); return r ? r[1] : ''; };
    for (const it of S.items || []) {
      if (!it || typeof it !== 'object') continue;
      if (it.hl != null && !/^[\w-]{1,40}$/.test(String(it.hl))) delete it.hl;
      if (it.col != null) { if (lgHexOk(it.col) && !it.hl) it.hl = lgHlFor(L, it.col, nm(it.col)); delete it.col; }
    }
    // el cierre «blanco» de antes: una jornada clara en la leyenda
    if (S.breakStyle === 'white' && !L.brk) L.brk = '#F2F1EE';
    delete S.breakStyle;
    if (Object.keys(L).length) S.legend = L; else delete S.legend;
  }
  const C = Px.calendar;
  if (C && typeof C === 'object') {
    const L = lgClean(C.legend, Object.keys(LG.cal));
    for (const t of C.tasks || []) {
      if (!t || typeof t !== 'object') continue;
      if (t.hl != null && !/^[\w-]{1,40}$/.test(String(t.hl))) delete t.hl;
      if (t.color != null) { if (lgHexOk(t.color) && !t.hl) t.hl = lgHlFor(L, t.color, colorName(t.color)); delete t.color; }
    }
    if (Object.keys(L).length) C.legend = L; else delete C.legend;
  }
  if (Px.call && typeof Px.call === 'object' && Px.call.legend !== undefined) { const L = lgClean(Px.call.legend, Object.keys(LG.call)); delete L.hl; if (Object.keys(L).length) Px.call.legend = L; else delete Px.call.legend; }
  const hexMap = (o, ok) => { if (!o || typeof o !== 'object' || Array.isArray(o)) return undefined; const r = {}; for (const [k, v] of Object.entries(o)) if (ok(k) && lgHexOk(v)) r[k] = v.toUpperCase(); return Object.keys(r).length ? r : undefined; };
  const cc = hexMap(Px.catCol, k => k in CAT_COL0); if (cc) Px.catCol = cc; else delete Px.catCol;
  if (Px.meta && typeof Px.meta === 'object') { const tc = hexMap(Px.meta.tabc, k => k in TAB_COL0); if (tc) Px.meta.tabc = tc; else delete Px.meta.tabc; if (Px.meta.mono !== true) delete Px.meta.mono;
    if (Px.meta.pal != null && !(typeof Px.meta.pal === 'string' && /^[\w-]{1,40}$/.test(Px.meta.pal))) delete Px.meta.pal; }   // la paleta elegida (su id)
}

/* ---------- pintar con los colores del proyecto ---------- */
/* los colores de la leyenda del proyecto (tiras, cortes, eventos, categorías y cajas), en variables del CSS. (Antes
   también la escala de cada pestaña: ya no hay color por pestaña y su CSS toma la neutra en body) */
function lookApply() {
  const R = document.documentElement, st = R.style, setv = (n, v) => { if (v) st.setProperty(n, v); else st.removeProperty(n); };
  if (!P) return;
  setv('--strip-d', lgCol('plan', 'd')); setv('--strip-n', lgCol('plan', 'n'));
  const brk = lgCol('plan', 'brk');
  setv('--brk-black', brk); setv('--daybreak', brk); setv('--brk-ink-c', lgInk(brk)); setv('--daybreak-ink', lgInk(brk));
  setv('--lg-ev', lgCol('plan', 'ev')); setv('--lg-note', lgCol('call', 'note')); setv('--lg-rod', lgCol('cal', 'rod'));
  // las categorías del desglose (etiquetas, cajas de la hoja, chips, PDF) y las cajas de la hoja de desglose
  for (const c of CATS) c.color = catHex(c.id);
  for (const b of SHEET) { const cc = P.catCol && P.catCol[b.cats[0]]; b.color = lgG(lgHexOk(cc) ? lgMix(cc, '#FFFFFF', .84) : SHEET_COL0[b.id]); }
  // monocromo: las categorías (y lo demás) en grises se distinguen también por el trazo
  R.toggleAttribute('data-mono', lgMono());
  lookRepaint();   // el panel Personalización, si está abierto
}

/* ---------- en tu pantalla (y en los PDF que exportas): tipografía, barras y líneas ----------
   Las letras van en grafito (en la apariencia oscura, claras) y, sobre un color oscuro, blancas solas (toneInk) */
/* sec: el color de las secciones (cada etapa con su color y cada pestaña con su subtono): sólidos (el de siempre) o pastel */
const SCREEN0 = { bars: 'gris', lines: 'normal', font: 'archivo', sec: 'solido' };
/* las líneas, en un solo ajuste: el grosor de las finas y de las gruesas y su tono */
const LINES = { fina: { lt: 'fina', lk: 'fina', ln: 'suave' }, normal: { lt: 'normal', lk: 'normal', ln: 'normal' }, gruesa: { lt: 'gruesa', lk: 'gruesa', ln: 'marcada' } };
/* las tipografías, de la más formal a la más informal: [id, nombre, letra de la interfaz, de los títulos, en los PDF] */
const FONTS = [
  ['formal', 'Clásica', "'Newsreader',Georgia,serif", "'Newsreader',Georgia,serif", 'newsreader'],
  ['sobria', 'Precisa', "'Instrument Sans','Archivo',system-ui,sans-serif", "'Instrument Sans','Archivo',system-ui,sans-serif", 'instrument'],
  ['archivo', 'Neutra', '', '', ''],
  ['compacta', 'Compacta', "'Archivo Narrow','Archivo',system-ui,sans-serif", "'Archivo Narrow','Archivo',system-ui,sans-serif", 'narrow'],
  ['moderna', 'Moderna', "'Bricolage Grotesque','Archivo',system-ui,sans-serif", "'Bricolage Grotesque','Archivo',system-ui,sans-serif", 'bricolage'],
  ['redonda', 'Redonda', "'Rubik','Archivo',system-ui,sans-serif", "'Rubik','Archivo',system-ui,sans-serif", 'rubik'],
  ['informal', 'Informal', "'Shantell Sans','Archivo',system-ui,sans-serif", "'Shantell Sans','Archivo',system-ui,sans-serif", 'shantell'],
];
const fontOf = s => FONTS.find(f => f[0] === (s && s.font)) || FONTS[2];
function screenGet() {
  const s = { ...SCREEN0, ...(ls.get('screen', {}) || {}) };
  // de versiones anteriores: líneas finas, gruesas y su tono por separado
  if (!LINES[s.lines]) s.lines = 'normal';
  if (!(ls.get('screen', {}) || {}).lines && (s.lt || s.lk || s.ln)) s.lines = s.lt === 'gruesa' || s.lk === 'gruesa' || s.ln === 'marcada' ? 'gruesa' : s.lt === 'fina' || s.ln === 'suave' ? 'fina' : 'normal';
  if (!FONTS.some(f => f[0] === s.font)) s.font = 'archivo';
  // las barras: desde la versión 2 de este ajuste, en gris por defecto (antes se guardaba «color» aunque no se eligiera)
  if ((ls.get('screen', {}) || {}).v !== 2 && s.bars === 'color') s.bars = 'gris';
  if (!['gris', 'blanca'].includes(s.bars)) s.bars = 'gris';   // («color» y «suave» eran el color de la pestaña)
  if (!['solido', 'pastel', 'neutro'].includes(s.sec)) s.sec = 'solido';
  return { bars: s.bars, lines: s.lines, font: s.font, sec: s.sec, ...LINES[s.lines] };
}
const inkNow = () => '#222222';
/* las letras secundarias (fechas, notas, ejemplos) salen de la tinta: el mismo matiz, más claras, siempre legibles */
function inkTones(ink) {
  const [L, C, h] = okOf(ink);
  let muted = okHex(Math.max(L, Math.min(.53, L + .3)), C * .55, h);
  for (let i = 0; i < 12 && lgContrast(muted, '#FFFFFF') < 4.6; i++) muted = okHex(okOf(muted)[0] - .02, C * .55, h);
  return { ink, muted, faint: okHex(Math.max(L, .72), C * .35, h) };
}
/* las otras letras (Clásica, Precisa, Compacta, Moderna, Redonda, Informal) se bajan solo si alguien las elige: al abrir la app se cargan
   las tres de siempre. En la web vienen de Google Fonts; el escritorio y el servidor las traen en su fonts.css */
const FONT_URL = { formal: 'Newsreader:opsz,wght@6..72,400..700', sobria: 'Instrument+Sans:wght@400..700', compacta: 'Archivo+Narrow:wght@400..700', moderna: 'Bricolage+Grotesque:opsz,wght@12..96,400..700', redonda: 'Rubik:wght@400..700', informal: 'Shantell+Sans:wght@400..700' };
function fontLoad(id) {
  if (!FONT_URL[id] || !document.querySelector('link[href*="fonts.googleapis.com/css2"]') || document.querySelector(`link[data-font="${id}"]`)) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.font = id;
  l.href = 'https://fonts.googleapis.com/css2?family=' + FONT_URL[id] + '&display=swap';
  document.head.appendChild(l);
}
function screenApply() {
  const s = screenGet(), R = document.documentElement, d = R.dataset, st = R.style;
  fontLoad(s.font);
  for (const k of ['bars', 'lt', 'lk', 'ln']) { if (s[k] && s[k] !== 'normal' && !(k === 'bars' && s[k] === 'gris')) d[k] = s[k]; else delete d[k]; }
  // «Sin color» usa el dibujo de Suaves (data-sec="pastel") con todas las etapas en grises (data-secn: shell.html)
  if (s.sec === 'pastel' || s.sec === 'neutro') d.sec = 'pastel'; else delete d.sec;
  if (s.sec === 'neutro') d.secn = 'neutro'; else delete d.secn;
  delete d.barh;
  const F = fontOf(s);
  if (F[2]) { st.setProperty('--font-ui', F[2]); st.setProperty('--font-display', F[3]); d.font = F[0]; } else { st.removeProperty('--font-ui'); st.removeProperty('--font-display'); delete d.font; }
  for (const n of ['--ink', '--muted', '--faint', '--page-ink', '--strip-ink']) st.removeProperty(n);   // (las letras a elección de antes)
  TONES.clear();
  if (typeof P !== 'undefined' && P) lookApply();
}
function screenSet(k, v) { const s = { ...(ls.get('screen', {}) || {}), ...screenGet() }; s[k] = v; for (const x of ['lt', 'lk', 'ln', 'barh', 'ink', 'inkc']) delete s[x]; ls.set('screen', { v: 2, bars: s.bars, lines: s.lines, font: s.font, sec: s.sec }); screenApply(); if (typeof P !== 'undefined' && P) render(); }
var LOOK_READY = true;   // ui.js (applyLook) vuelve a aplicar las letras al cambiar la apariencia
screenApply();

/* ---------- la leyenda arriba de cada tabla ---------- */
// (lote U) las tiras del plan de rodaje, en su orden y con su nombre ahí
const LG_STRIPS = ['di', 'd', 'n', 'ne', 'dd'];
const LG_STRIP_NAME = { d: 'Día exterior', n: 'Noche interior' };
/* qué colores muestra la leyenda de cada pestaña: [legend, key, nombre, color, para qué] */
function lgItems(tab) {
  const fixed = (k, keys) => keys.map(key => ({ k, key, name: LG[k][key][0], c: lgCol(k, key), hint: LG[k][key][2], fixed: true }));
  const hl = k => lgHl(k).map(h => ({ k, key: 'h:' + h.id, name: h.name, c: h.c, hint: 'Un color tuyo: elígelo al resaltar.', own: true }));
  // (lote U) el plan y la hoja de llamado: las cinco tiras estándar («Día» es la de exterior y «Noche», la de interior)
  const strips = () => fixed('plan', LG_STRIPS).map(x => ({ ...x, name: LG_STRIP_NAME[x.key] || x.name }));
  if (tab === 'plan') return { add: 'plan', list: [...strips(), ...fixed('plan', ['brk', 'ev']), ...hl('plan')] };
  if (tab === 'call') return { list: [...strips(), ...fixed('plan', ['brk', 'ev']), ...hl('plan').filter(x => lgHlUses('plan', x.key.slice(2))), ...fixed('call', ['note'])] };
  if (tab === 'sup') return { list: fixed('plan', ['d', 'n']) };
  if (tab === 'cal') return { add: 'cal', list: [...fixed('cal', ['pre', 'rod', 'post', 'otro']), ...hl('cal')] };
  if (tab === 'breakdown' || tab === 'lined') {
    const used = new Set(Object.values(P.elements || {}).map(e => e && e.cat));
    const cats = CATS.filter(c => used.has(c.id));
    return { list: (cats.length ? cats : CATS).map(c => ({ k: 'cat', key: c.id, name: c.name, c: catHex(c.id), hint: 'Las marcas de esta categoría en el guion rayado, su caja en la hoja de desglose y los PDF.', fixed: true })) };
  }
  return null;
}
function legendHTML(tab, cls) {
  const L = P && lgItems(tab); if (!L || !L.list.length) return '';
  const can = L.list.some(x => lgCan(x.k)) || (L.add && lgCan(L.add));
  return `<div class="lgd${ea(cls ? ' ' + cls : '')}" role="group" aria-label="Leyenda de colores"><span class="lgd-t">Leyenda</span>
    ${L.list.map(x => `<button type="button" class="lgc" data-lg="${ea(x.k)}" data-key="${ea(x.key)}" title="${esc(x.name + (lgCan(x.k) ? ' · cambiar el color' : ''))}" aria-label="${esc(x.name + (lgCan(x.k) ? ': cambiar el color' : ''))}"><i style="--c:${ea(x.c)}"></i>${esc(x.name)}</button>`).join('')}
    ${L.add && lgCan(L.add) ? `<button type="button" class="lgc lgc-add" data-lgadd="${ea(L.add)}" title="Un color nuevo con nombre, para resaltar">+ Color</button>` : ''}
    ${can ? '<span class="lgd-h">Toca un color para cambiarlo en todo el proyecto</span>' : ''}<button type="button" class="linkbtn lgd-pal" data-lk-open="proj" title="La paleta y todos los colores del proyecto">Colores del proyecto…</button></div>`;
}
/* la paleta, el nombre y «Volver al original» de un color de la leyenda */
function lgPop(anchor, k, key) {
  const own = key && key.startsWith('h:'), id = own ? key.slice(2) : '';
  const info = () => {
    if (k === 'tab') return { name: (TAB_NAME && TAB_NAME[key]) || key, c: tabHex(), hint: 'El color de la pestaña: su barra, su mesa, sus PDF y sus Excel.', def: TAB_COL0[key][0] };
    if (k === 'cat') return { name: CAT[key].name, c: catHex(key), hint: 'Las marcas de esta categoría en el guion rayado, su caja en la hoja de desglose y los PDF.', def: CAT_COL0[key] };
    if (own) { const h = lgHl(k).find(x => x.id === id); return h ? { name: h.name, c: h.c, hint: 'Un color tuyo, con su nombre: se elige al resaltar.' } : null; }
    return { name: LG[k][key][0], c: lgCol(k, key), hint: LG[k][key][2], def: LG[k][key][1] };
  };
  const I0 = info(); if (!I0) return;
  const can = lgCan(k);
  const html = () => { const I = info() || I0; return `<div class="lgp">
    <div class="lgp-h"><span class="lgp-sw" style="--c:${ea(I.c)}"></span>${own && can ? `<input type="text" class="lgp-n" value="${esc(I.name)}" maxlength="40" aria-label="Nombre del color">` : `<b>${esc(I.name)}</b>`}</div>
    <p class="lgp-hint">${esc(I.hint)}</p>
    ${can ? `<span class="lgp-l">Del tema</span><div class="lgp-sws" role="group" aria-label="Colores del tema">${lgThemeSw().map(c => `<button type="button" data-sw="${ea(c)}" style="--c:${ea(c)}" aria-label="Color ${ea(c)}" aria-pressed="${ea(c.toUpperCase() === String(I.c).toUpperCase())}"></button>`).join('')}</div>
    <span class="lgp-l">Más colores</span><div class="lgp-sws" role="group" aria-label="Colores">${LG_SW.map(c => `<button type="button" data-sw="${ea(c)}" style="--c:${ea(c)}" aria-label="Color ${ea(c)}" aria-pressed="${ea(c.toUpperCase() === String(I.c).toUpperCase())}"></button>`).join('')}</div>
    <div class="lgp-f"><label class="btn sm lgp-other">Otro color…<input type="color" value="${ea(I.c)}" aria-label="Otro color"></label><span class="grow"></span>
      ${I.def && String(I.c).toUpperCase() !== I.def.toUpperCase() ? '<button type="button" class="linkbtn" data-reset>Restablecer</button>' : ''}
      ${own ? '<button type="button" class="linkbtn lgp-del" data-del>Quitar</button>' : ''}</div>
    <p class="lgp-foot">Cambia en todo el proyecto: la pantalla, los PDF y los Excel, para todo el equipo.</p>`
    : `<p class="lgp-foot">Lo cambia quien edita ${esc(LG_WHO[k] || 'esta pestaña')}.</p>`}</div>`; };
  const p = popover(anchor, html(), p => {
    const repaint = () => { const n = $('.lgp-n', p), had = n && document.activeElement === n; if (had) return; p.innerHTML = html(); };
    p.addEventListener('click', e => {
      const sw = e.target.closest('[data-sw]'); if (sw) { lgSet(k, key, sw.dataset.sw); repaint(); return; }
      if (e.target.closest('[data-reset]')) { lgSet(k, key, ''); repaint(); return; }
      if (e.target.closest('[data-del]')) {
        const n = lgHlUses(k, id);
        closePop();
        const go = () => lgHlDel(k, id);
        if (n && typeof confirmBox === 'function') confirmBox('Quitar el color', `${n === 1 ? 'Una fila resaltada' : n + ' filas resaltadas'} con «${esc(I0.name)}» ${n === 1 ? 'vuelve' : 'vuelven'} a su color de siempre.`, 'Quitar', go);
        else go();
      }
    });
    p.addEventListener('input', e => { const c = e.target.closest('input[type=color]'); if (c) { clearTimeout(p._t); p._t = setTimeout(() => { lgSet(k, key, c.value); }, 120); } });
    p.addEventListener('change', e => { const n = e.target.closest('.lgp-n'); if (n) lgHlRename(k, id, n.value); });
    p.addEventListener('keydown', e => { const n = e.target.closest('.lgp-n'); if (n && e.key === 'Enter') { e.preventDefault(); lgHlRename(k, id, n.value); n.blur(); } });
  });
  return p;
}
/* los colores del tema del proyecto (pestañas y leyendas), sin repetir: para elegir uno de la misma familia */
function lgThemeSw() {
  const out = [], add = c => { c = String(c || '').toUpperCase(); if (lgHexOk(c) && !out.includes(c)) out.push(c); };
  ['d', 'n', 'ev'].forEach(k => add(lgCol('plan', k))); Object.keys(LG.cal).forEach(k => add(lgCol('cal', k))); add(lgCol('call', 'note'));
  return out.slice(0, 26);
}

/* ---------- clic derecho (en el teléfono, mantener el dedo) sobre una barra de color: su color ---------- */
/* la barra de herramientas de la pestaña, una pestaña o una etapa, una barra del calendario */
function lgCtxOf(t) {
  if (!P || !t || !t.closest) return null;
  if (t.closest('input,textarea,select,[contenteditable="true"],.pop,#modal')) return null;
  const cb = t.closest('[data-cal-col]');
  if (cb && UI.tab === 'cal') { const [k, key] = cb.dataset.calCol.split('|'); if (k === 'cal' && (LG.cal[key] || key.startsWith('h:'))) return { el: cb, k, key }; }
  return null;
}
function lgCtxOpen(x, at) {
  if (!lgCan(x.k)) { toast(`Este color lo cambia quien edita ${LG_WHO[x.k] || 'esta pestaña'}.`, 4000); return; }
  lgPop(at, x.k, x.key);
}
document.addEventListener('contextmenu', e => {
  const x = lgCtxOf(e.target); if (!x) return;
  if (Date.now() - LGCTX.touch < 1200) { e.preventDefault(); return; }   // el dedo sostenido ya lo abrió
  if (TOUCHY && x.el.matches('[data-cal-col]')) { e.preventDefault(); return; }   // en el calendario: soltar sin mover
  e.preventDefault();
  lgCtxOpen(x, { left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY });
});
const LGCTX = { touch: 0 };
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  const x = lgCtxOf(e.target); if (!x) return;
  if (x.el.matches('[data-cal-col]')) return;   // en el calendario el dedo sostenido levanta la barra (su color, en su ficha)
  const x0 = e.clientX, y0 = e.clientY;
  const off = () => { clearTimeout(tm); removeEventListener('pointermove', mv, true); removeEventListener('pointerup', off, true); removeEventListener('pointercancel', off, true); };
  const mv = ev => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) off(); };
  const tm = setTimeout(() => {
    off(); LGCTX.touch = Date.now();
    suppressClick();
    lgCtxOpen(x, { left: x0, right: x0, top: y0, bottom: y0 });
  }, 520);
  addEventListener('pointermove', mv, true); addEventListener('pointerup', off, true); addEventListener('pointercancel', off, true);
}, true);

/* un color nuevo con nombre; done(id) recibe el que se creó (p. ej. para resaltar la fila con él) */
function lgNew(anchor, k, done) {
  if (!lgCan(k)) return;
  const used = new Set(lgHl(k).map(h => h.c));
  const first = LG_SW.find(c => !used.has(c) && !Object.values(LG[k]).some(x => x[1] === c)) || LG_SW[5];
  popover(anchor, `<div class="lgp"><div class="lgp-h"><span class="lgp-sw" style="--c:${ea(first)}"></span><input type="text" class="lgp-n" value="" maxlength="40" placeholder="Nombre: p. ej. Toma compleja" aria-label="Nombre del color"></div>
    <p class="lgp-hint">Elige su color: queda en la leyenda con su nombre.</p>
    <div class="lgp-sws" role="group" aria-label="Colores">${LG_SW.map(c => `<button type="button" data-sw="${ea(c)}" style="--c:${ea(c)}" aria-label="Color ${ea(c)}" aria-pressed="${ea(c === first)}"></button>`).join('')}</div>
    <div class="lgp-f"><span class="grow"></span><button type="button" class="btn primary sm" data-ok>Agregar</button></div></div>`, p => {
    let c = first;
    const ok = () => { const name = $('.lgp-n', p).value; closePop(); const id = lgHlAdd(k, name, c); if (done && id) done(id); };
    p.addEventListener('click', e => {
      const sw = e.target.closest('[data-sw]'); if (sw) { c = sw.dataset.sw; $$('[data-sw]', p).forEach(b => b.setAttribute('aria-pressed', String(b === sw))); $('.lgp-sw', p).style.setProperty('--c', c); return; }
      if (e.target.closest('[data-ok]')) ok();
    });
    p.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.closest('.lgp-n')) { e.preventDefault(); ok(); } });
    setTimeout(() => { const n = $('.lgp-n', p); if (n) n.focus(); }, 30);
  });
}
/* elegir con qué color de la leyenda se resalta algo (menú de una fila, de una jornada, ficha de una tarea) */
function hlChooserHTML(k, cur, none = 'Sin resaltar') {
  const list = lgHl(k);
  return `<div class="hlch" role="group" aria-label="Resaltar con un color de la leyenda">
    <button type="button" data-hl="" aria-pressed="${ea(!cur)}"><i class="hlch-0"></i>${esc(none)}</button>
    ${list.map(h => `<button type="button" data-hl="${ea(h.id)}" aria-pressed="${ea(cur === h.id)}"><i style="--c:${ea(h.c)}"></i>${esc(h.name)}</button>`).join('')}
    ${lgCan(k) ? '<button type="button" class="hlch-new" data-hl="+"><i class="hlch-plus"></i>Nuevo color en la leyenda…</button>' : ''}</div>`;
}
document.addEventListener('click', e => {
  const c = e.target.closest && e.target.closest('.lgc[data-lg]');
  if (c) { e.preventDefault(); lgPop(c, c.dataset.lg, c.dataset.key); return; }
  const a = e.target.closest && e.target.closest('[data-lgadd]');
  if (a) { e.preventDefault(); lgNew(a, a.dataset.lgadd); return; }
  const o = e.target.closest && e.target.closest('[data-lk-open]');
  if (o) { e.preventDefault(); lookPanel(o.dataset.lkOpen); }
});

/* ---------- paletas: los colores del proyecto, con un nombre ---------- */
/* Una paleta son los colores de las leyendas fijas (plan, calendario, hoja de llamado), los de las categorías del
   desglose y, en «Escala de grises», el gris. No toca la pantalla de nadie (modo, letra, barras, líneas).
   Estándar es la de siempre (lo que tiene un proyecto sin colores propios); Original, la de las primeras versiones.
   (Los ids son los de cuando se llamaban temas: un proyecto o una cuenta de antes los sigue reconociendo) */
const TH_BUILT = [
  { id: 'pastel', name: 'Estándar', sub: 'la de siempre', plan: {}, cal: {}, call: {}, cat: {} },
  { id: 'original', name: 'Original', sub: 'la de las primeras versiones',
    plan: { d: '#F3CD5B', n: '#93B1EA', brk: '#222222', ev: '#E7E5E1' }, cal: { pre: '#5B7BD5', rod: '#C8563F', post: '#4E8F5A', otro: '#6B6F7A' }, call: { note: '#FFD84D' }, cat: {} },
  { id: 'sobrio', name: 'Sobria', sub: 'tonos apagados',
    plan: { d: '#E3D8AE', n: '#B6C3D6', brk: '#2E2E2E', ev: '#E4E2DE' }, cal: { pre: '#7D8DB0', rod: '#B07A6E', post: '#7FA085', otro: '#8A8D94' }, call: { note: '#EFE3B8' }, cat: {} },
  { id: 'contraste', name: 'Alto contraste', sub: 'se lee de lejos y al sol',
    plan: { d: '#F5C400', n: '#5B86D6', brk: '#000000', ev: '#D9D9D9' }, cal: { pre: '#2F5BD0', rod: '#C23B24', post: '#2E8B45', otro: '#4A4E57' }, call: { note: '#FFD000' }, cat: {} },
  /* en grises (para imprimir en blanco y negro): lo que se distingue por color se distingue por tono y, donde hace falta,
     por el trazo (data-mono) */
  { id: 'mono', name: 'Escala de grises', sub: 'para imprimir en blanco y negro', mono: true,
    plan: { d: '#F4F4F4', n: '#C4C4C4', brk: '#1F1F1F', ev: '#E4E4E4' }, cal: { pre: '#B5B5B5', rod: '#4D4D4D', post: '#858585', otro: '#D2D2D2' }, call: { note: '#E6E6E6' },
    cat: { cast: '#3A3A3A', extras: '#8C8C8C', props: '#5E5E5E', setdress: '#A8A8A8', wardrobe: '#4A4A4A', makeup: '#9A9A9A', vehicles: '#2B2B2B', animals: '#7A7A7A', sfx: '#6B6B6B', vfx: '#555555', sound: '#B8B8B8', equip: '#C6C6C6', stunts: '#404040', weapons: '#666666', notes: '#9E9E9E' } },
];
/* Mis paletas: en la cuenta (web con cuentas) o, sin cuenta, en este navegador o esta computadora (ls «themes»).
   Las que se guardaron como «temas» antes siguen ahí: lo que traían de la pantalla ya no se usa */
const TH = { list: null, busy: null };
const themeApi = () => API();
const palWhere = () => themeApi() ? 'en tu cuenta' : typeof TARGET !== 'undefined' && TARGET === 'desktop' ? 'en esta computadora' : 'en este navegador';
async function themesLoad() {
  if (TH.list) return TH.list;
  if (TH.busy) return TH.busy;
  TH.busy = (async () => {
    let list = ls.get('themes', []);
    if (themeApi()) { try { const r = await apiFetch('GET', '/api/me/themes'); if (r.json && Array.isArray(r.json.themes)) list = r.json.themes; } catch (e) { } }
    TH.list = Array.isArray(list) ? list : []; TH.busy = null; return TH.list;
  })();
  return TH.busy;
}
async function themesSave(list) {
  TH.list = list; ls.set('themes', list);
  if (themeApi()) {
    try { const r = await apiFetch('PUT', '/api/me/themes', { themes: list }); if (r.json && Array.isArray(r.json.themes)) { TH.list = r.json.themes; ls.set('themes', TH.list); } }
    catch (e) { toast('No se pudo guardar en tu cuenta: la paleta queda en este navegador.', 4000); }
  }
  lookPanelPaint();
}
/* los colores de ahora del proyecto, como paleta */
function themeNow(name, id) {
  const pl = lgStore('plan') || {}, ca = lgStore('cal') || {}, cl = lgStore('call') || {};
  const fixed = (L, keys) => Object.fromEntries(keys.filter(k => lgHexOk(L[k])).map(k => [k, L[k]]));
  return { id: id || uid('th'), name: String(name || 'Mi paleta').slice(0, 40), ts: Date.now(),
    plan: { ...fixed(pl, Object.keys(LG.plan)), hl: lgHl('plan').map(h => ({ name: h.name, c: h.c })) },
    cal: { ...fixed(ca, Object.keys(LG.cal)), hl: lgHl('cal').map(h => ({ name: h.name, c: h.c })) },
    call: fixed(cl, ['note']), cat: { ...(P.catCol || {}) }, ...(lgMono() ? { mono: true } : {}) };
}
/* el color de una paleta para una entrada (el de siempre si la paleta no lo trae) */
const palVal = (th, k, key) => { const v = (th[k] || {})[key]; return lgHexOk(v) ? v.toUpperCase() : (k === 'cat' ? CAT_COL0[key] : LG[k][key][1]); };
/* cuántos colores del proyecto no son los de esta paleta: las leyendas fijas y las categorías (los colores con nombre
   para resaltar no cuentan). null: no se compara (una es en grises y la otra no) */
function palDiff(th) {
  if (!P || !th || !!th.mono !== lgMono()) return null;
  LG_RAW = true;
  try {
    const same = (a, b) => String(a || '').toUpperCase() === String(b || '').toUpperCase();
    let n = 0;
    for (const k of ['plan', 'cal', 'call']) for (const key of Object.keys(LG[k])) if (!same(lgCol(k, key), palVal(th, k, key))) n++;
    for (const id of Object.keys(CAT_COL0)) if (!same(catHex(id), palVal(th, 'cat', id))) n++;
    return n;
  } finally { LG_RAW = false; }
}
/* ¿el proyecto tiene tal cual los colores de esta paleta? */
const themeMatch = th => palDiff(th) === 0;
/* la paleta del proyecto: la elegida (P.meta.pal) aunque se le hayan cambiado colores, la que coincide tal cual o,
   sin ninguna de las dos, la más parecida. { th, n }: n colores cambiados */
function palNow() {
  const list = [...TH_BUILT, ...(TH.list || [])], want = P && P.meta && P.meta.pal || 'pastel';
  const pref = list.find(t => t.id === want), np = pref ? palDiff(pref) : null;
  if (np === 0) return { th: pref, n: 0 };
  const exact = list.find(t => palDiff(t) === 0); if (exact) return { th: exact, n: 0 };
  if (np != null && P.meta && P.meta.pal) return { th: pref, n: np };
  let best = null;
  for (const t of list) { const n = palDiff(t); if (n != null && (!best || n < best.n)) best = { th: t, n }; }
  return best || { th: TH_BUILT[0], n: 0 };
}
/* ¿puede cambiar algo de los colores del proyecto? */
const LG_KS = ['plan', 'cal', 'call', 'cat'];
const palCan = () => LG_KS.some(lgCan);
/* quiénes pueden cambiarlos (con el equipo a la vista): sus nombres */
function lgWhoCan() {
  const M = typeof SHARE !== 'undefined' && SHARE && Array.isArray(SHARE.members) ? SHARE.members : [];
  const secs = ['plan', 'calendario', 'llamado', 'desglose'];
  const can = x => typeof permCanEdit === 'function' && secs.some(s => permCanEdit({ admin: false, role: x.role, perms: x.perms || {} }, s));
  return M.filter(x => x && !x.ro && (x.owner || can(x))).map(x => String(x.name || '').trim()).filter(Boolean);
}
const lgAnd = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + (EN ? ' and ' : ' y ') + a[a.length - 1];
function lgWhoCanTxt() {
  if (P && UI.readOnly) return 'Solo puedes mirarlos: el proyecto está abierto solo para mirar.';
  const who = lgWhoCan();
  if (!who.length) return 'Solo puedes mirarlos: los cambia quien edita el plan de rodaje, el calendario, la hoja de llamado o el desglose.';
  return `Solo puedes mirarlos: los cambia ${lgAnd(who.length > 4 ? [...who.slice(0, 3), `${who.length - 3} ${EN ? 'more' : 'más'}`] : who)}.`;
}
/* aplicar una paleta: los colores en lo que se puede editar del proyecto. No toca la pantalla (ni el modo oscuro).
   Se guarda solo lo que no es el de siempre (Estándar) */
function themeApply(th) {
  if (!th || !palCan()) return;
  const skipped = [];
  lgDo(`Paleta «${th.name}»`, () => {
    if (lgCan('tab')) {
      if (th.mono) P.meta.mono = true; else delete P.meta.mono;
      if (th.id === 'pastel') delete P.meta.pal; else P.meta.pal = String(th.id).slice(0, 40);
    } else if (!!th.mono !== lgMono()) skipped.push('tab');
    for (const k of ['plan', 'cal', 'call']) {
      if (!lgCan(k)) { skipped.push(LG_WHO[k]); continue; }
      const L = lgStore(k, true), T = th[k] || {};
      for (const key of Object.keys(LG[k])) { if (lgHexOk(T[key]) && T[key].toUpperCase() !== LG[k][key][1]) L[key] = T[key].toUpperCase(); else delete L[key]; }
      if (Array.isArray(T.hl) && k !== 'call') {
        L.hl = Array.isArray(L.hl) ? L.hl : [];
        for (const h of T.hl) { if (!h || !lgHexOk(h.c)) continue; const ex = L.hl.find(x => x.name.toLowerCase() === String(h.name || '').toLowerCase()); if (ex) ex.c = h.c.toUpperCase(); else L.hl.push({ id: uid('h'), name: String(h.name || 'Color').slice(0, 40), c: h.c.toUpperCase() }); }
        if (!L.hl.length) delete L.hl;
      }
    }
    if (lgCan('cat')) { const c = {}; for (const [k, v] of Object.entries(th.cat || {})) if (k in CAT_COL0 && lgHexOk(v) && v.toUpperCase() !== CAT_COL0[k]) c[k] = v.toUpperCase(); if (Object.keys(c).length) P.catCol = c; else delete P.catCol; } else skipped.push(LG_WHO.cat);
  });
  toastUndo(skipped.length ? `Paleta «${th.name}» aplicada en lo que puedes editar.` : `Paleta «${th.name}» en todo el proyecto.`);
  lookPanelPaint();
}

/* ---------- «Personalización» (antes «Apariencia…»): una columna a la derecha, sin tapar el programa ----------
   (en el teléfono, una hoja abajo, sobre la pantalla). Dos pestañas: «Tu pantalla» (solo para ti) y «Colores del
   proyecto» (para todo el equipo y los PDF) */
const LK = { tab: ls.get('lookTab', 'me') === 'proj' ? 'proj' : 'me', naming: false };
const LK_ICO = {
  me: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  pj: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c.8-3 3.2-5 6-5s5.2 2 6 5M15 14.5c2.6 0 4.6 1.6 5.3 4.5"/></svg>',
  ro: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
};
/* el color de las etapas, en muestra: Vivos (de color entero) y Suaves (tonos claros) */
const LK_SEC = { solido: ['#222222', '#CE0C1C', '#6B6259', '#FFBE0B', '#E8730C'], pastel: ['#E3DFD9', '#F4CACD', '#E2E0DD', '#FFF1C9', '#FCE3CB'], neutro: ['#2A2A2A', '#6E6E6E', '#BDBDBD', '#E6E6E6', '#F5F5F5'] };
/* color por color: los nombres cortos de las entradas fijas */
const LK_CC = [['Plan de rodaje', [['plan', 'di', 'Día interior'], ['plan', 'd', 'Día'], ['plan', 'n', 'Noche'], ['plan', 'ne', 'Noche exterior'], ['plan', 'dd', 'Amanecer o atardecer'], ['plan', 'brk', 'Jornada'], ['plan', 'ev', 'Evento']]],
  ['Calendario', [['cal', 'pre', 'Preproducción'], ['cal', 'rod', 'Rodaje'], ['cal', 'post', 'Posproducción'], ['cal', 'otro', 'Otras']]],
  ['Hoja de llamado', [['call', 'note', 'Nota para el equipo']]]];
function lookPanel(tab) {
  if (tab === 'me' || tab === 'proj') { LK.tab = tab; ls.set('lookTab', tab); }
  let pn = $('#lookPanel');
  if (!pn) {
    pn = document.createElement('aside'); pn.id = 'lookPanel'; pn.className = 'np lk';
    pn.setAttribute('aria-label', 'Personalización');
    document.body.appendChild(pn);
    pn.addEventListener('click', lookClick);
    pn.addEventListener('change', e => { const c = e.target.closest('[data-tabv]'); if (c) tabsPickSet(c.dataset.tabv, c.checked); });   // barra.js
    pn.addEventListener('keydown', e => { const n = e.target.closest('.lk-new input'); if (n && e.key === 'Enter') { e.preventDefault(); lookSaveNew(n.value); } if (n && e.key === 'Escape') { e.preventDefault(); LK.naming = false; lookPanelPaint(); return; } if (e.key === 'Escape' && !$('.pop')) lookClose(); });
  }
  if ($('#notesPanel.open')) npClose();
  closePop();
  if (!$('.lk-scrim')) { const s = document.createElement('div'); s.className = 'lk-scrim'; s.onclick = lookClose; pn.before(s); }   // el velo de atrás, en el teléfono
  pn.classList.add('open'); document.body.classList.add('np-on');
  const tc = $('#tabsCfg'); if (tc) tc.setAttribute('aria-expanded', 'true');
  Object.keys(FONT_URL).forEach(fontLoad);   // para ver cada tipografía en su botón
  dispatchEvent(new Event('resize'));
  lookPanelPaint();
  themesLoad().then(lookPanelPaint);
}
function lookClose() { const pn = $('#lookPanel'); if (!pn) return; pn.classList.remove('open'); $$('.lk-scrim').forEach(s => s.remove()); if (!$('#notesPanel.open')) document.body.classList.remove('np-on'); const tc = $('#tabsCfg'); if (tc) tc.setAttribute('aria-expanded', 'false'); dispatchEvent(new Event('resize')); }
/* el botón de la barra de pestañas: abre el panel en esa pestaña; si ya está abierto en ella, lo cierra */
function lookToggle(tab) { const pn = $('#lookPanel'); if (pn && pn.classList.contains('open') && LK.tab === tab) lookClose(); else lookPanel(tab); }
/* con el panel abierto, lo que cambia en el proyecto (deshacer, un compañero) se ve también en él */
function lookRepaint() {
  const pn = $('#lookPanel'); if (!pn || !pn.classList.contains('open')) return;
  const a = document.activeElement; if (a && pn.contains(a) && a.matches('input')) return;
  cancelAnimationFrame(LK.raf); LK.raf = requestAnimationFrame(lookPanelPaint);
}
function lookPanelPaint() {
  const pn = $('#lookPanel'); if (!pn || !pn.classList.contains('open')) return;
  // sin un proyecto abierto (en Inicio, desde el menú del teléfono) solo «Tu pantalla»: los colores son de un proyecto
  const proj = typeof P !== 'undefined' && !!P && !document.body.classList.contains('home'), tab = proj ? LK.tab : 'me';
  const body = $('.np-body', pn), top = body ? body.scrollTop : 0, same = pn.dataset.tab === tab;
  const tabs = proj ? `<div class="lk-tabs" role="tablist" aria-label="Qué cambiar">${[['me', 'Tu pantalla'], ['proj', 'Colores del proyecto']].map(([k, n]) => `<button type="button" role="tab" data-lkt="${k}" aria-selected="${ea(tab === k)}">${n}</button>`).join('')}</div>` : '';
  pn.innerHTML = `<div class="np-head"><b class="lk-title">Personalización</b><button class="nf-ic" data-lk="close" aria-label="Cerrar">${ICO.close}</button></div>
  <div class="np-body lk-body">${tabs}${tab === 'proj' ? lookProjHTML() : lookMeHTML()}</div>`;
  pn.dataset.tab = tab;
  if (same && top) $('.np-body', pn).scrollTop = top;   // al cambiar algo, el panel no vuelve arriba
  if (LK.naming) setTimeout(() => { const i = $('.lk-new input', pn); if (i) i.focus(); }, 20);
}
/* «Tu pantalla»: solo para esta persona, en este navegador o esta computadora */
function lookMeHTML() {
  const S = screenGet(), mode = ls.get('theme', 'auto');
  const seg = (k, opts, cur, attr = 'scr') => `<div class="seg" role="group">${opts.map(([v, n]) => `<button type="button" data-${attr}="${ea(k)}" data-v="${ea(v)}" aria-pressed="${ea(cur === v)}">${n}</button>`).join('')}</div>`;
  const card = (v, n, sub) => `<button type="button" class="lk-card" data-scr="sec" data-v="${ea(v)}" aria-pressed="${ea(S.sec === v)}"><b>${n}</b><span class="lk-chips">${LK_SEC[v].map(c => `<i style="--c:${ea(c)}"></i>`).join('')}</span><small>${sub}</small></button>`;
  const where = typeof TARGET !== 'undefined' && TARGET === 'desktop' ? 'en esta computadora' : 'en este navegador';
  return `<p class="lk-scope me">${LK_ICO.me}<span>Solo para ti, ${where}. Nadie más lo ve y el proyecto no cambia.</span></p>
    <section><h5>Modo</h5>${seg('theme', [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']], mode, 'mode')}</section>
    ${$('#tabs .stg') ? `<section class="lk-tabsv"><h5>Pestañas visibles</h5>${tabsPickHTML()}
      <p class="hint">Ocultar una pestaña no borra nada: vuelve a marcarla para verla.</p></section>` : ''}
    <section><h5>Color de las etapas</h5><div class="lk-cards">${card('solido', 'Vivos', 'Barras de color entero')}${card('pastel', 'Suaves', 'Tonos claros')}${card('neutro', 'Grafito', 'Sin color, solo grises')}</div></section>
    <section><h5>Letra</h5>
      <div class="lk-fonts" role="group" aria-label="Letra, de la más formal a la más informal">${FONTS.map(([v, n, ui]) => `<button type="button" data-scr="font" data-v="${ea(v)}" aria-pressed="${ea(S.font === v)}" style="${ui ? `font-family:${ea(ui)}` : ''}"><b>Aa</b><span>${esc(n)}</span></button>`).join('')}</div></section>
    <section><h5>Barras y líneas</h5>
      <div class="lk-opt"><span>Barras</span>${seg('bars', [['gris', 'Grises'], ['blanca', 'Blancas']], S.bars)}</div>
      <div class="lk-opt"><span>Líneas</span>${seg('lines', [['fina', 'Finas'], ['normal', 'Normales'], ['gruesa', 'Gruesas']], S.lines)}</div>
      <p class="hint">La letra, las barras y las líneas también se usan en los PDF que tú exportas.</p></section>
    <button type="button" class="linkbtn lk-reset" data-lk="reset-me">Volver a lo de siempre (solo tu pantalla)</button>`;
}
/* «Colores del proyecto»: la paleta, color por color y Mis paletas */
function lookProjHTML() {
  const can = palCan(), cur = palNow(), mine = TH.list || [];
  const shared = typeof SHARE !== 'undefined' && SHARE && (SHARE.members || []).length > 1;
  const strip = th => [['plan', 'd'], ['plan', 'n'], ['plan', 'ev'], ['cal', 'rod'], ['call', 'note']].map(([k, key]) => `<i style="--c:${ea(palVal(th, k, key))}"></i>`).join('');
  const sub = th => cur.th.id === th.id && cur.n ? `con ${cur.n} ${cur.n === 1 ? 'color cambiado' : 'colores cambiados'}` : th.sub || '';
  const row = (th, own) => { const on = cur.th.id === th.id; return `<div class="lk-pal${ea(on ? ' on' : '')}"><button type="button" data-th="${ea(th.id)}" data-own="${own ? 1 : ''}" aria-pressed="${ea(on)}"${can ? '' : ' disabled'}><span class="lk-pn"><b>${esc(th.name)}${on ? ICO.ok : ''}</b>${sub(th) ? `<small>${esc(sub(th))}</small>` : ''}</span><span class="lk-sw" aria-hidden="true">${strip(th)}</span></button>${own ? `<button type="button" class="lk-thm" data-thm="${ea(th.id)}" aria-label="Opciones de la paleta ${esc(th.name)}">${ICO.more}</button>` : ''}</div>`; };
  const cant = LG_KS.filter(k => !lgCan(k)).map(k => LG_WHO[k]);
  const chip = ([k, key, n]) => `<button type="button" class="lk-cc" data-lgk="${ea(k)}" data-key="${ea(key)}" title="${esc(LG[k][key][0] + (lgCan(k) ? ' · cambiar el color' : ''))}"><i style="--c:${ea(lgCol(k, key))}"></i>${esc(n)}</button>`;
  return `<p class="lk-scope pj">${LK_ICO.pj}<span><b data-no-tr>${esc(P.meta.title || '')}</b>: ${shared ? 'lo ve todo el equipo y sale en los PDF y Excel.' : 'se guarda con el proyecto y sale en los PDF y Excel.'}</span></p>
    ${can ? '' : `<p class="lk-scope ro">${LK_ICO.ro}<span>${esc(lgWhoCanTxt())}</span></p>`}
    <section><h5>Paleta</h5><div class="lk-pals" data-trk="paleta">${TH_BUILT.map(th => row(th, false)).join('')}</div>
      <p class="hint">Los cuadritos: día, noche, evento, rodaje y nota. Cambia el plan, el calendario, la hoja de llamado y el desglose.</p>
      ${can && cant.length ? '<p class="hint">Solo cambia lo que puedes editar: lo demás lo cambia quien lo edita.</p>' : ''}</section>
    <section><h5>Color por color</h5>
      ${LK_CC.map(([g, list]) => `<div class="lk-grp"><span>${g}</span><div class="lk-ccs" data-trk="paleta">${list.map(chip).join('')}</div></div>`).join('')}
      <p class="lk-more"><span>${CATS.length} categorías del desglose</span> · <button type="button" class="linkbtn" data-lk="cats">editar en el desglose ›</button></p></section>
    <section><h5>Mis paletas · ${palWhere()}</h5>
      ${mine.length ? `<div class="lk-pals">${mine.map(th => row(th, true)).join('')}</div>` : ''}
      ${LK.naming ? `<div class="lk-new"><input type="text" maxlength="40" placeholder="Nombre de la paleta" aria-label="Nombre de la paleta"><button type="button" class="btn primary sm" data-lk="save">Guardar</button></div>` : `<button type="button" class="lk-add" data-lk="name">+ Guardar esta paleta…</button>`}
      <p class="hint">Para usarla en otro proyecto.</p></section>
    ${can ? '<button type="button" class="linkbtn lk-reset" data-lk="reset-pal">Volver a la paleta Estándar</button>' : ''}`;
}
/* «Volver a lo de siempre (solo tu pantalla)»: el modo, las pestañas visibles (todas), el color de las etapas, la letra,
   las barras y las líneas. No es del proyecto (no pasa por su historial): el aviso trae su propio «Deshacer» */
function lookResetMe() {
  const was = { screen: ls.get('screen', null), theme: ls.get('theme', 'auto'), hidden: ls.get('tabsHidden', []) };
  const put = (screen, theme, hidden) => {
    ls.set('screen', screen); ls.set('theme', theme); ls.set('tabsHidden', hidden);
    screenApply(); applyLook();
    if (typeof P !== 'undefined' && P) { sharePaintTabs(); render(); }
    lookPanelPaint();
  };
  put({ ...SCREEN0, v: 2 }, 'auto', []);
  toast('Tu pantalla volvió a lo de siempre. El proyecto no cambió.', 6500, { label: 'Deshacer', fn: () => put(was.screen || { ...SCREEN0, v: 2 }, was.theme, was.hidden) });
}
async function lookSaveNew(name) {
  name = String(name || '').trim(); if (!name) return;
  LK.naming = false;
  const list = [...(await themesLoad())];
  const th = themeNow(name);
  list.push(th);
  if (lgCan('tab')) { histNote('Paleta guardada'); P.meta.pal = th.id; changed('data'); }   // la del proyecto, con su nombre
  await themesSave(list.slice(-30));
  toast(`Paleta «${name}» guardada ${palWhere()}.`);
}
async function lookClick(e) {
  const b = e.target.closest('[data-lk],[data-lkt],[data-th],[data-thm],[data-scr],[data-mode],[data-lgk]'); if (!b) return;
  if (b.dataset.lk === 'close') { lookClose(); return; }
  if (b.dataset.lkt) { LK.tab = b.dataset.lkt; ls.set('lookTab', LK.tab); LK.naming = false; lookPanelPaint(); const t = $(`#lookPanel [data-lkt="${LK.tab}"]`); if (t) t.focus(); return; }
  if (b.dataset.lk === 'name') { LK.naming = true; lookPanelPaint(); return; }
  if (b.dataset.lk === 'save') { const i = $('#lookPanel .lk-new input'); lookSaveNew(i && i.value); return; }
  if (b.dataset.lk === 'reset-me') { lookResetMe(); return; }
  if (b.dataset.lk === 'reset-pal') { themeApply(TH_BUILT[0]); return; }
  if (b.dataset.lk === 'cats') {   // la leyenda del desglose, abierta: ahí se toca cada categoría
    const PBx = typeof PB !== 'undefined' ? PB : null; if (PBx) { PBx.lgd.breakdown = true; ls.set('lgdOpen', PBx.lgd); }
    if (UI.tab !== 'breakdown') setTab('breakdown'); else render();
    toast('Toca una categoría en la leyenda para cambiar su color.', 4200);
    return;
  }
  if (b.dataset.mode) { ls.set('theme', b.dataset.v); applyLook(); render(); lookPanelPaint(); return; }
  if (b.dataset.scr) { screenSet(b.dataset.scr, b.dataset.v); lookPanelPaint(); return; }
  if (b.dataset.lgk) { lgPop(b, b.dataset.lgk, b.dataset.key); return; }
  if (b.dataset.th) { if (b.disabled) return; const th = b.dataset.own ? (TH.list || []).find(x => x.id === b.dataset.th) : TH_BUILT.find(x => x.id === b.dataset.th); if (th) themeApply(th); return; }
  if (b.dataset.thm) {
    const id = b.dataset.thm, th = (TH.list || []).find(x => x.id === id); if (!th) return;
    popover(b, `<div class="menu"><button data-m="upd">Guardar los colores de ahora en «${esc(th.name)}»</button><button data-m="ren">Cambiar el nombre…</button><button data-m="del">Borrar la paleta</button></div>`, p => p.addEventListener('click', async ev => {
      const m = ev.target.closest('[data-m]'); if (!m) return;
      closePop();
      const list = [...(TH.list || [])], i = list.findIndex(x => x.id === id); if (i < 0) return;
      if (m.dataset.m === 'upd') { list[i] = themeNow(th.name, th.id); await themesSave(list); toast(`Paleta «${th.name}» actualizada.`); }
      if (m.dataset.m === 'ren') {
        popover(b, `<div class="lk-new"><input type="text" maxlength="40" value="${esc(th.name)}" aria-label="Nombre de la paleta"><button type="button" class="btn primary sm" data-ok>Guardar</button></div>`, q => {
          const go = async () => { const v = $('input', q).value.trim(); closePop(); if (v) { list[i] = { ...list[i], name: v }; await themesSave(list); } };
          q.addEventListener('click', ev2 => { if (ev2.target.closest('[data-ok]')) go(); });
          q.addEventListener('keydown', ev2 => { if (ev2.key === 'Enter') { ev2.preventDefault(); go(); } });
          setTimeout(() => { const n = $('input', q); if (n) { n.focus(); n.select(); } }, 20);
        });
      }
      if (m.dataset.m === 'del') { list.splice(i, 1); await themesSave(list); toast(`Paleta «${th.name}» borrada.`); }
    }));
  }
}

/* ---------- en los PDF y en los Excel ---------- */
/* los colores de la leyenda que usa un documento: [nombre, #color] */
function lgDocItems(kind, used) {
  const L = [];
  const add = (name, c) => { if (c && !L.some(x => x[0] === name)) L.push([name, c]); };
  if (kind === 'plan' || kind === 'call' || kind === 'sup' || kind === 'shotlist') {
    if (used.strips && (kind === 'plan' || kind === 'call')) for (const k of LG_STRIPS) { if (used.strips.has(k)) add(LG_STRIP_NAME[k] || LG.plan[k][0], lgCol('plan', k)); }   // (lote U) el plan y la hoja de llamado
    else { if (used.d) add('Día', lgCol('plan', 'd')); if (used.n) add('Noche', lgCol('plan', 'n')); }
    if (kind === 'plan' || kind === 'call') add(LG.plan.brk[0], lgCol('plan', 'brk'));
    if (used.ev) add('Evento', lgCol('plan', 'ev'));
    for (const id of used.hl || []) { const h = lgHl('plan').find(x => x.id === id); if (h) add(h.name, h.c); }
    if (kind === 'call' && used.note) add(LG.call.note[0], lgCol('call', 'note'));
  }
  if (kind === 'calendar') {
    for (const k of Object.keys(LG.cal)) if (used[k]) add(LG.cal[k][0], lgCol('cal', k));
    for (const id of used.hl || []) { const h = lgHl('cal').find(x => x.id === id); if (h) add(h.name, h.c); }
  }
  return L;
}
