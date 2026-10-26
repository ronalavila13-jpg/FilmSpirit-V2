// Lote U · guion: palabras cambiadas en la revisión, resaltador de colores, racha de escritura y anotaciones a mano.
// node --test test/guion-lote-u.test.js
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), vm = require('vm'), path = require('path');
const R = path.join(__dirname, '..', 'src');
const noop = () => { };
function ctx(files, extra = {}) {
  const store = {};
  const c = {
    console, Math, Date, JSON, setTimeout: noop, clearTimeout: noop, setInterval: noop, requestAnimationFrame: noop, cancelAnimationFrame: noop,
    addEventListener: noop, document: { addEventListener: noop, visibilityState: 'visible', hasFocus: () => true }, window: {}, matchMedia: () => ({ matches: false }),
    debounce: f => f, ls: { get: (k, d) => (k in store ? store[k] : d), set: (k, v) => { store[k] = v; } }, UI: { tab: 'script', mode: { tags: true, cov: true } },
    ACT: {}, BIND: {}, RENDER: {}, SETTINGS: {}, HELP: {}, EXPORTS: {}, TOOLS_EXTRA: {}, EN: false, $: () => null, $$: () => [], esc: s => String(s), ea: s => String(s),
    toast: noop, changed: noop, histNote: noop, uid: (() => { let n = 0; return p => (p || 'x') + (++n); })(), SHARE: null, ...extra,
  };
  vm.createContext(c);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(R, f), 'utf8').replace(/if \(typeof module[\s\S]*$/, ''), c, { filename: f });
  return c;
}
const run = (c, js) => vm.runInContext(js, c);
const J = o => JSON.parse(JSON.stringify(o));

/* ---------- 1 · palabras cambiadas con el color de la revisión ---------- */
const ED_FILES = ['core.js', 'guion-editor.js', 'guion-revision.js', 'guion-formato.js'];
function edCtx(paras, rev) {
  const c = ctx(ED_FILES);
  run(c, `var P = { paras: ${JSON.stringify(paras)}, tags: [], shots: {}, scenes: {}, meta: {}, rev: ${JSON.stringify(rev || { on: true, c: 'azul' })} }; var D = {};`);
  return c;
}
test('lo escrito en una revisión queda con su color; lo borrado, con una marquita', () => {
  const c = edCtx([{ t: 'a', x: 'Ana sube una escalera.' }]);
  // escribe « vieja» después de «escalera» (el cursor queda al final de lo escrito)
  run(c, `edSetText(0, 'Ana sube una escalera vieja.', 27)`);
  let p = J(run(c, 'P.paras[0]'));
  assert.deepStrictEqual(p.rvw, [[21, 27, 'azul']]);
  assert.strictEqual(p.x.slice(21, 27), ' vieja');
  assert.strictEqual(p.rv, 'azul', 'el asterisco sigue');
  // un espacio junto a otro: el cursor dice dónde se escribió
  run(c, `edSetText(0, 'Ana  sube una escalera vieja.', 4)`);
  p = J(run(c, 'P.paras[0]'));
  assert.ok(p.rvw.some(r => r[0] === 3 && r[1] === 4), JSON.stringify(p.rvw));
  // revisión rosa: lo azul sigue azul; borrar texto de antes deja la marca rosa
  run(c, `P.rev.c = 'rosa'; edSetText(0, 'Ana  una escalera vieja.', 5)`);
  p = J(run(c, 'P.paras[0]'));
  assert.ok(p.rvw.some(r => r[2] === 'azul'), 'lo de la azul no cambia de color');
  assert.deepStrictEqual(p.rvd, [[5, 'rosa']]);
  // escribir y borrar lo propio en la misma revisión no deja marca de borrado
  run(c, `edSetText(0, 'Ana  una escalera vieja roja.', 28); edSetText(0, 'Ana  una escalera vieja.', 23)`);
  p = J(run(c, 'P.paras[0]'));
  assert.deepStrictEqual(p.rvd, [[5, 'rosa']], JSON.stringify(p));
  assert.ok(!p.rvw.some(r => r[2] === 'rosa'), 'lo escrito y borrado en la rosa no deja tramo');
});
test('sin revisión, los tramos solo se corren con el texto; partir y unir párrafos los reparte', () => {
  const c = edCtx([{ t: 'a', x: 'Uno dos tres', rvw: [[4, 7, 'azul']], rvd: [[12, 'verde']] }], { on: false });
  run(c, `edSetText(0, 'Cero uno dos tres', 5)`);
  let p = J(run(c, 'P.paras[0]'));
  assert.deepStrictEqual(p.rvw, [[9, 12, 'azul']]);
  assert.deepStrictEqual(p.rvd, [[17, 'verde']]);
  assert.strictEqual(p.rv, undefined, 'sin revisión no hay asterisco');
  run(c, `edSplit(0, 9)`);
  const ps = J(run(c, 'P.paras'));
  assert.strictEqual(ps[0].rvw, undefined); assert.deepStrictEqual(ps[1].rvw, [[0, 3, 'azul']]); assert.deepStrictEqual(ps[1].rvd, [[8, 'verde']]);
  run(c, `edMerge(1)`);
  p = J(run(c, 'P.paras[0]'));
  assert.deepStrictEqual([p.x, p.rvw, p.rvd], ['Cero uno dos tres', [[9, 12, 'azul']], [[17, 'verde']]]);
});
test('cambiar el tipo de párrafo solo deja el asterisco; un párrafo nuevo es todo nuevo', () => {
  const c = edCtx([{ t: 'h', x: 'INT. CASA - DÍA', n: '1' }, { t: 'a', x: 'ana' }]);
  run(c, `edSetType(1, 'c')`);
  let p = J(run(c, 'P.paras[1]'));
  assert.deepStrictEqual([p.x, p.rv, p.rvw], ['ANA', 'azul', undefined]);
  run(c, `edInsert(2, [{ t: 'd', x: 'Hola.' }, { t: 'a', x: 'resto', _keep: 1 }])`);
  const ps = J(run(c, 'P.paras'));
  assert.deepStrictEqual(ps[2].rvw, [[0, 5, 'azul']]);
  assert.strictEqual(ps[3].rvw, undefined, 'lo que solo se movió no se marca');
  assert.strictEqual(ps[3]._keep, undefined);
});
test('en pantalla, el tramo se amplía a palabras completas (sin pisar el tramo vecino)', () => {
  const c = edCtx([{ t: 'a', x: '' }]);
  const W = (x, l) => J(run(c, `rvwWords(${JSON.stringify(x)}, ${JSON.stringify(l)})`));
  assert.deepStrictEqual(W('una escalera de metal y', [[12, 21, 'rosa']]), [[13, 21, 'rosa']]);   // « de metal» → «de metal»
  assert.deepStrictEqual(W('holamundo', [[2, 3, 'azul']]), [[0, 9, 'azul']]);
  assert.deepStrictEqual(W('abcdef', [[0, 3, 'azul'], [3, 6, 'rosa']]), [[0, 3, 'azul'], [3, 6, 'rosa']]);
  assert.deepStrictEqual(W('hola, mundo', [[4, 5, 'azul']]), [[0, 5, 'azul']], 'una coma: con la palabra pegada');
});

