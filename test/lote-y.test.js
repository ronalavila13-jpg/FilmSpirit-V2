/* Lote Y · el clima de la hoja de llamado con su unidad pegada al número (WX_FIELDS, wxNum, wxShow y wxParts en
   tab-call.js) y la escala de letras del PDF de la hoja, proporcional a la de la pantalla (CL_SCALE en tab-call.js, CLF
   en pdf-llamado.js).  node test/lote-y.test.js */
const vm = require('vm'), assert = require('assert');
const { pieza, leer } = require('./utiles/fuente.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

const c = { console, Math, JSON, String, Object, Array };
vm.createContext(c);
vm.runInContext(['const WX_FIELDS', 'const WX_U', 'const wxBare', 'const wxNum', 'const wxShow', 'const wxParts', 'const CL_SCALE', 'const CL_TONE'].map(k => pieza('tab-call.js', k)).join(''), c);
vm.runInContext(pieza('pdf-llamado.js', 'const CLK'), c);

test('la máxima y la mínima con «°» y la humedad con «%», pegados al número', () => {
  assert.strictEqual(c.wxShow('hi', '30'), '30°');
  assert.strictEqual(c.wxShow('lo', '-2'), '-2°');
  assert.strictEqual(c.wxShow('hum', '10'), '10%');
  assert.strictEqual(c.wxShow('hi', '18,5'), '18,5°');
});
test('si la unidad se escribió a mano, no sale repetida', () => {
  assert.strictEqual(c.wxShow('hi', '30°'), '30°');
  assert.strictEqual(c.wxShow('hi', '30 °C'), '30°');
  assert.strictEqual(c.wxShow('hum', '10 %'), '10%');
  assert.strictEqual(c.wxBare('30 °C'), '30');
});
test('en «Clima», un número solo es la temperatura; el texto queda tal cual', () => {
  assert.strictEqual(c.wxShow('wx', '29'), '29°');
  assert.strictEqual(c.wxShow('wx', 'Soleado'), 'Soleado');
  assert.strictEqual(c.wxShow('wx', '29 y soleado'), '29 y soleado');
  assert.strictEqual(c.wxShow('wx', ''), '');
});
test('el clima para el PDF y el Excel', () => {
  const W = c.wxParts({ wx: 'Soleado', hi: '30', lo: '15', hum: '10' });
  assert.strictEqual(W.wx, 'Soleado');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(W.pairs)), [['Máx.', '30°'], ['Mín.', '15°'], ['Hum.', '10%']]);
  assert.strictEqual(c.wxParts({ wx: '29' }).wx, '29°');
  assert.strictEqual(c.wxParts({}).pairs.length, 0);
});
test('el PDF de la hoja guarda las proporciones de la pantalla (una sola tabla, CL_SCALE)', () => {
  for (const k of Object.keys(c.CL_SCALE)) assert(Math.abs(c.CLF[k] / c.CLF.bd - c.CL_SCALE[k] / c.CL_SCALE.bd) < 1e-9, k);
  assert(Math.abs(c.CLF.bd - 8.6) < 1e-9, 'el texto sale en 8,6 pt');
  assert(c.CLF.cap >= 7, 'la etiqueta más chica del PDF se lee (7 pt o más)');
});
test('la pantalla toma la escala y los grises de la misma tabla (sin repetirlos en shell.html)', () => {
  assert(/st\.setProperty\('--cl-' \+ k, v \+ 'px'\)/.test(leer('tab-call.js')), 'las variables --cl-* salen de CL_SCALE');
  assert(!/--cl-bd:13\.5px/.test(leer('shell.html')), 'shell.html no repite la escala');
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
