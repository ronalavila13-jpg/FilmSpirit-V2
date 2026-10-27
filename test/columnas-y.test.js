/* Lote Y · el ancho de cada columna del stripboard, guardado en el proyecto (P.schedule.colW, en px): la plantilla de la
   grilla con los anchos guardados, sus límites, las asas de los títulos y guardar o quitar un ancho (plan-columnas.js;
   los títulos, en tab-plan.js). (lote AC) Los anchos se limpian al abrir el proyecto (normalizeProject) y las celdas
   con ancho propio llevan data-cw.  node test/columnas-y.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message, (e.stack.split('\n').find(l => l.includes('columnas-y')) || '').trim()); } };
// saca una función de un archivo de la app por su comienzo, hasta la línea que la cierra
const grab = (file, start, end = '\n}\n') => { const s = fs.readFileSync(R + '/src/' + file, 'utf8'), a = s.indexOf(start); assert(a >= 0, start); return s.slice(a, s.indexOf(end, a) + end.length); };

const c = { console, Math, JSON, Map, Set, String, Object, Array, Number };
vm.createContext(c);
vm.runInContext(`var P = { id: 'p1', schedule: { items: [] } }, LS = {}, ls = { get: (k, d) => k in LS ? LS[k] : d };
  var ea = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'), EDIT = true, planEditable = () => EDIT, planSortedBy = () => false;
  var HN = [], NCH = 0, NREN = 0, TOASTS = [], histNote = l => HN.push(l), changed = () => NCH++, render = () => NREN++, toastUndo = t => TOASTS.push(t), ACT = {};`, c);
// plan-columnas.js entero (va después de tab-plan.js en build.sh) y, de tab-plan.js, las columnas y sus títulos
vm.runInContext([
  grab('tab-plan.js', 'const PL_COLS = [', ']];\n'), grab('tab-plan.js', 'const PL_TIP = ', '\n'), grab('tab-plan.js', 'const PL_SORT = ', '\n'),
  grab('tab-plan.js', 'function plHeadHTML('), grab('tab-plan.js', 'const planCols = ', '\n'),
  fs.readFileSync(R + '/src/plan-columnas.js', 'utf8'),
].join('\n').replace(/^const /gm, 'var '), c);
const SRC = f => fs.readFileSync(R + '/' + f, 'utf8');

// la plantilla de antes del lote Y (planColsCSS del lote W), para comparar
const OLD = (C, used) => {
  const w = f => used[f] ? 'minmax(140px,1fr)' : 'minmax(130px,.45fr)';
  const cols = ['52px', '42px', `minmax(${C.thumb ? 280 : 220}px,1.7fr)`, '78px', '112px', C.fig && '46px', 'minmax(150px,1fr)', '58px', '40px', '68px', C.tech && w('tech'), C.obs && w('obs')].filter(Boolean);
  const min = 52 + 42 + (C.thumb ? 280 : 220) + 78 + 112 + (C.fig ? 46 : 0) + 150 + 58 + 40 + 68 + (C.tech ? 130 : 0) + (C.obs ? 130 : 0);
  return { cols: cols.join(' '), min };
};
const combos = [];
for (let m = 0; m < 64; m++) combos.push([{ fig: !!(m & 1), tech: !!(m & 2), obs: !!(m & 4), thumb: !!(m & 8) }, { tech: !!(m & 16), obs: !!(m & 32) }]);

test('sin anchos guardados la grilla es la de siempre (todas las combinaciones de columnas y notas)', () => {
  for (const [C, used] of combos) {
    const G = c.plGrid(C, used, {}), o = OLD(C, used);
    assert.strictEqual(G.cols.join(' '), o.cols, JSON.stringify([C, used]));
    assert.strictEqual(G.min, o.min, JSON.stringify([C, used]));
  }
});
test('las columnas en pantalla van en el orden de PL_COLS, sin las apagadas ni el menú ⋮', () => {
  assert.deepStrictEqual([...c.plColKeys({ fig: false, tech: true, obs: true })], ['esc', 'ie', 'set', 'dn', 'cast', 'loc', 'pgs', 'pg', 't', 'tech', 'obs']);
  assert.deepStrictEqual([...c.plColKeys({ fig: true, tech: false, obs: false })], ['esc', 'ie', 'set', 'dn', 'cast', 'fig', 'loc', 'pgs', 'pg', 't']);
});
test('un ancho guardado reemplaza el automático de su columna y cuenta en el mínimo', () => {
  const C = { fig: false, tech: true, obs: true, thumb: true }, used = { tech: false, obs: true };
  const G = c.plGrid(C, used, { set: 200, loc: 120, tech: 300 });
  const at = k => G.cols[G.keys.indexOf(k)];
  assert.strictEqual(at('set'), '200px'); assert.strictEqual(at('loc'), '120px'); assert.strictEqual(at('tech'), '300px');
  assert.strictEqual(at('obs'), 'minmax(140px,1fr)');   // las demás, automáticas
  assert.strictEqual(at('esc'), '52px'); assert.strictEqual(at('cast'), '112px');
  assert.strictEqual(G.min, OLD(C, used).min - 280 + 200 - 150 + 120 - 130 + 300);
  assert.strictEqual(G.cols.length, G.keys.length);
});
test('el ancho de una columna apagada no cuenta', () => {
  const C = { fig: false, tech: false, obs: true, thumb: false }, used = {};
  const G = c.plGrid(C, used, { fig: 90, tech: 400 });
  assert.strictEqual(G.cols.join(' '), OLD(C, used).cols); assert.strictEqual(G.min, OLD(C, used).min);
});
test('los anchos guardados, limpios al abrir: dentro del mínimo y el máximo, en número; lo demás no cuenta', () => {
  // (lote AC) plColWClean deja P.schedule.colW limpio (sin ninguno, no queda) y plColW lo lee tal cual
  const W = colW => { const S = { items: [], colW }; c.plColWClean(S); return 'colW' in S ? JSON.parse(JSON.stringify(S.colW)) : 'sin colW'; };
  assert.deepStrictEqual(W({ set: 10, loc: 50, esc: 5, cast: 20, t: 3, tech: 1, ie: 2, esc2: 9 }), { set: 80, loc: 80, esc: 32, cast: 40, t: 44, tech: 60, ie: 36 });
  assert.deepStrictEqual(W({ obs: 5000, pg: '120', dn: 123.6 }), { obs: 800, pg: 120, dn: 124 });
  assert.strictEqual(W({ loc: 'ancho', more: 50, ie: -4, fig: 0, set: null, pgs: NaN }), 'sin colW');
  assert.strictEqual(W([100, 200]), 'sin colW'); assert.strictEqual(W(null), 'sin colW'); assert.strictEqual(W('260'), 'sin colW'); assert.strictEqual(W(undefined), 'sin colW');
  assert.deepStrictEqual(W({ set: 260, cast: 60 }), { set: 260, cast: 60 });   // ya limpio: igual
  c.P.schedule = { items: [] }; assert.deepStrictEqual(JSON.parse(JSON.stringify(c.plColW())), {});
  c.P.schedule = { items: [], colW: { set: 260 } }; assert.strictEqual(c.plColW(), c.P.schedule.colW);
  c.P.schedule = { items: [] };
  // se limpian en normalizeProject, por donde pasa todo proyecto que se abre (y el plan que llega de otra persona)
  assert.match(SRC('src/proyectos.js'), /\n  plColWClean\(S\);/);
  assert.match(SRC('build.sh'), / tab-plan plan-columnas /);
  assert.strictEqual(c.plCwClamp('set', 79.4), 80); assert.strictEqual(c.plCwClamp('pg', 31), 32); assert.strictEqual(c.plCwClamp('loc', 801), 800);
});
test('las clases del tablero: .set-nt y .loc-np con la Locación o la de rodaje angostas; las celdas con ancho propio, data-cw', () => {
  const keys = c.plColKeys({ fig: false, tech: true, obs: true });
  assert.strictEqual(c.plCwCls({}, keys), '');
  assert.strictEqual(c.plCwCls({ set: 150, loc: 200 }, keys), ' set-nt');
  assert.strictEqual(c.plCwCls({ set: c.PL_NARROW.set[0], loc: 119 }, keys), ' loc-np');
  assert.strictEqual(c.plCwCls({ loc: c.PL_NARROW.loc[0] }, keys), '');
  assert.strictEqual(c.plCwCls({ fig: 60 }, keys), '');   // la figuración apagada
  // (lote AC) la celda de una columna con su ancho propio: data-cw y su texto entero al pasar el mouse
  assert.strictEqual(c.plCwAttr({ esc: 40 }, 'esc', '12A "b"'), ' data-cw title="12A &quot;b&quot;"');
  assert.strictEqual(c.plCwAttr({ cast: 60 }, 'cast', ''), ' data-cw');
  assert.strictEqual(c.plCwAttr({ cast: 60 }, 'tech'), '');
  assert.strictEqual(c.plCwAttr({}, 'esc', '12A'), '');
});
test('planColsCSS lleva los anchos del proyecto a --pl-cols y --pl-min', () => {
  c.P.schedule = { items: [{ k: '1', obs: 'lluvia' }], colW: { loc: 140, cast: 60 } };
  const S = c.planColsCSS();
  assert.match(S.style, /^--pl-cols:52px 42px minmax\(280px,1\.7fr\) 78px 60px 140px 58px 40px 68px minmax\(130px,\.45fr\) minmax\(140px,1fr\);--pl-min:\d+px$/);
  assert.strictEqual(+/--pl-min:(\d+)px/.exec(S.style)[1], 1140 - 112 + 60 - 150 + 140);
  assert.strictEqual(S.cls, ' no-fig');   // (lote AC) sin clases por columna: las celdas llevan data-cw
  c.P.schedule = { items: [] };
});
test('los títulos llevan un asa por columna en pantalla, fuera de los botones que ordenan; sin editar, ninguna', () => {
  c.P.schedule = { items: [], colW: { set: 150, cast: 60 } };
  const h = c.plHeadHTML(), rz = [...h.matchAll(/<i class="pl-rz( end)?" data-c="(\w+)" style="grid-column:(\d+)\/(\d+)"/g)];
  assert.deepStrictEqual(rz.map(m => m[2]), [...c.plColKeys(c.planCols())]);
  // cada asa en su columna, de una línea a la siguiente (un «auto» la llevaría hasta el borde de la grilla)
  assert.deepStrictEqual(rz.map(m => [+m[3], +m[4]]), rz.map((_, j) => [j + 1, j + 2]));
  assert.deepStrictEqual(rz.map(m => !!m[1]), rz.map((_, j) => j === rz.length - 1));   // la última, por dentro
  for (const b of h.match(/<button[\s\S]*?<\/button>/g)) assert(!b.includes('pl-rz'), b);
  assert.match(h, /<span class="c-cast" data-cw title="Reparto">/);   // con un ancho propio, el título entero al pasar el mouse
  assert.match(h, /<button type="button" class="c-set srt" data-cw data-act="pl-sort" data-c="set"/);
  assert.doesNotMatch(h, /class="c-esc srt" data-cw/);
  c.EDIT = false;
  assert(!c.plHeadHTML().includes('pl-rz')); assert(!c.plHeadHTML().includes('<button'));
  c.EDIT = true; c.P.schedule = { items: [] };
});
test('guardar un ancho: un paso del historial; null lo quita; sin anchos, colW desaparece', () => {
  c.P.schedule = { items: [] }; c.HN = []; c.NCH = 0;
  c.planColSet('loc', 61);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.P.schedule.colW)), { loc: 80 });
  assert.deepStrictEqual([...c.HN], ['Ancho de la columna Locación de rodaje']); assert.strictEqual(c.NCH, 1);
  c.planColSet('set', 260.4);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.P.schedule.colW)), { loc: 80, set: 260 });
  c.planColSet('set', null);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.P.schedule.colW)), { loc: 80 });
  c.planColSet('pg', null);   // no tenía ancho: nada que deshacer
  assert.strictEqual(c.HN.length, 3); assert.strictEqual(c.NCH, 3);
  c.planColSet('loc', null);
  assert(!('colW' in c.P.schedule));
  c.planColSet('more', 50); c.planColSet('nada', 50);
  assert(!('colW' in c.P.schedule)); assert.strictEqual(c.HN.length, 4);
  c.EDIT = false; c.planColSet('loc', 200); assert(!('colW' in c.P.schedule)); c.EDIT = true;
});
test('«Restaurar el ancho de las columnas»: todas automáticas en un paso del historial; sin anchos o sin permiso, nada', () => {
  c.P.schedule = { items: [], colW: { set: 200, loc: 120 } }; c.HN = []; c.NCH = 0; c.NREN = 0; c.TOASTS = [];
  c.ACT['pl-colw0']();
  assert(!('colW' in c.P.schedule)); assert.deepStrictEqual([...c.HN], ['Restaurar el ancho de las columnas']);
  assert.strictEqual(c.NCH, 1); assert.strictEqual(c.NREN, 1); assert.deepStrictEqual([...c.TOASTS], ['Las columnas volvieron a su ancho automático.']);
  c.ACT['pl-colw0'](); assert.strictEqual(c.HN.length, 1);
  c.P.schedule = { items: [], colW: { set: 200 } }; c.EDIT = false; c.ACT['pl-colw0'](); assert.deepStrictEqual(JSON.parse(JSON.stringify(c.P.schedule.colW)), { set: 200 }); c.EDIT = true;
  c.P.schedule = { items: [] };
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
