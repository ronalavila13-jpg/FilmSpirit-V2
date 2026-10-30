/* Un celular en la mano (src/s3d-figs.js · GRIP, src/s3d-objetos.js · OBJ_FIST): la mano se cierra sobre él.
   Sin eso la mano quedaba abierta y atravesaba el celular.  node test/celular-mano.test.js */
const fs = require('fs'), assert = require('assert');
const figs = fs.readFileSync(__dirname + '/../src/s3d-figs.js', 'utf8'), objs = fs.readFileSync(__dirname + '/../src/s3d-objetos.js', 'utf8');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

test('el celular cierra la mano que lo sostiene (OBJ_FIST)', () => {
  const fist = /const OBJ_FIST = \{([^}]*)\}/.exec(objs)[1];
  assert.ok(/\bcelular: \.\d+/.test(fist), 'el celular no cierra la mano');
});
test('el celular se agarra por su tercio de arriba, con el puño (no por el centro con la mano abierta)', () => {
  const g = /celular: \{ mano: \[([^\]]*)\]/.exec(figs)[1].split(',').map(Number);
  assert.ok(g[1] <= -.09 && g[1] >= -.14, 'y fuera del rango del puño: ' + g[1]);
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
