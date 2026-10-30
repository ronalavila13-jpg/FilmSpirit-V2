/* Planta general de la escena (src/planta-general.js): de cada grupo de color del Storyboard (planos que se graban de una vez)
   solo se dibuja la cámara del plano más bajo.  node test/planta-grupos.test.js */
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../src/planta-general.js', 'utf8');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

test('pgData marca como ocultos los planos de un grupo salvo el primero, con el color del grupo', () => {
  assert.ok(/const grp = typeof shotGroups === 'function' \? shotGroups\(\) : new Map\(\), lead = new Map\(\);/.test(src));
  assert.ok(/S\.col = g\.color;/.test(src) && /S\.hidden = true; S\.rep = lead\.get\(g\)/.test(src));
});
test('«Todos / Grupos» y el ojo deciden qué cámaras se dibujan; el dibujo y el encuadre usan solo esas', () => {
  assert.ok(/const pgCams = G => G\.shots\.filter\(S => pgShown\(G, S\)\)/.test(src));
  assert.ok(/return !\(S\.hidden && pgMode\(\) !== 'todos'\)/.test(src), 'con «Grupos» se esconde el resto del grupo');
  assert.ok(/const order = \[\.\.\.cams\]/.test(src) && /for \(const S of pgCams\(G\)\) for \(const C of S\.cams\) \{ pts\.push/.test(src), 'dibujo y encuadre');
  assert.ok(/data-pgm="todos"/.test(src) && /data-pgm="grupos"/.test(src), 'los dos botones');
  assert.ok(/data-eye="\$\{ea\(S\.sh\.id\)\}"/.test(src) && /PG_VIEW\.off\.add\(S\.sh\.id\)/.test(src), 'el ojo');
});
test('elegir un plano cuya cámara no se ve resalta la de su grupo', () => {
  assert.ok(/selS\.rep && cams\.includes\(selS\.rep\) \? selS\.rep\.sh\.id : null/.test(src));
});
test('la lista (pantalla y PDF) dice «con 2.1» en los planos cuya cámara está en otro', () => {
  assert.ok(/\(S\.hidden \? ' · con ' \+ S\.rep\.code : ''\)/.test(src));
  assert.ok(!/S\.cams\.map\(C => \(C\.letter/.test(src.replace(/const pgLn = [^\n]*\n/, '')), 'queda una lista sin pgLn');
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
