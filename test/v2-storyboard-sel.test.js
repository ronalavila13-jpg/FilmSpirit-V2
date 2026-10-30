/* Storyboard v2: una sola selección (línea amarilla) y sin panel del plano (src/v2-storyboard.js, src/v2-pant.css).
   node test/v2-storyboard-sel.test.js */
const fs = require('fs'), assert = require('assert');
const js = fs.readFileSync(__dirname + '/../src/v2-storyboard.js', 'utf8'), css = fs.readFileSync(__dirname + '/../src/v2-pant.css', 'utf8');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

test('ya no hay panel del plano ni borde negro de «plano actual»', () => {
  assert.ok(!/v2SbPanel|v2-sbp|UI\.v2Shot|sbshot/.test(js), 'queda código del panel');
  assert.ok(!/\.v2-sbp|\.v2-sbwrap|\.v2-sbc\.on|\.v2-sbbig/.test(css), 'quedan reglas del panel');
});
test('un clic elige solo ese plano y la marca es la línea amarilla de siempre', () => {
  assert.ok(/S\.clear\(\); S\.add\(id\); sbSelPaint\(\)/.test(js));
  assert.ok(/\.v2-sbc\.sel \.v2-sbb\{outline:2px solid var\(--v2-yellow\)/.test(css));
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
