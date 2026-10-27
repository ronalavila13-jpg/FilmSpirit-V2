/* Lote AB · correcciones de la revisión: la huella de la hoja de llamado con la sinopsis que sale impresa (y la de
   antes para las hojas exportadas antes), las notas clavadas en el stripboard sin cortar y el PDF en inglés midiendo
   el texto sin traducirlo otra vez.  node test/lote-ab.test.js */
const vm = require('vm'), assert = require('assert');
const { pieza, leer } = require('./utiles/fuente.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const src = leer;

const c = { Math, JSON, String, Object, Array };
vm.createContext(c);
vm.runInContext('var P = { scenes: {}, paras: [] };', c);
vm.runInContext(pieza('ui.js', 'const synopsisOf = ') + pieza('tab-call.js', 'const CALL_SYN') + pieza('tab-call.js', 'const callSyn') + pieza('tab-call.js', 'function synOld('), c);
const scene = x => { c.P.paras = [{ t: 'h', x: 'EXT. PLAYA - DÍA' }, { t: 'a', x }]; return { key: '1', p0: 0, p1: 2 }; };
const LARGA = 'La neblina de junio se come el muelle.  Solo se ven las primeras columnas de madera, y después nada. Teófilo camina por la orilla con la soga en la mano y se detiene frente a los caballitos de totora.';

test('la huella toma la sinopsis que sale impresa (más allá de los 110 caracteres)', () => {
  assert(/mode \? synOld\(s2, mode\) : callSyn\(s2\)/.test(src('tab-call.js')), 'callSig con la sinopsis impresa');
  assert(c.callSyn(scene(LARGA)).length > 110);
});
test('la huella de antes del lote X (sin juntar espacios) y la de los lotes X a AA, para las hojas ya exportadas', () => {
  const w = c.synOld(scene(LARGA), 'w'), x = c.synOld(scene(LARGA), 'x');
  assert(w.includes('muelle.  Solo'), 'antes: los espacios dobles quedaban');
  assert(x.includes('muelle. Solo'), 'X a AA: los espacios se juntaban');
  assert(w.endsWith('…') && w.length <= 110 && x.length <= 110);
});
test('una hoja exportada ahora guarda la versión de la huella', () => {
  assert(/exp = \{ v: V\.v, t: V\.t, sig: V\.sig, sv: CALL_SV \}/.test(src('tab-call.js')));
  assert(/!e\.sv && \(e\.sig === callSig\(n, cd, 'x'\) \|\| e\.sig === callSig\(n, cd, 'w'\)\)/.test(src('tab-call.js')));
});
test('el stripboard no corta las notas clavadas en una fila', () => {
  assert(/\.pl \.prow:not\(\.brk\)>:not\(\.nb\)\{overflow:hidden\}/.test(leer('shell.html')));
});
test('el PDF de la hoja mide el texto tal cual (sin traducirlo otra vez)', () => {
  assert(/const clRawW = doc => t => doc\._rawW \? doc\._rawW\(t\) : \(doc\._raw \|\| doc\)\.getTextWidth\(t\);/.test(src('pdf-llamado.js')));
  assert.strictEqual((src('pdf-llamado.js').match(/getTextWidth\(/g) || []).length, 2, 'solo el respaldo de clRawW y «Ver mapa»');
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