/* ---------- 2 · resaltador de seis colores ---------- */
test('resaltador: otro color encima lo cambia; el mismo lo quita; lo viejo sigue amarillo; no sale en Fountain', () => {
  const c = edCtx([{ t: 'a', x: 'Ana corre por el pasillo.', fm: { h: [[0, 3]], b: [[4, 9]] } }]);
  assert.strictEqual(run(c, `fmtHlPaint([[P.paras[0], 0, 9]], 'g')`), true);
  let fm = J(run(c, 'P.paras[0].fm'));
  assert.deepStrictEqual(fm, { b: [[4, 9]], g: [[0, 9]] }, 'el amarillo se cambió por verde, la negrita queda');
  run(c, `fmtHlPaint([[P.paras[0], 4, 9]], 'l')`);
  fm = J(run(c, 'P.paras[0].fm'));
  assert.deepStrictEqual([fm.g, fm.l], [[[0, 4]], [[4, 9]]]);
  assert.strictEqual(run(c, `fmtHlPaint([[P.paras[0], 4, 9]], 'l')`), false, 'el mismo color lo quita');
  assert.strictEqual(J(run(c, 'P.paras[0].fm')).l, undefined);
  run(c, `fmtHlPaint([[P.paras[0], 0, 25]], null)`);
  fm = J(run(c, 'P.paras[0].fm'));
  assert.deepStrictEqual(fm, { b: [[4, 9]] }, 'quitar resaltado quita todos los colores');
  run(c, `fmtHlPaint([[P.paras[0], 10, 13]], 'o')`);
  assert.strictEqual(run(c, 'fmtFountain(P.paras[0])'), 'Ana **corre** por el pasillo.');
  assert.strictEqual(run(c, `fmtCls('bo')`), 'fm fm-b fm-o');
});

