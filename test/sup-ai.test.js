/* Lote AI · hoja de script, «En cámara»: REC arranca y para el cronómetro («+ Toma» deja la toma lista, sin
   contador), un solo MOS (la casilla «Plano MOS») y ‹ › para pasar de plano sin marcarlo (también deslizando en el
   celular); la toma lista que nunca se grabó no cuenta ni sale en los PDF.   node test/sup-ai.test.js */
const vm = require('vm'), assert = require('assert');
const { pieza, leer } = require('./utiles/fuente.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const T = 'tab-sup.js', src = leer(T), css = leer('src/shell.html');
const J = x => JSON.parse(JSON.stringify(x));

const c = { Math, JSON, String, Object, Array, Date, isFinite, parseFloat, Number, RegExp };
vm.createContext(c);
vm.runInContext(`var EN = false, trDone = s => s; var P, UI = {}, D = { code: {} }, SUPV = { phone: false, dir: 0 };
  var renders = 0, changes = 0, toasts = [];
  var render = () => { renders++; }, changed = () => { changes++; }, toast = m => { toasts.push(m); }, requestAnimationFrame = () => {}, $ = () => null;
  var nowHM = () => '09:15', normHM = v => String(v || '').trim();
  var hmToMin = v => { const m = /^(\\d{1,2}):(\\d{2})$/.exec(String(v || '')); return m ? +m[1] * 60 + +m[2] : null; };
  var esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), ea = s => esc(s).replace(/"/g, '&quot;');
  var capFirst = s => s.charAt(0).toUpperCase() + s.slice(1), ICO = { prev: '‹', next: '›' };
  var sceneDone = () => false, scenePages = () => 1, supPlanSecs = () => 0, supRealSecs = () => null;`, c);
vm.runInContext([pieza(T, 'const TAKE_ST'), pieza(T, 'const supTakes'), pieza(T, 'const supRolled'), pieza(T, 'const supMos'), pieza(T, 'const isMos'), pieza(T, 'const takeSnd'),
  pieza(T, 'function supClean('), pieza(T, 'const supFmt'), pieza(T, 'const supClock'), pieza(T, 'const supCurTake'), pieza(T, 'function supStop('), pieza(T, 'const supStopAll'),
  pieza(T, 'function supStats('), pieza(T, 'function supRolls('), pieza(T, 'function supCur('), pieza(T, 'function supNextOf('),
  pieza(T, 'const supStHTML'), pieza(T, 'function supStepHTML('), pieza(T, 'const supNextN'), pieza(T, 'const supAddBtn'), pieza(T, 'const supDoneBtn'),
  pieza(T, 'function supClockHTML('), pieza(T, 'function supMarkHTML('), pieza(T, 'function supTakeNew('), pieza(T, 'function supTakeAdd('), pieza(T, 'function supRec('), pieza(T, 'function supMarkTake('),
  pieza('cabecera.js', 'function hdStep(')].join('\n'), c);
// las acciones de la tarjeta (del objeto ACT), tal cual
const act = k => { const a = src.indexOf(`  '${k}': b => {`); assert(a > 0, k); const b = src.indexOf('\n  },\n', a); return src.slice(a, b + 5); };
vm.runInContext(`var ACT = {\n${act('sup-step')}\n${act('sup-next')}\n${act('sup-mark')}\n};`, c);
const fresh = (takes = {}, extra = {}) => {
  vm.runInContext('renders = 0; changes = 0; toasts = []; UI = { supFold: {} };', c);
  c.P = { shots: { a: { id: 'a', sc: '1' }, b: { id: 'b', sc: '1' }, c: { id: 'c', sc: '2' } }, sup: { takes, sc: {}, day: {}, roll: 'A001', sroll: 'S001', ...extra } };
  c.D.code = { a: '1.1', b: '1.2', c: '2.1' };
};

test('«+ Toma» deja la toma lista: número, tarjeta y sonido, sin hora ni cronómetro; otra vez, la misma', () => {
  fresh({ a: [{ n: 1, st: 'ng', t: '08:00', d: '0:20' }] });
  c.supTakeAdd('a');
  const L = c.P.sup.takes.a, t = L[1];
  assert.deepStrictEqual(J(t), { n: 2, st: 'ok', note: '', r: 'A001', s: 'S001', rdy: 1 });
  assert.strictEqual(c.UI.supCur, 'a'); assert.strictEqual(c.renders, 1);
  c.supTakeAdd('a'); assert.strictEqual(L.length, 2, 'no agrega otra mientras haya una lista');
  fresh({}, { mos: { b: 1 } }); c.supTakeAdd('b');
  assert.strictEqual(c.P.sup.takes.b[0].s, 'MOS', 'plano MOS: la toma lista va sin sonido');
});
test('REC: sin tomas crea la 1 y arranca con la hora; el mismo botón para y deja la duración', () => {
  fresh();
  c.supRec('a');
  const t = c.P.sup.takes.a[0];
  assert.ok(t.run > 0 && t.t === '09:15' && !('rdy' in t) && t.n === 1);
  t.run = Date.now() - 12500;
  c.supRec('a');
  assert.ok(!('run' in t)); assert.strictEqual(t.d, '0:12'); assert.strictEqual(c.P.sup.takes.a.length, 1, 'parar no crea otra');
});
test('REC graba la toma lista (no crea otra); en una toma ya grabada, crea y arranca la siguiente', () => {
  fresh({ a: [{ n: 1, st: 'bn', t: '08:00', d: '0:30' }] });
  c.supTakeAdd('a'); c.supRec('a');
  let L = c.P.sup.takes.a;
  assert.strictEqual(L.length, 2); assert.ok(L[1].run && L[1].t === '09:15' && !L[1].rdy && L[1].r === 'A001');
  c.supMarkTake(L[1], 'ng');
  c.supRec('a'); L = c.P.sup.takes.a;
  assert.strictEqual(L.length, 3); assert.strictEqual(L[2].n, 3); assert.ok(L[2].run);
});
test('REC en otro plano para el cronómetro que corría (y pone ese plano en cámara)', () => {
  fresh({ a: [{ n: 1, st: 'ok', t: '08:00', run: Date.now() - 4000 }] });
  c.supRec('b');
  assert.ok(!c.P.sup.takes.a[0].run && c.P.sup.takes.a[0].d === '0:04');
  assert.ok(c.P.sup.takes.b[0].run); assert.strictEqual(c.UI.supCur, 'b');
});
test('Buena / OK / NG paran el contador; la toma lista marcada sin REC queda grabada con la hora del momento', () => {
  fresh({ a: [{ n: 1, st: 'ok', t: '08:00', run: Date.now() - 7000 }] });
  c.ACT['sup-mark']({ dataset: { id: 'a', v: 'bn' } });
  assert.deepStrictEqual(J(c.P.sup.takes.a[0]), { n: 1, st: 'bn', t: '08:00', d: '0:07' });
  c.supTakeAdd('a'); c.ACT['sup-mark']({ dataset: { id: 'a', v: 'ng' } });
  const t = c.P.sup.takes.a[1];
  assert.ok(!('rdy' in t)); assert.strictEqual(t.st, 'ng'); assert.strictEqual(t.t, '09:15');
});
test('la toma lista no cuenta en el avance ni en las tarjetas usadas (supRolled)', () => {
  fresh({ a: [{ n: 1, st: 'bn', r: 'A001' }, { n: 2, st: 'ok', r: 'A002', rdy: 1 }] });
  assert.deepStrictEqual(J(c.supRolled('a').map(t => t.n)), [1]);
  const S = c.supStats({ keys: [], shots: [{ id: 'a' }] });
  assert.strictEqual(S.takes, 1); assert.strictEqual(S.good, 1);
  assert.deepStrictEqual(J(c.supRolls([{ id: 'a', sc: '1' }])), ['A001']);
});
test('los proyectos guardados: «rdy» solo vale 1 y nunca junto al cronómetro; lo de antes, igual', () => {
  const S = { takes: { a: [{ n: 1, st: 'ok', rdy: true }, { n: 2, st: 'ok', rdy: 0 }, { n: 3, st: 'ok', rdy: 1, run: 1700000000000 }, { n: 4, st: 'ok', t: '07:00', run: 1700000000000 }] } };
  c.supClean(S);
  assert.deepStrictEqual(J(S.takes.a), [{ n: 1, st: 'ok', rdy: 1 }, { n: 2, st: 'ok' }, { n: 3, st: 'ok', run: 1700000000000 }, { n: 4, st: 'ok', t: '07:00', run: 1700000000000 }]);
});
test('la tarjeta: REC junto al cronómetro (■ Parar mientras graba); «Lista» en la toma sin grabar; sin edición, sin REC', () => {
  fresh({ a: [{ n: 1, st: 'ok', t: '08:00', d: '0:20' }] });
  const sh = c.P.shots.a;
  let h = c.supClockHTML(sh, c.P.sup.takes.a[0], 'S001', true);
  assert.ok(/class="hs-rec" data-act="sup-rec" data-id="a" aria-pressed="false" aria-label="Grabar la toma 2"/.test(h), 'REC graba la que sigue');
  assert.ok(/<span>REC<\/span>/.test(h));
  c.P.sup.takes.a.push({ n: 2, st: 'ok', t: '08:05', run: Date.now() - 3000 });
  h = c.supClockHTML(sh, c.P.sup.takes.a[1], 'S001', true);
  assert.ok(/hs-clock rec/.test(h) && /class="hs-rec on"[^>]*aria-pressed="true" aria-label="Parar la toma 2"/.test(h) && /<span>Parar<\/span>/.test(h) && /data-sup-run=/.test(h));
  c.P.sup.takes.a[1] = { n: 2, st: 'ok', note: '', rdy: 1, r: 'A001', s: 'S001' };
  h = c.supClockHTML(sh, c.P.sup.takes.a[1], 'S001', true);
  assert.ok(/hs-st rdy">Lista</.test(h) && /aria-label="Grabar la toma 2"/.test(h) && />00:00</.test(h) && /A001 · S001/.test(h));
  assert.ok(!/hs-rec/.test(c.supClockHTML(sh, c.P.sup.takes.a[1], 'S001', false)), 'sin permiso, no hay REC');
  assert.ok(/data-act="sup-rec"/.test(c.supClockHTML(c.P.shots.b, null, '', true)), 'sin tomas, REC crea la primera');
  // con una toma lista, «+ Toma» no agrega otra
  assert.ok(/data-act="take-add" data-id="a" disabled/.test(c.supAddBtn('a', c.P.sup.takes.a)));
  assert.ok(!/disabled/.test(c.supAddBtn('b', [])) && />\+ Toma 1</.test(c.supAddBtn('b', [])));
  assert.ok(/<span>Rodado · siguiente<\/span>/.test(c.supDoneBtn('a')));
});
test('un solo MOS en la tarjeta: la casilla «Plano MOS»; la toma suelta, en su ventana', () => {
  fresh({ a: [{ n: 1, st: 'ok' }] });
  const h = c.supMarkHTML(c.P.shots.a, c.P.sup.takes.a[0]);
  assert.ok(/data-bind="sup-mos-shot" data-id="a"/.test(h) && /Plano MOS/.test(h));
  assert.ok(!/sup-mos-take|hs-tog/.test(h), 'sin el botón «MOS» de la toma');
  assert.ok(!/sup-mos-take/.test(src), 'la acción ya no existe'); assert.ok(!/\.hs-tog/.test(css), 'ni su estilo');
  assert.ok(/<button type="button" class="btn sm" data-mos /.test(src), 'en la ventana de la toma sigue el MOS de esa toma');
  const L = [{ n: 1, st: 'ok', rdy: 1 }];
  assert.ok(!/aria-pressed="true"/.test(c.supMarkHTML(c.P.shots.a, L[0])), 'la toma lista no tiene estado marcado');
});
test('‹ › recorren todos los planos de la jornada, rodados o no; en los extremos, deshabilitados; sin plano en cámara, ‹ va al último', () => {
  const shots = [{ id: 'a', done: true }, { id: 'b' }, { id: 'c', done: true }];
  let h = c.supStepHTML({ shots, cur: shots[1], ed: true });
  assert.ok(/data-act="sup-step" data-id="a" data-dir="-1"/.test(h) && /data-act="sup-step" data-id="c" data-dir="1"/.test(h), 'al rodado de antes y al de después');
  assert.ok(/Plano anterior/.test(h) && /Plano siguiente/.test(h));
  h = c.supStepHTML({ shots, cur: shots[0], ed: true });
  assert.ok(/class="hd-stepb" disabled/.test(h) && /data-id="b" data-dir="1"/.test(h));
  h = c.supStepHTML({ shots, cur: null, ed: true });
  assert.ok(/data-id="c" data-dir="-1"/.test(h) && (h.match(/disabled/g) || []).length === 1);
  assert.strictEqual(c.supStepHTML({ shots, cur: shots[1], ed: false }), '', 'sin permiso, sin flechas');
});
test('pasar de plano con ‹ › solo cambia el que está en cámara: nada se marca como rodado ni se para', () => {
  fresh({ a: [{ n: 1, st: 'ok', t: '08:00', run: 1700000000000 }] });
  c.P.shots.b.done = true;
  const shots = [c.P.shots.a, c.P.shots.b, c.P.shots.c];
  c.supCtx = () => ({ shots, cur: c.supCur(shots) });
  const was = J(c.P);
  c.ACT['sup-step']({ dataset: { id: 'b', dir: '1' } });
  assert.strictEqual(c.UI.supCur, 'b'); assert.strictEqual(c.SUPV.dir, 1);
  c.ACT['sup-step']({ dataset: { id: 'c', dir: '1' } });
  assert.strictEqual(c.UI.supCur, 'c'); assert.strictEqual(c.UI.supFold['2'], true, 'abre la escena del plano');
  c.ACT['sup-step']({ dataset: { id: 'a', dir: '-1' } });
  assert.deepStrictEqual(J(c.P), was, 'el proyecto queda igual'); assert.strictEqual(c.changes, 0, 'no hay nada que guardar');
});
test('«✓ Rodado · siguiente» marca el plano y pasa al siguiente sin rodar; la toma lista sin nota (nunca grabada) se quita', () => {
  fresh({ a: [{ n: 1, st: 'bn', t: '08:00' }, { n: 2, st: 'ok', note: '', rdy: 1 }], b: [{ n: 1, st: 'ok', note: 'ojo con el foco', rdy: 1 }] });
  const shots = [c.P.shots.a, c.P.shots.b, c.P.shots.c];
  c.supCtx = () => ({ shots, cur: c.supCur(shots) });
  c.ACT['sup-next']({ dataset: { id: 'a' } });
  assert.ok(c.P.shots.a.done); assert.strictEqual(c.UI.supCur, 'b'); assert.deepStrictEqual(J(c.P.sup.takes.a.map(t => t.n)), [1]);
  c.ACT['sup-next']({ dataset: { id: 'b' } });
  assert.strictEqual(c.P.sup.takes.b.length, 1, 'con nota, se queda'); assert.strictEqual(c.UI.supCur, 'c');
});
test('la tarjeta de la computadora y la del celular: flechas, REC, «+ Toma» y «✓ Rodado · siguiente»; deslizar en el celular', () => {
  const cam = src.slice(src.indexOf('function supCamHTML('), src.indexOf('function supClockHTML('));
  assert.ok(/\$\{supStepHTML\(X\)\}/.test(cam) && /supClockHTML\(cur, t, snd, ed\)/.test(cam) && /supAddBtn\(cur\.id, takes\)\}\$\{supDoneBtn\(cur\.id\)\}/.test(cam));
  const ph = src.slice(src.indexOf('function supPhoneHTML('), src.indexOf('function supMTakeHTML('));
  assert.ok(/data-swipe/.test(ph) && /\$\{supStepHTML\(X\)\}/.test(ph) && /supClockHTML\(cur, t, snd, ed\)/.test(ph));
  assert.ok(/supAddBtn\(cur\.id, supTakes\(cur\.id\)\)\}\$\{supDoneBtn\(cur\.id\)\}/.test(src), 'la barra de abajo del celular');
  assert.ok(/supSwipe\(v\);/.test(src) && /Math\.abs\(dx\) < 60 \|\| Math\.abs\(dy\) > Math\.abs\(dx\) \* \.6/.test(src), 'deslizar: horizontal y largo');
  assert.ok(/p\.clientX > 24 && p\.clientX < innerWidth - 24/.test(src), 'no desde los bordes (el gesto de volver)');
  assert.ok(/\.hs-mpl \.hd-stepb\{width:42px;height:42px\}/.test(css), 'flechas para el dedo');
  assert.ok(/@media \(prefers-reduced-motion:reduce\)\{[^}]*\.hs-rec\.on,\.hs-inn,\.hs-inp\{animation:none\}/.test(css));
  assert.ok(/:root\[data-tone="dark"\] \.hs\{[^}]*--hs-rec:#D92632;--hs-rec-t:#FF6B6B\}/.test(css), 'el rojo de REC de noche');
});
test('los PDF y la carga rápida usan las tomas grabadas: la lista que nunca rodó no sale (y la fila de papel con su número la reemplaza)', () => {
  const S = leer('sup-partes.js');
  assert.strictEqual((S.match(/supRolled\(/g) || []).length, 4);
  assert.ok(/const takes = supRolled\(sh\.id\);/.test(S) && /supRolled\(sh\.id\)\.forEach/.test(S));
  assert.ok(/const lastN = sh => \{ const L = supRolled\(sh\.id\)/.test(src) && /const rd = L\.findIndex\(x => x\.rdy && \+x\.n === n\); if \(rd >= 0\) L\.splice\(rd, 1\);/.test(src));
});
test('el inglés de lo nuevo está en su bloque de en-manual.json', () => {
  const M = JSON.parse(leer('i18n/en-manual.json'));
  assert.ok(M['// lote AI · sup']);
  for (const k of ['REC', 'Parar', 'Lista', 'Grabar la toma {0}', 'Parar la toma {0}', 'lista para grabar', 'Rodado · siguiente', '✓ Rodado', 'La toma {0} ya está lista: REC la graba',
    'Deja lista la toma que sigue, con su número, la tarjeta y el sonido en uso: REC la graba', 'Lista, todavía sin grabar: REC anota la hora y arranca el cronómetro.',
    'Con ‹ vuelves al último plano; también puedes tocar el número de un plano en la tabla.']) assert.ok(M[k], k);
  const H = src.slice(src.indexOf('HELP.sup = ['));
  for (const m of H.matchAll(/\['(En cámara|MOS y sonido wild)', '([^']+)'\]/g)) assert.ok(M[m[2]], 'la ayuda: ' + m[1]);
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
