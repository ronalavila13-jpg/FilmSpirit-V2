/* Las puertas del ascensor se abren y cierran: el ambiente trae una puerta corrediza (objeto «puerta», type 'ascensor')
   en el muro del fondo, cerrada, que se abre con «Apertura» como cualquier puerta; los demás ambientes no cambian.
   node test/ascensor-puertas.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const J = x => JSON.parse(JSON.stringify(x));

const c = { console, Math, JSON, Map, Set, Number, String, Object, Array, isFinite };
vm.createContext(c);
vm.runInContext(`var clamp = (v, a, b) => Math.max(a, Math.min(b, v)); var num = v => +v || 0; var deaccent = s => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');`, c);
vm.runInContext('var GRIP = {};', c);
for (const f of ['s3d-model', 's3d-objetos', 's3d-interiores']) vm.runInContext(fs.readFileSync(R + '/src/' + f + '.js', 'utf8'), c, { filename: f + '.js' });
const X = vm.runInContext('({ roomFurnish, roomRelayout })', c);

const scene = () => ({ set: 'int', objs: [{ id: 'a0', kind: 'actor' }], keys: [0, 2].map(t => ({ t, cam: { x: 0, z: 3, h: 1.6, yaw: 0, pitch: 0, roll: 0, lens: 35 }, o: { a0: { x: 0, z: 0, rot: 0, pose: 'pie' } } })) });

test('el ascensor trae una sola puerta corrediza, cerrada, en el muro del fondo y en todas las claves', () => {
  const s3 = X.roomFurnish(scene(), 'ascensor'), D = s3.objs.filter(o => o.kind === 'puerta');
  assert.strictEqual(D.length, 1);
  assert.deepStrictEqual(J(D[0]), { id: D[0].id, kind: 'puerta', room: 'ascensor', type: 'ascensor' });
  for (const k of s3.keys) assert.deepStrictEqual(J(k.o[D[0].id]), { x: 0, z: -.75, rot: 0, open: 0 });
});
test('cambiar a otro ambiente la quita; las puertas de las habitaciones siguen siendo de bisagra', () => {
  const s3 = X.roomFurnish(X.roomFurnish(scene(), 'ascensor'), 'sala');
  assert.ok(!s3.objs.some(o => o.type === 'ascensor'));
  assert.ok(s3.objs.some(o => o.kind === 'puerta' && !o.type));
});
test('cambiar el tamaño de la cabina la deja pegada al muro', () => {
  const s3 = X.roomFurnish(scene(), 'ascensor'); s3.room.d = 2; X.roomRelayout(s3);
  const id = s3.objs.find(o => o.type === 'ascensor').id;
  assert.strictEqual(s3.keys[0].o[id].z, -1);
});

console.log(fail ? `${fail} fallan` : 'todas pasan');
process.exit(fail ? 1 : 0);