/* ---------- 11 · racha de escritura ---------- */
function wk() {
  const c = ctx(['guion-racha.js'], { API: () => false, P: null });
  return c;
}
const iso = t => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
const day = (base, n) => { const t = new Date(base + 'T12:00:00'); t.setDate(t.getDate() + n); return iso(t); };
test('racha: días seguidos con la meta; un día de descanso por semana no la corta; hoy sin escribir no la corta aún', () => {
  const c = wk(), today = '2026-10-29';   // jueves
  const rec = days => ({ goal: { w: 100, m: 15 }, days, names: {}, best: 0, got: {} });
  const S = (r, t = today) => J(run(c, `wkStreak(${JSON.stringify(r)}, ${JSON.stringify(t)})`));
  const met = { w: 150, ws: 60, ts: 0 }, time = { w: 10, ws: 16 * 60, ts: 0 }, little = { w: 30, ws: 60, ts: 0 };
  // lun 26, mar 27, mié 28 cumplidos (uno solo por tiempo); hoy (jue 29) aún no
  let s = S(rec({ '2026-10-26': met, '2026-10-27': time, '2026-10-28': met, '2026-10-29': little }));
  assert.deepStrictEqual([s.n, s.state, s.today], [3, 'low', false]);
  // hoy cumplido: encendida
  s = S(rec({ '2026-10-26': met, '2026-10-27': time, '2026-10-28': met, '2026-10-29': met }));
  assert.deepStrictEqual([s.n, s.state], [4, 'on']);
  // un día sin escribir en la semana (el martes): descanso, no corta
  s = S(rec({ '2026-10-23': met, '2026-10-24': met, '2026-10-25': met, '2026-10-26': met, '2026-10-28': met, '2026-10-29': met }));
  assert.deepStrictEqual([s.n, s.state, s.rest], [6, 'on', ['2026-10-27']]);
  // dos días sin escribir en la misma semana: se corta en el segundo
  s = S(rec({ '2026-10-24': met, '2026-10-25': met, '2026-10-27': met, '2026-10-29': met }));
  assert.deepStrictEqual([s.n, s.rest], [2, ['2026-10-28']]);
  // ayer y antes de ayer sin escribir (misma semana): apagada
  s = S(rec({ '2026-10-26': met }));
  assert.deepStrictEqual([s.n, s.state], [0, 'off']);
});
test('racha: lo escrito se suma por día y por guion, lo pegado no cuenta, y la meta se puede cambiar', () => {
  const c = wk();
  run(c, `var P = { id: 'p1', meta: { title: 'Alto riesgo' } }; WK.rec = wkClean(null); WK.key = 'escritura';`);
  run(c, `wkDelta(60); wkCommit(); wkDelta(-10); wkCommit(); wkSkipNext(); wkDelta(5000); wkCommit(); wkAdd(0, 90, 30);`);
  const r = J(run(c, 'WK.rec.days[wkToday()]'));
  assert.deepStrictEqual([r.w, r.ws, r.ts, r.s.p1], [50, 90, 30, [50, 90, 30]]);
  assert.strictEqual(J(run(c, 'WK.rec.names')).p1, 'Alto riesgo');
  assert.strictEqual(run(c, 'wkWords("¿Dónde está l’Ana? Son las 5 y 30.")'), 8);
  const cl = J(run(c, `wkClean({ goal: { w: 'x', m: 900 }, days: { 'no': {}, '2026-10-01': { w: 'x', ws: 99999, s: { 'mal id': [1] } } }, got: { 3: 'ayer', 7: '2026-10-02' } })`));
  assert.deepStrictEqual(cl.goal, { w: 100, m: 600 });
  assert.deepStrictEqual(Object.keys(cl.days), ['2026-10-01']);
  assert.deepStrictEqual(cl.days['2026-10-01'], { w: 0, ws: 86400, ts: 0 });
  assert.deepStrictEqual(cl.got, { 7: '2026-10-02' });
});
test('racha: lo que suma el navegador y lo que suma el servidor dan lo mismo', () => {
  const c = wk(), srv = require('../server/lib/escritura.js');
  const d = iso(new Date());
  const adds = [{ d, pid: 'p1', t: 'Uno', w: 120, ws: 40, ts: 10 }, { d, pid: 'p2', t: 'Dos', w: -5, ws: 5, ts: 0 }, { d, pid: 'p1', w: 3, ws: 1, ts: 2 }];
  const local = J(run(c, `(() => { const R = wkClean(null); for (const a of ${JSON.stringify(adds)}) wkApply(R, a); return R; })()`));
  const server = srv.merge(null, { add: adds });
  assert.deepStrictEqual(local.days, server.days);
  assert.deepStrictEqual(local.names, server.names);
});

