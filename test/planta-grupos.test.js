/* Planta general de la escena (src/planta-general.js): de cada grupo de color del Storyboard (planos que se graban de una vez)
   solo se dibuja la cámara del plano más bajo.  node test/planta-grupos.test.js */
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../src/planta-general.js', 'utf8');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

test('pgData marca como ocultos los planos de un grupo salvo el primero, con el color del grupo, y devuelve las cámaras que se ven', () => {
  assert.ok(/const grp = typeof shotGroups === 'function' \? shotGroups\(\) : new Map\(\), lead = new Map\(\);/.test(src));
  assert.ok(/S\.col = g\.color;/.test(src) && /S\.hidden = true; S\.rep = lead\.get\(g\)/.test(src));
  assert.ok(/cams: shots\.filter\(S => !S\.hidden\)/.test(src));
});
test('el dibujo y el encuadre usan solo esas cámaras; elegir un plano oculto resalta la cámara de su grupo', () => {
  assert.ok(/const order = \[\.\.\.G\.cams\]/.test(src), 'dibujo');
  assert.ok(/for \(const S of G\.cams\) for \(const C of S\.cams\) \{ pts\.push/.test(src), 'encuadre');
  assert.ok(/selCam = selS && selS\.hidden \? selS\.rep\.sh\.id : opt\.sel/.test(src), 'resaltado');
});
test('la lista (pantalla y PDF) dice «con 2.1» en los planos cuya cámara está en otro', () => {
  assert.ok(/\(S\.hidden \? ' · con ' \+ S\.rep\.code : ''\)/.test(src));
  assert.ok(!/S\.cams\.map\(C => \(C\.letter/.test(src.replace(/const pgLn = [^\n]*\n/, '')), 'queda una lista sin pgLn');
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
