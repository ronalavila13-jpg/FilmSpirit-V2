/* Lote AE · el proyecto de ejemplo en rojo liso (sin degradado) y las notas al margen sin proyecto abierto (en Inicio,
   con la pestaña del Guion rayado guardada de antes).  node test/lote-ae.test.js */
const vm = require('vm'), assert = require('assert');
const { pieza, leer } = require('./utiles/fuente.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

test('sin proyecto abierto, las notas al margen no se activan (antes: error al leer P.meta)', () => {
  const c = { UI: { tab: 'lined' }, P: null, edFormat: () => { throw new Error('leyó el proyecto'); } };
  vm.createContext(c);
  vm.runInContext(pieza('guion-margen.js', 'const mnOn'), c);
  assert.strictEqual(c.mnOn(), false);
  c.P = { meta: {} }; c.edFormat = () => 'cine';
  assert.strictEqual(c.mnOn(), true, 'con proyecto, como siempre');
});
test('la tarjeta del ejemplo: rojo de la marca liso, con borde y sin resplandor', () => {
  const css = leer('shell.html');
  const block = css.slice(css.indexOf('.home-sample,.pj-sample{'), css.indexOf('.home-sample .home-open'));
  assert(!/gradient/.test(block), 'sin degradado');
  assert(!/rgba\(206,12,28/.test(block), 'sin resplandor rojo');
  assert(/\.home-card\.home-sample\{background:var\(--samp\);border-color:var\(--samp-hi\)/.test(block), 'con borde simple');
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
