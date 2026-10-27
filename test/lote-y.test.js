/* Lote Y · el clima de la hoja de llamado con su unidad pegada al número (wxBare, wxShow y wxLine en tab-call.js) y la
   escala de letras del PDF de la hoja, proporcional a la de la pantalla (CLF en pdf.js).  node test/lote-y.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const src = f => fs.readFileSync(R + '/src/' + f, 'utf8');
// las líneas de un archivo de la app que empiezan con «start», hasta la primera que termina en «;» (sin «const», para el vm)
const grab = (file, start) => { const s = src(file), a = s.indexOf(start); assert(a >= 0, start); const b = s.indexOf(';\n', a); return s.slice(a, b + 2).replace(/^const /gm, 'var '); };

const c = { console, Math, JSON, String, Object, Array };
vm.createContext(c);
vm.runInContext(['const WX_NUM', 'const WX_U', 'const wxBare', 'const wxShow', 'const wxLine'].map(k => grab('tab-call.js', k)).join(''), c);
vm.runInContext(grab('pdf.js', 'const CLK'), c);

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
test('la línea del PDF y el Excel', () => {
  assert.deepStrictEqual(Array.from(c.wxLine({ wx: 'Soleado', hi: '30', lo: '15', hum: '10' })), ['Soleado', 'Máx. 30° · Mín. 15°', 'Hum. 10%']);
  assert.deepStrictEqual(Array.from(c.wxLine({ wx: '29' })), ['29°']);
  assert.deepStrictEqual(Array.from(c.wxLine({})), []);
});
test('el PDF de la hoja guarda las proporciones de la pantalla', () => {
  const px = { cap: 11.5, ft: 12.5, bd: 13.5, h3: 17, h2: 19, h1: 26, hero: 56 };
  for (const k of Object.keys(px)) assert(Math.abs(c.CLF[k] / c.CLF.bd - px[k] / px.bd) < 1e-9, k);
  assert(c.CLF.cap >= 7, 'la etiqueta más chica del PDF se lee (7 pt o más)');
});
test('la escala de la pantalla es la que dice el PDF (shell.html)', () => {
  const css = fs.readFileSync(R + '/src/shell.html', 'utf8');
  assert(/--cl-cap:11\.5px; --cl-ft:12\.5px; --cl-bd:13\.5px; --cl-h3:17px; --cl-h2:19px; --cl-h1:26px; --cl-hero:56px/.test(css), 'los tamaños de .cs.cl');
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
