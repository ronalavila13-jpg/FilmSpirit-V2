/* El agarre de un objeto sostenido se ajusta a mano (src/s3d-model.js · gripAdj, src/s3d-render.js, src/shot-editor.js · gripPanel):
   ob.hold.g = [x, y, z, giro x, y, z] se suma al de GRIP.  node test/agarre-ajuste.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/../src/';
const model = fs.readFileSync(R + 's3d-model.js', 'utf8'), render = fs.readFileSync(R + 's3d-render.js', 'utf8'), ed = fs.readFileSync(R + 'shot-editor.js', 'utf8');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

const c = vm.createContext({ Math, isFinite, Array, clamp: (v, a, b) => Math.min(b, Math.max(a, v)) });
vm.runInContext(/const GRIP_ADJ[^\n]*\n/.exec(model)[0] + /const gripAdj = ob => \{[\s\S]*?\n\};\n/.exec(model)[0] + '\nthis.f = gripAdj;', c);
const adj = ob => { const r = c.f(ob); return r && Array.from(r); };

test('gripAdj: sin ajuste, null; con ajuste, seis números limitados', () => {
  assert.strictEqual(adj({ hold: { a: 'a0', at: 'R' } }), null);
  assert.strictEqual(adj({ hold: { a: 'a0', g: [0, 0, 0, 0, 0, 0] } }), null);
  assert.deepStrictEqual(adj({ hold: { g: [.1, -.02, 0, 0, 0, 1] } }), [.1, -.02, 0, 0, 0, 1]);
  assert.deepStrictEqual(adj({ hold: { g: [9, -9, 0, 99, 0, 0] } }), [.5, -.5, 0, Math.PI, 0, 0], 'límites');
});
test('gripAdj: datos raros del JSON compartido no rompen nada', () => {
  assert.strictEqual(adj({ hold: { g: 'x' } }), null);
  assert.strictEqual(adj({ hold: { g: [1, 2, 3] } }), null);
  assert.deepStrictEqual(adj({ hold: { g: ['a', null, NaN, Infinity, .1, 0] } }), [0, 0, 0, 0, .1, 0], 'no numéricos → 0');
});
test('el dibujo suma el ajuste al agarre y gira sobre los ejes del objeto', () => {
  assert.ok(/d = gripAdj\(ob\)/.test(render) && /q0\.multiply\(new T\.Quaternion\(\)\.setFromEuler\(new T\.Euler\(d\[3\], d\[4\], d\[5\]\)\)\)/.test(render));
  assert.ok(/g\[0\] \+ \(d \? d\[0\] : 0\)/.test(render));
});
test('el panel «Ajustar agarre» mueve (cm), gira (°) y vuelve al agarre original', () => {
  assert.ok(/function gripPanel\(ob\)/.test(ed) && /Ajustar agarre/.test(ed) && /data-o="gripreset"/.test(ed));
  assert.ok(/key\.startsWith\('og:'\)/.test(ed) && /gripSet\(ob, \+key\.slice\(3\), v\)/.test(ed));
  assert.ok(/b\.dataset\.o === 'gripreset'/.test(ed) && /delete ob\.hold\.g/.test(ed));
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
