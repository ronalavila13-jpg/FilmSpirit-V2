/* Lote AD · hoja de script: el modelo de datos (compatible con los proyectos de antes), los tiempos, las incidencias,
   el cronómetro de las tomas, MOS, las fotos («sp~», con la hoja de script) y la carga rápida.
   node test/script-ad.test.js */
const vm = require('vm'), assert = require('assert');
const { pieza, leer } = require('./utiles/fuente.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const A = require('../src/areas.js');

const c = { Math, JSON, String, Object, Array, Date, isFinite, parseFloat, Number, RegExp };
vm.createContext(c);
vm.runInContext(`var EN = false, trDone = s => s; var P = { sup: { takes: {}, sc: {}, day: {} }, shots: {} }; var D = { metrics: { eighths: [] } }; var scenePages = k => k === '1' ? 3 : 4;
  var hmToMin = v => { const m = /^(\\d{1,2}):(\\d{2})$/.exec(String(v || '')); return m ? +m[1] * 60 + +m[2] : null; };
  var normHM = v => String(v || '').trim();`, c);
const T = 'tab-sup.js';
vm.runInContext([pieza(T, 'const TAKE_ST'), pieza(T, 'const supTakes'), pieza(T, 'const supRolled'), pieza(T, 'const supMos'), pieza(T, 'const isMos'), pieza(T, 'const takeSnd'), pieza(T, 'const spKey'),
  pieza(T, 'function supClean('), pieza(T, 'function supSecs('), pieza(T, 'const supFmt'), pieza(T, 'const supClock'), pieza(T, 'const supPlanSecs'), pieza(T, 'const supRealSecs'),
  pieza(T, 'const supCurTake'), pieza(T, 'function supStop('), pieza(T, 'const supStopAll'), pieza(T, 'function supFirstLast('), pieza(T, 'function supRolls('), pieza(T, 'function supLen('),
  pieza(T, 'const supIncs'), pieza(T, 'const supIncJoin'), pieza(T, 'function supCur('), pieza(T, 'function supNextOf('), pieza(T, 'const SQ_ST')].join('\n'), c);
const J = x => JSON.parse(JSON.stringify(x));

test('un proyecto de antes (sin nada del lote AD) se limpia sin perder nada', () => {
  const old = { takes: { s1: [{ n: 1, st: 'ng', t: '07:42', note: 'foco' }, { n: 2, st: 'bn', t: '07:46', r: 'A001', s: 'MOS' }] }, sc: { 1: { start: '07:30', end: '08:20', screen: "1'20\"", notes: 'Ana con casaca' } },
    day: { d1: { call: '07:00', first: '07:40', wrap: '18:00', extra: '1', inc: 'Lluvia: 20 min', notes: 'Pendiente el 2.4' } }, obs: { s1: 'rácord' }, supervisor: 'Rosa', roll: 'A001', sroll: 'S001' };
  const was = J(old);
  c.supClean(old);
  assert.deepStrictEqual(J(old), was);
});
test('lo nuevo dañado se limpia: fotos sin id, wild sin id, cronómetro inválido, partes que no son objetos', () => {
  const S = { takes: { s1: [{ n: 1, st: 'ok', run: 'x' }, { n: 2, st: 'ok', run: 1700000000000 }] }, sc: { 1: { ph: [{ id: 'f1', w: 4, h: 3 }, { w: 1 }, null, { id: '../x' }], wild: [{ id: 'w1', s: 'S1' }, 'x'] }, 2: 'mal', 3: { ph: 'x' } },
    day: { d1: { ph: [] }, d2: [] }, mos: [], obs: 'x' };
  c.supClean(S);
  assert.deepStrictEqual(J(S.takes.s1), [{ n: 1, st: 'ok' }, { n: 2, st: 'ok', run: 1700000000000 }]);
  assert.deepStrictEqual(J(S.sc), { 1: { ph: [{ id: 'f1', w: 4, h: 3 }], wild: [{ id: 'w1', s: 'S1' }] }, 3: {} });
  assert.deepStrictEqual(J(S.day), { d1: {} });
  assert.ok(!('mos' in S) && !('obs' in S));
  const E = {}; c.supClean(E); assert.deepStrictEqual(J(E), { takes: {}, sc: {}, day: {} });
});
test('los tiempos: «1:20», «1\'20"», «80», «45 s», «2 min» y el formato m:ss', () => {
  for (const [v, s] of [['1:20', 80], ["1'20\"", 80], ['1′20″', 80], ['80', 80], ['45 s', 45], ['2 min', 120], ['1:02:30', 3750], ['', null], ['abc', null], ['0:42', 42]]) assert.strictEqual(c.supSecs(v), s, v);
  assert.strictEqual(c.supFmt(109), '1:49'); assert.strictEqual(c.supFmt(3750), '1:02:30'); assert.strictEqual(c.supFmt(null), '');
  assert.strictEqual(c.supClock(18400), '00:18'); assert.strictEqual(c.supClock(3725000), '1:02:05');
});
test('el tiempo previsto: el anotado o una página = un minuto (octavos × 7,5 s)', () => {
  c.P.sup.sc = { 1: {}, 2: { plan: '1:10' } };
  assert.strictEqual(c.supPlanSecs('1'), 23);   // 3/8 de página
  assert.strictEqual(c.supPlanSecs('2'), 70);
  c.P.sup.sc[1].screen = '0:45'; assert.strictEqual(c.supRealSecs('1'), 45); assert.strictEqual(c.supRealSecs('2'), null);
});
test('el cronómetro: al parar queda la duración; una toma olvidada (más de una hora) no la anota', () => {
  const t = { n: 1, st: 'ok', run: Date.now() - 32500 };
  assert.ok(c.supStop(t)); assert.strictEqual(t.d, '0:32'); assert.ok(!('run' in t));
  assert.ok(!c.supStop(t));
  const u = { n: 2, st: 'ok', d: '0:10', run: Date.now() - 2 * 3600e3 };
  c.supStop(u); assert.strictEqual(u.d, '0:10'); assert.ok(!('run' in u));
  c.P.sup.takes = { a: [{ n: 1, run: Date.now() - 5000 }], b: [{ n: 1 }, { n: 2, run: Date.now() - 1000 }] };
  assert.strictEqual(c.supStopAll(), 2);
  assert.strictEqual(c.supCurTake('b').n, 2);
});
test('MOS: la toma de un plano MOS lo hereda; los rollos usados no cuentan MOS y suman el sonido wild', () => {
  c.P.sup = { takes: { s1: [{ n: 1, r: 'A001', s: 'S001' }, { n: 2, r: 'A001', s: 'mos' }], s2: [{ n: 1, r: 'A002', s: 'S002' }] }, sc: { 1: { wild: [{ id: 'w', s: 'S009' }] } }, day: {}, mos: { s2: 1 } };
  const shots = [{ id: 's1', sc: '1' }, { id: 's2', sc: '1' }];
  assert.strictEqual(c.takeSnd('s2', c.P.sup.takes.s2[0]), 'MOS');
  assert.strictEqual(c.takeSnd('s1', c.P.sup.takes.s1[0]), 'S001');
  assert.deepStrictEqual(J(c.supRolls(shots)), ['A001', 'A002']);
  assert.deepStrictEqual(J(c.supRolls(shots, 's')), ['S001', 'S009']);
});
test('las incidencias: una por línea con su hora; las de antes (sin hora) quedan como texto', () => {
  const L = c.supIncs('08:10 12 min de demora: el mototaxi\n\nLluvia toda la mañana');
  assert.deepStrictEqual(J(L), [{ t: '08:10', x: '12 min de demora: el mototaxi' }, { t: '', x: 'Lluvia toda la mañana' }]);
  assert.strictEqual(c.supIncJoin(L), '08:10 12 min de demora: el mototaxi\nLluvia toda la mañana');
  assert.strictEqual(c.supIncJoin([{ t: '09:00', x: '' }, { t: '', x: '' }]), '09:00');
  assert.deepStrictEqual(J(c.supIncs('09:00')), [{ t: '09:00', x: '' }], 'la recién agregada: solo su hora');
});
test('la primera y la última toma con hora; la duración de la jornada pasa la medianoche', () => {
  c.P.sup.takes = { s1: [{ t: '10:05' }, { t: '' }], s2: [{ t: '07:52' }, { t: '13:40' }] };
  assert.deepStrictEqual(J(c.supFirstLast([{ id: 's1' }, { id: 's2' }])), ['07:52', '13:40']);
  assert.strictEqual(c.supLen('18:00', '02:30'), '8:30');
});
test('en cámara: el elegido (aunque esté rodado) o el primero sin rodar; el que sigue, el próximo sin rodar', () => {
  const s = [{ id: 'a', done: true }, { id: 'b' }, { id: 'c', done: true }, { id: 'd' }];
  vm.runInContext('var UI = {};', c);
  assert.strictEqual(c.supCur(s).id, 'b');
  c.UI.supCur = 'c'; assert.strictEqual(c.supCur(s).id, 'c');
  assert.strictEqual(c.supNextOf(s, s[2]).id, 'd');
  assert.strictEqual(c.supNextOf(s, s[3]).id, 'b');
  const one = [{ id: 'x' }]; assert.strictEqual(c.supNextOf(one, one[0]), null);
});
test('carga rápida: el estado escrito a mano (B, OK, NG y sus variantes)', () => {
  for (const [v, s] of [['b', 'bn'], ['B', 'bn'], ['buena', 'bn'], ['P', 'bn'], ['ok', 'ok'], ['', 'ok'], ['o', 'ok'], ['ng', 'ng'], ['N', 'ng'], ['x', 'ng'], ['zz', null]]) assert.strictEqual(c.SQ_ST(v), s, v);
});
test('las fotos de la hoja de script («sp~») viajan con su sección («hoja»), también en el escritorio', () => {
  assert.strictEqual(A.frameSec('sp~f1'), 'hoja');
  assert.ok(A.FRAME_SECS.includes('hoja'));
  assert.strictEqual(A.frameSec('s1~c~x'), 'storyboard');
  assert.strictEqual(c.spKey('f9'), 'sp~f9');
  assert.ok(/sec === 'hoja' \? 'de la hoja de script'/.test(leer('server/lib/api.js')));
});
test('las fotos se comprimen a WebP con calidad 90 % (imgEncode, sin tope) y van a FRAMES como las demás', () => {
  assert.ok(!/SUP_TOP/.test(leer(T)));
  assert.ok(/photosAdd\(files, \{ keyOf: spKey, paint/.test(leer(T)));
  assert.ok(/compressPhoto\(f, o\.top\)/.test(leer('laminas.js')));
  assert.ok(/imgEncode\(await imgCanvas\(file, \{ max: IMG_MAX \}\), top \? \{ top \} : \{\}\)/.test(leer('laminas.js')));
});
test('el dictado usa Web Speech en el idioma de la app; sin soporte, no hay botón', () => {
  const s = leer(T);
  assert.ok(/window\.SpeechRecognition \|\| window\.webkitSpeechRecognition/.test(s));
  assert.ok(/r\.lang = EN \? 'en-US' : 'es-PE'/.test(s));
  assert.ok(/\$\{SUP_SR \? `<button type="button" class="hs-mic/.test(s));
});
test('la foto de continuidad del celular abre la cámara', () => {
  assert.ok(/capture="environment" data-bind="sup-ph" data-k=/.test(leer(T)));
});

test('la hoja para imprimir: las columnas de la muestra (px × 0,75 en pt), 7 planos por hoja y el parte al final', () => {
  const S = 'sup-partes.js';
  vm.runInContext(pieza(S, 'const HS_COLW') + pieza(S, 'const hsCols'), c);
  assert.deepStrictEqual(J(c.HS_COLW), [44, 98, 48, 42, 46, 46].map(x => x * .75));
  assert.deepStrictEqual(J(c.hsCols(30)), [30, 63, 136.5, 172.5, 204, 238.5, 273]);
  const src = leer(S);
  assert.ok(/const HS_M = 30, HS_TAKE = 20\.25, HS_STRIP = 15, HS_PER = 7/.test(src), 'márgenes de 40 px, filas de 27 px, 7 planos');
  assert.ok(/for \(let i = 0; i < 3; i\+\+\) y = hsTakeRow/.test(src), '3 filas de tomas por plano');
  assert.ok(/\{ mos: supMos\(sh\.id\) \}/.test(src), 'MOS impreso en la franja del plano');
  assert.ok(/if \(blank \|\| X\.day\) \{ doc\.addPage\('a4', 'portrait'\); const p0 = doc\.getNumberOfPages\(\); hsParte\(doc, X, !blank\)/.test(src), 'la última hoja: el parte diario');
  assert.ok(/\[\['bn', 'B'\], \['ok', 'OK'\], \['ng', 'NG'\]\]/.test(src), '○ B ○ OK ○ NG en Estado');
});
test('Exportar: la hoja para imprimir, la llena, el parte diario y los reportes (pdfSup elige)', () => {
  assert.ok(/pdfItem\('Hoja para imprimir \(PDF\)', 'sup', '[^']+', \{ blank: true \}\)/.test(leer(T)));
  assert.ok(/function pdfSup\(opts = \{\}\) \{ return pdfSupSheet\(!!\(opts && opts\.blank\)\); \}/.test(leer('pdf.js')));
  for (const k of ["'parte'", "'camrep'", "'sndrep'"]) assert.ok(leer(T).includes(k), k);
});
test('el inglés de lo nuevo está en su bloque de en-manual.json', () => {
  const M = JSON.parse(leer('i18n/en-manual.json'));
  assert.ok(M['// lote AD · script']);
  for (const k of ['Carga rápida', 'Hoja para imprimir (PDF)', 'Tiempo en pantalla', 'Plano MOS', 'Página {0} de {1}', 'Foto de continuidad', 'Nota de la toma', 'Siguiente plano']) assert.ok(M[k], k);
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
