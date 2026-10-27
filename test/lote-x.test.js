/* Lote X · la sinopsis entera en la hoja de llamado (synopsisOf en ui.js, callSyn en tab-call.js) y el reparto del
   stripboard en números simples, sin círculos (castNums en tab-plan.js).  node test/lote-x.test.js */
const vm = require('vm'), assert = require('assert');
const { pieza } = require('./utiles/fuente.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

const c = { console, Math, JSON, Map, Set, String, Object, Array };
vm.createContext(c);
vm.runInContext(`var P = { scenes: {}, paras: [], elements: {}, schedule: {} }, D = { castNum: {}, sem: [] };
  var esc = s => String(s), ea = s => String(s), titleCase = s => s; var PL_ICO = { addCast: '+' };
  var sceneCast = si => [...D.sem[si]].map(id => P.elements[id]).filter(e => e && e.cat === 'cast').sort((a, b) => (D.castNum[a.id] || 99) - (D.castNum[b.id] || 99));`, c);
vm.runInContext(pieza('ui.js', 'const synopsisOf = ') + pieza('tab-call.js', 'const CALL_SYN') + pieza('tab-call.js', 'const callSyn'), c);
vm.runInContext(pieza('tab-plan.js', 'function castNums('), c);
const scene = x => { c.P.paras = [{ t: 'h', x: 'INT. CABINA - NOCHE' }, { t: 'a', x }]; return { key: '2', p0: 0, p1: 2 }; };

const LARGA = 'En la cabina, Ana encuentra doce rollos y la lámpara del proyector quemada. Don Alfredo pide que la última vez suene bonito. Tito llega con el desayuno y se queda mirando la pantalla vacía mientras afuera empieza a llover sobre la marquesina.';

test('en el resto de la app, la sinopsis sigue corta (110 letras, con «…»)', () => {
  const t = c.synopsisOf(scene(LARGA));
  assert(t.length <= 110, t.length); assert(t.endsWith('…'), t);
});
test('en la hoja de llamado, una acción que cabe sale entera, sin «…»', () => {
  const x = LARGA.slice(0, 122);   // dos oraciones
  assert.strictEqual(c.callSyn(scene(x)), x);
});
test('si no cabe, se corta al final de una oración (sin «…»)', () => {
  const t = c.callSyn(scene(LARGA));
  assert(t.length <= c.CALL_SYN, t.length);
  assert(t.endsWith('bonito.'), t);
  assert(!t.includes('…'), t);
});
test('sin un punto que sirva, se corta en una palabra con «…»', () => {
  const x = 'Ana camina ' + 'muy despacio por el pasillo largo de la casa vieja '.repeat(8);
  const t = c.callSyn(scene(x));
  assert(t.length <= c.CALL_SYN, t.length); assert(t.endsWith('…'), t); assert(!/\s…$/.test(t), t);
});
test('la sinopsis escrita a mano manda, entera', () => {
  c.P.scenes['2'] = { synopsis: LARGA };
  assert.strictEqual(c.callSyn(scene('otra cosa')), LARGA);
  delete c.P.scenes['2'];
});
test('el reparto del stripboard: números simples separados por comas, sin círculos', () => {
  c.P.elements = { a: { id: 'a', cat: 'cast', name: 'Ana' }, b: { id: 'b', cat: 'cast', name: 'Tito' }, d: { id: 'd', cat: 'cast', name: 'Alfredo' }, p: { id: 'p', cat: 'props', name: 'Rollos' } };
  c.D.castNum = { a: 1, b: 2, d: 5 }; c.D.sem = [new Set(['d', 'p', 'a', 'b'])];
  const h = c.castNums({ idx: 0, key: '1' }, true);
  assert.strictEqual(h.replace(/<[^>]+>/g, ''), '1, 2, 5');
  assert(h.includes('title="Alfredo"'), h);
  c.P.schedule.castMode = 'name';
  assert.strictEqual(c.castNums({ idx: 0, key: '1' }, true).replace(/<[^>]+>/g, ''), 'AnaTitoAlfredo');   // por nombre, como antes (las comas las pone la hoja de estilos)
  c.P.schedule.castMode = '';
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
