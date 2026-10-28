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
test('la tarjeta del ejemplo: sin degradado ni resplandor (lote AG: blanca, con la etiqueta «Ejemplo» en rojo)', () => {
  const css = leer('shell.html');
  const block = css.slice(css.indexOf('/* (lote AD) el proyecto de ejemplo, primero'), css.indexOf('/* sin cuenta: el botón para crearla'));
  assert(!/gradient/.test(block), 'sin degradado');
  assert(!/rgba\(206,12,28/.test(block), 'sin resplandor rojo');
  assert(!/\.home-card\.home-sample\{background/.test(block), 'la tarjeta, como las demás');
  assert(/\.home-k\.s,\.pj-ex\{background:#CE0C1C;color:#fff\}/.test(block), 'la etiqueta en rojo');
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
