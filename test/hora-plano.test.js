/* La hora de cada plano en la hoja de llamado (shotOffsets en tab-call.js) y los controles del editor de plano.
   node test/hora-plano.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

// solo la función: el resto de la hoja necesita la app entera
const src = fs.readFileSync(R + '/src/tab-call.js', 'utf8').replace(/\r\n/g, '\n');
const m = /function shotOffsets\([\s\S]*?\n}\n/.exec(src);
assert.ok(m, 'shotOffsets está en tab-call.js');
const c = { Math, isFinite }; vm.createContext(c); vm.runInContext(m[0] + '\nthis.shotOffsets = shotOffsets;', c);
const sh = n => Array.from({ length: n }, (_, i) => ({ id: 's' + i }));
const J = x => JSON.parse(JSON.stringify(x));

test('sin horas escritas: la escena se reparte parejo, como antes', () => {
  const o = c.shotOffsets(sh(3), 45, undefined);
  assert.deepStrictEqual(J(o.pos), [0, 15, 30]);
  assert.deepStrictEqual(J(o.fix), [null, null, null]);
  assert.deepStrictEqual(J(o.lo), [0, 0, 0]);
  assert.deepStrictEqual(J(o.hi), [44, 44, 44], 'ninguno empieza cuando la escena ya terminó');
});

test('un plano con hora: los de después se reparten entre esa hora y el fin', () => {
  const o = c.shotOffsets(sh(3), 45, { s1: 30 });
  assert.deepStrictEqual(J(o.pos), [0, 30, 37.5]);
  assert.deepStrictEqual(J(o.hi), [30, 44, 44], 'el primero no pasa del fijo que sigue');
  assert.deepStrictEqual(J(o.lo), [0, 0, 30], 'el último no va antes del fijo anterior');
});

test('el primer plano también se puede mover: los de en medio quedan entre los dos fijos', () => {
  const o = c.shotOffsets(sh(4), 60, { s0: 10, s3: 40 });
  assert.deepStrictEqual(J(o.pos), [10, 20, 30, 40]);
});

test('nunca sale de su escena: si la escena se acorta, la hora escrita se queda dentro', () => {
  const o = c.shotOffsets(sh(2), 20, { s1: 50 });
  assert.strictEqual(o.pos[1], 19);
  const o2 = c.shotOffsets(sh(2), 20, { s0: -5 });
  assert.strictEqual(o2.pos[0], 0);
});

test('en el orden de los planos aunque los datos digan otra cosa', () => {
  const o = c.shotOffsets(sh(3), 45, { s0: 30, s1: 10 });
  assert.deepStrictEqual(J(o.pos.slice(0, 2)), [30, 30]);
  assert.ok(o.pos[2] >= 30 && o.pos[2] <= 45);
});

test('datos raros no rompen el reparto', () => {
  const o = c.shotOffsets(sh(2), 30, { s0: 'x', s1: NaN });
  assert.deepStrictEqual(J(o.pos), [0, 15]);
});

test('el editor de plano no repite ids (las flechas de la cámara dejaron de andar por un id repetido)', () => {
  const ed = fs.readFileSync(R + '/src/shot-editor.js', 'utf8').replace(/\r\n/g, '\n');
  const ids = [...ed.matchAll(/\bid="([A-Za-z][\w-]*)"/g)].map(x => x[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepStrictEqual(dup, []);
  assert.ok(/\$m\('#vpCam'\)/.test(ed) && /id="vpCam"/.test(ed), 'las flechas siguen en #vpCam');
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
