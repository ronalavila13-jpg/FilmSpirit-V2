/* Lote AD · zoom: el pellizco con dos dedos sobre la hoja del guion (bindPinch en tab-script.js) con una hoja de
   mentira que se agranda con la letra, como la de verdad.  node test/zoom-ad.test.js */
const vm = require('vm'), assert = require('assert');
const { pieza, leer } = require('./utiles/fuente.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg}: ${a} y ${b}`);

/* ---------- una vista de mentira: el desplazador (390 × 700, arriba a los 100 px) con 5 hojas de 51 × 66 em ---------- */
function vista() {
  const V = { z: 1, frames: [] };
  const fs = () => 7.5 * V.z, CW = 390, CH = 700, TOP = 100, N = 5;
  const pagesW = () => Math.max(CW, 51 * fs() + 24), pagesH = () => 44 + N * 66 * fs() + (N - 1) * 22;
  const ext = () => V.sp ? [Math.max(pagesW(), parseFloat(V.sp.style.left) + 1), Math.max(pagesH(), parseFloat(V.sp.style.top) + 1)] : [pagesW(), pagesH()];
  let sl = 0, st = 0;
  const pages = Array.from({ length: N }, (_, i) => {
    const pg = { i, isConnected: true, closest: s => s.includes('.page') ? pg : null,
      box: () => ({ x: (pagesW() - 51 * fs()) / 2, y: 22 + i * (66 * fs() + 22), w: 51 * fs(), h: 66 * fs() }),
      getBoundingClientRect() { const b = pg.box(), left = b.x - sl, top = TOP + b.y - st; return { left, top, width: b.w, height: b.h, right: left + b.w, bottom: top + b.h }; } };
    return pg;
  });
  const host = { style: {}, offsetLeft: 0, offsetTop: 0, getBoundingClientRect: () => ({}) };
  const H = {};
  const sc = {
    clientWidth: CW, clientHeight: CH, clientLeft: 0, clientTop: 0,
    get scrollWidth() { return ext()[0]; }, get scrollHeight() { return ext()[1]; },
    get scrollLeft() { return sl; }, set scrollLeft(v) { sl = Math.max(0, Math.min(ext()[0] - CW, v)); },
    get scrollTop() { return st; }, set scrollTop(v) { st = Math.max(0, Math.min(ext()[1] - CH, v)); },
    getBoundingClientRect: () => ({ left: 0, top: TOP, width: CW, height: CH }),
    addEventListener: (t, f) => { H[t] = f; }, contains: () => true, querySelectorAll: () => pages,
    appendChild: el => { V.sp = el; el.remove = () => { V.sp = null; }; },
  };
  const root = { scrollLeft: 0, scrollTop: 0, scrollTo(x, y) { this.scrollLeft = x; this.scrollTop = y; } };
  const c = { Math, Date, Infinity, BARS_T: 0, clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    requestAnimationFrame: f => { V.frames.push(f); return V.frames.length; }, cancelAnimationFrame: () => { }, setTimeout: () => 0, clearTimeout: () => { },
    document: { scrollingElement: root, documentElement: root, createElement: () => ({ style: {}, setAttribute() { } }),
      elementFromPoint: (x, y) => pages.find(p => { const r = p.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }) || null } };
  vm.createContext(c);
  vm.runInContext(pieza('tab-script.js', 'const barsHold') + pieza('tab-script.js', 'function bindPinch('), c);
  const o = { host: () => host, anchors: '.page', reflow: false, min: () => .5, max: () => 4, get: () => V.z, set: z => { V.z = z; } };
  c.bindPinch(sc, o);
  const ev = (t, pts) => { const e = { touches: pts.map(([x, y]) => ({ clientX: x, clientY: y })), cancelable: true, dp: false, preventDefault() { this.dp = true; } }; H[t](e); return e; };
  const flush = () => { const f = V.frames.splice(0); f.forEach(g => g()); };
  // el punto de la hoja bajo un punto de la pantalla: [hoja, fracción x, fracción y]
  const hoja = (x, y) => { const p = c.document.elementFromPoint(x, y); if (!p) return null; const r = p.getBoundingClientRect(); return [p.i, (x - r.left) / r.width, (y - r.top) / r.height]; };
  return Object.assign(V, { sc, host, root, ctx: c, ev, flush, hoja, o, scroll: (x, y) => { sc.scrollLeft = x; sc.scrollTop = y; } });
}
// dos dedos alrededor de (x, y), separados d0 → d1 en «pasos», corriéndose (px, py)
function pellizco(V, x, y, d0, d1, px = 0, py = 0, pasos = 8, soltar = true) {
  const pts = (d, k) => [[x + px * k - d / 2, y + py * k], [x + px * k + d / 2, y + py * k]];
  const e0 = V.ev('touchstart', pts(d0, 0)); const moves = [];
  for (let i = 1; i <= pasos; i++) { moves.push(V.ev('touchmove', pts(d0 + (d1 - d0) * i / pasos, i / pasos))); V.flush(); }
  if (soltar) V.ev('touchend', []);
  return { e0, moves };
}

test('acercar: la letra crece en la proporción de los dedos y lo que estaba entre ellos queda bajo los dedos', () => {
  const V = vista(); V.scroll(0, 600);
  const antes = V.hoja(200, 400);
  const { e0, moves } = pellizco(V, 200, 400, 80, 200);
  near(V.z, 2.5, 1e-9, 'zoom');
  assert(e0.dp && moves.every(m => m.dp), 'el navegador no hace su propio zoom: preventDefault con dos dedos');
  const despues = V.hoja(200, 400);
  assert.strictEqual(despues[0], antes[0], 'la misma hoja');
  near(despues[1], antes[1], .002, 'x dentro de la hoja'); near(despues[2], antes[2], .002, 'y dentro de la hoja');
  assert.strictEqual(V.host.style.transform, '', 'al soltar, la hoja ya no está escalada');
  assert(!V.sp, 'el relleno del gesto se quita');
});
test('a medio gesto la hoja solo se escala (sin cambiar la letra) y el punto sigue a los dedos aunque se corran', () => {
  const V = vista(); V.scroll(0, 900);
  const a = [V.sc.scrollLeft + 180, V.sc.scrollTop + 450 - 100];   // el punto del contenido entre los dedos al empezar
  pellizco(V, 180, 450, 100, 150, 30, -40, 6, false);
  assert.strictEqual(V.z, 1, 'la letra cambia recién al soltar');
  const m = /translate\(([-\d.]+)px,([-\d.]+)px\) scale\(([\d.]+)\)/.exec(V.host.style.transform);
  assert(m, 'escala con una transformación: ' + V.host.style.transform);
  const [tx, ty, k] = m.slice(1).map(Number);
  near(k, 1.5, 1e-3, 'escala');
  near(tx + k * a[0] - V.sc.scrollLeft, 210, .2, 'x en pantalla'); near(100 + ty + k * a[1] - V.sc.scrollTop, 410, .2, 'y en pantalla');
  assert(V.sp, 'mientras dura, lo que se desplaza no se achica');
  V.ev('touchend', []);
  near(V.z, 1.5, 1e-9, 'al soltar, la letra');
});
test('dos dedos que no se separan solo desplazan la hoja', () => {
  const V = vista(); V.scroll(0, 800);
  pellizco(V, 200, 500, 120, 120, 0, -150);
  assert.strictEqual(V.z, 1);
  near(V.sc.scrollTop, 950, .5, 'bajó lo que subieron los dedos');
});
test('el zoom no pasa de 50 % ni de 400 %', () => {
  const V = vista(); pellizco(V, 200, 400, 40, 600); assert.strictEqual(V.z, 4);
  const W = vista(); pellizco(W, 200, 400, 600, 20); assert.strictEqual(W.z, .5);
});
test('alejar arriba del todo: el borde no deja sostener el punto y la hoja se acomoda deslizándose, no de golpe', () => {
  const V = vista(); V.scroll(0, 0);
  pellizco(V, 200, 160, 200, 100);
  near(V.z, .5, 1e-9, 'zoom');
  assert.strictEqual(V.sc.scrollTop, 0);
  assert(/transform \.18s/.test(V.host.style.transition || ''), 'se desliza a su lugar: ' + V.host.style.transition);
});
test('la página entera no se mueve durante el gesto y la barra de arriba no se esconde', () => {
  const V = vista(); V.scroll(0, 600);
  V.ev('touchstart', [[150, 400], [250, 400]]);
  V.root.scrollTop = 40; V.root.scrollLeft = 12;   // algo (el navegador) corre la página
  V.ev('touchmove', [[120, 400], [280, 400]]); V.flush();
  assert.deepStrictEqual([V.root.scrollLeft, V.root.scrollTop], [0, 0]);
  assert(Date.now() - V.ctx.BARS_T < 1000, 'barsAutoHide no cuenta este desplazamiento');
  V.ev('touchend', []);
});
test('con un dedo no hace nada (el navegador desplaza la hoja)', () => {
  const V = vista(); V.scroll(0, 300);
  const e = V.ev('touchstart', [[200, 400]]), m = V.ev('touchmove', [[200, 300]]); V.ev('touchend', []);
  assert(!e.dp && !m.dp && V.z === 1 && V.host.style.transform === undefined);
});

/* ---------- lo que hace falta en el CSS y en las vistas ---------- */
const css = leer('shell.html');
test('en el teléfono la letra de la hoja la pone el CSS (con !important): el zoom la multiplica', () => {
  assert(/\.pages:not\(\.av-pages\)\{--fs:calc\(\(100vw - 24px\) \/ 39\.5 \* var\(--pz,1\)\) !important\}/.test(css));
  assert(/pages\.style\.setProperty\('--pz', UI\.zoom\)/.test(leer('tab-script.js')));
  assert(/\.av-page\{[^}]*font-size:calc\(var\(--fs-3\) \* var\(--pz,1\)\)/.test(css), 'el guion AV rayado también');
});
test('la hoja no se corre de lado: las capas que pasan la hoja no agrandan lo que se desplaza', () => {
  assert(/\.pages:not\(\.av-pages\)\{width:max-content;min-width:100%\}/.test(css));
  assert(/\.pages\{overflow:clip\}/.test(css));
});
test('el navegador no hace zoom de página ni rebota sobre la hoja, el editor y el calendario', () => {
  assert(/#scroller,#edScroll\{touch-action:pan-x pan-y;overscroll-behavior:contain\}/.test(css));
  assert(/\.cal-sc\{touch-action:pan-x pan-y;overscroll-behavior:contain\}/.test(css));
  assert(/if \(e\.cancelable\) e\.preventDefault\(\);   \/\/ el segundo dedo/.test(leer('tab-cal.js')));
});
test('el editor del guion también se pellizca: la letra cambia con --ez y en el iPhone no baja de 16 px', () => {
  const s = leer('tab-script.js');
  assert(/bindEditorDoc\(\); bindReview\(\); bindEdPinch\(\);/.test(s));
  assert(/font-size:calc\(var\(--fs,15px\) \* var\(--ez,1\)\)/.test(css) && /\.ed-page\{padding:2\.2em \.9em 4em 2\.1em;font-size:calc\(16px \* var\(--ez,1\)\)\}/.test(css));
  const c = { CSS: { supports: () => true }, matchMedia: () => ({ matches: true }) };
  vm.createContext(c); vm.runInContext(pieza('tab-script.js', 'const ED_ZMIN'), c);
  assert.strictEqual(c.ED_ZMIN(), 1);
  c.matchMedia = () => ({ matches: false }); assert.strictEqual(c.ED_ZMIN(), .6);
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
