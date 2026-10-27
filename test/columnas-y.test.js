/* Lote Y · el ancho de cada columna del stripboard, guardado en el proyecto (P.schedule.colW, en px): la plantilla de la
   grilla con los anchos guardados, sus límites, las asas de los títulos y guardar o quitar un ancho (tab-plan.js).
   node test/columnas-y.test.js */
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
  var HN = [], NCH = 0, NREN = 0, histNote = l => HN.push(l), changed = () => NCH++, render = () => NREN++;`, c);
vm.runInContext([
  grab('tab-plan.js', 'const PL_COLS = [', ']];\n'), grab('tab-plan.js', 'const PL_TIP = ', '\n'), grab('tab-plan.js', 'const PL_SORT = ', '\n'),
  grab('tab-plan.js', 'function plHeadHTML('), grab('tab-plan.js', 'const planCols = ', '\n'),
  grab('tab-plan.js', 'const PL_CW_MIN = ', '\n'), grab('tab-plan.js', 'const plCwClamp = ', '\n'), grab('tab-plan.js', 'const PL_TH_MIN = ', '\n'),
  grab('tab-plan.js', 'const plColKeys = ', '\n'), grab('tab-plan.js', 'function plColW('), grab('tab-plan.js', 'function plGrid('),
  grab('tab-plan.js', 'const plNotesUsed = ', '\n'), grab('tab-plan.js', 'const plCwCls = ', '\n'), grab('tab-plan.js', 'function planColsCSS('),
  grab('tab-plan.js', 'function planColSet('),
].join('\n').replace(/^const /gm, 'var '), c);

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
test('los anchos guardados: dentro del mínimo y el máximo, en número; lo demás no cuenta', () => {
  const W = colW => JSON.parse(JSON.stringify(c.plColW({ colW })));
  assert.deepStrictEqual(W({ set: 10, loc: 50, esc: 5, cast: 20, t: 3, tech: 1, esc2: 9 }), { set: 80, loc: 80, esc: 32, cast: 40, t: 44, tech: 60 });
  assert.deepStrictEqual(W({ obs: 5000, pg: '120', dn: 123.6 }), { obs: 800, pg: 120, dn: 124 });
  assert.deepStrictEqual(W({ loc: 'ancho', more: 50, ie: -4, fig: 0, set: null, pgs: NaN }), {});
  assert.deepStrictEqual(W([100, 200]), {}); assert.deepStrictEqual(W(null), {}); assert.deepStrictEqual(W('260'), {});
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.plColW(undefined))), {});
  assert.strictEqual(c.plCwClamp('set', 79.4), 80); assert.strictEqual(c.plCwClamp('pg', 31), 32); assert.strictEqual(c.plCwClamp('loc', 801), 800);
});
test('las clases del tablero: .w-<clave> de las columnas con su ancho y .set-nt con la Locación angosta', () => {
  const keys = c.plColKeys({ fig: false, tech: true, obs: true });
  assert.strictEqual(c.plCwCls({}, keys), '');
  assert.strictEqual(c.plCwCls({ set: 150, loc: 200 }, keys), ' w-set w-loc set-nt');
  assert.strictEqual(c.plCwCls({ set: c.PL_TH_MIN }, keys), ' w-set');
  assert.strictEqual(c.plCwCls({ fig: 60 }, keys), '');   // la figuración apagada
});
test('planColsCSS lleva los anchos del proyecto a --pl-cols y --pl-min', () => {
  c.P.schedule = { items: [{ k: '1', obs: 'lluvia' }], colW: { loc: 140, cast: 60 } };
  const S = c.planColsCSS();
  assert.match(S.style, /^--pl-cols:52px 42px minmax\(280px,1\.7fr\) 78px 60px 140px 58px 40px 68px minmax\(130px,\.45fr\) minmax\(140px,1fr\);--pl-min:\d+px$/);
  assert.strictEqual(+/--pl-min:(\d+)px/.exec(S.style)[1], 1140 - 112 + 60 - 150 + 140);
  assert.match(S.cls, / no-fig/); assert.match(S.cls, / w-loc/); assert.match(S.cls, / w-cast/); assert.doesNotMatch(S.cls, /set-nt/);
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
  assert.match(h, /<span class="c-cast" title="Reparto">/);   // con un ancho propio, el título entero al pasar el mouse
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

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