/* ---------- 12 · anotaciones a mano ---------- */
function anoCtx(paras) {
  const c = ctx(['core.js', 'guion-margen.js', 'guion-anotar.js'], { UI: { tab: 'lined', mode: { tags: true, cov: true } }, edFormat: () => 'cine', canWriteNotes: () => true, noteMe: () => ({ id: 'yo', name: 'Tú' }), noteMine: n => n.by === 'yo', noteCanRead: () => true, pageLabel: (p, i) => String(i + 1) });
  run(c, `var P = { paras: ${JSON.stringify(paras)}, notes: {}, tags: [], shots: {}, meta: {} }; var NOTES = () => P.notes; var D = {};
    function derive0() { const sc = computeScenes(P.paras), pages = layoutScript(P.paras), pos = new Array(P.paras.length);
      pages.forEach((pg, pi) => pg.forEach((ln, li) => { if (ln.blank) return; const q = pos[ln.p]; if (!q) pos[ln.p] = { pg0: pi, li0: li, pg1: pi, li1: li }; else { q.pg1 = pi; q.li1 = li; } }));
      D = { sc, pages, pos }; }
    derive0();`);
  return c;
}
test('anotación: se limpia como en el servidor', () => {
  const c = anoCtx([{ t: 'a', x: 'Hola.' }]);
  const on = { t: 'ink', p: 2.7, o: -1, q: 5, s: [{ k: 'p', c: 'r', w: 2, d: [1.4, 2, 3, 4], z: [10, 120] }, { k: 'x', d: [1, 2] }, { k: 't', c: 'zz', w: 7, d: [5, 5], tx: ' ' }, { k: 'a', c: 'b', w: 1, d: [0, 0, 10, 10, 5] }, { k: 't', c: 'g', w: 1, d: [5, 5], tx: 'Ojo' }] };
  assert.strictEqual(run(c, `(() => { const on = ${JSON.stringify(on)}; const ok = anoCleanOn(on); this.on1 = on; return ok; })()`), true);
  const o = J(run(c, 'this.on1'));
  assert.deepStrictEqual(o.s, [{ k: 'p', c: 'r', w: 2, d: [1, 2, 3, 4], z: [10, 100] }, { k: 't', c: 'g', w: 1, d: [5, 5], tx: 'Ojo' }]);
  assert.deepStrictEqual([o.p, o.o, o.q], [3, 0, '']);
  assert.strictEqual(run(c, `anoCleanOn({ s: [{ k: 'p', d: [] }] })`), false, 'sin trazos válidos, se va');
});
test('anotación: va pegada a su renglón, se mueve con el texto y, si el párrafo desaparece, va al más cercano', () => {
  const c = anoCtx([{ t: 'h', x: 'INT. CASA - DÍA', n: '1' }, { t: 'a', x: 'Ana entra a la cocina.' }, { t: 'a', x: 'Pela papas en silencio.' }, { t: 'a', x: 'Suena el teléfono.' }]);
  // un trazo sobre el renglón de «Pela papas…» (párrafo 2): en la página, 6 + su renglón
  const li = run(c, 'D.pos[2].li0');
  run(c, `anoAdd(0, { k: 'p', c: 'b', w: 1, d: [100, ${(6 + li) * 100 + 40}, 900, ${(6 + li) * 100 + 60}] })`);
  const n = J(run(c, 'Object.values(P.notes)[0]'));
  assert.deepStrictEqual([n.on.t, n.on.p, n.on.o, n.on.q.slice(0, 10)], ['ink', 2, 0, 'Pela papas']);
  assert.deepStrictEqual(n.on.s[0].d, [100, 40, 900, 60], 'la posición es relativa al renglón');
  assert.strictEqual(n.by, 'yo');
  // se agregan dos párrafos antes: la anotación baja con su texto
  run(c, `P.paras.splice(1, 0, { t: 'a', x: 'Llueve.' }, { t: 'a', x: 'Truena.' }); derive0();`);
  let L = J(run(c, `anoLine(Object.values(P.notes)[0].on)`));
  assert.strictEqual(L.li, run(c, 'D.pos[4].li0'));
  // el párrafo desaparece: se pega al más cercano
  run(c, `P.paras.splice(4, 1); derive0();`);
  L = J(run(c, `anoLine(Object.values(P.notes)[0].on)`));
  assert.ok(L && L.pg === 0, 'sigue en la página');
});
test('anotación: la flecha sigue el gesto (recta o curva) y el trazo se simplifica sin perder sus puntas', () => {
  const c = anoCtx([{ t: 'a', x: 'Hola.' }]);
  run(c, `ANOT.c = 'b'; ANOT.w = 2;`);
  const straight = J(run(c, `anoArrowFrom([[0, 0], [100, 2], [200, 1], [300, 0]])`));
  assert.deepStrictEqual(straight.d, [0, 0, 300, 0]);
  const curved = J(run(c, `anoArrowFrom([[0, 0], [100, 120], [200, 120], [300, 0]])`));
  assert.strictEqual(curved.d.length, 6, 'curva: lleva su punto de control');
  const keep = J(run(c, `anoSimplify([[0,0],[1,0],[2,0],[3,0],[4,5],[5,0],[6,0]], 1)`));
  assert.deepStrictEqual([keep[0], keep[keep.length - 1]], [0, 6]);
  assert.ok(keep.includes(4) && keep.length < 7, JSON.stringify(keep));
});
