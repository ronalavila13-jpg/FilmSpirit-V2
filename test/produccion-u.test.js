/* Lote U · producción: la hora de un plano sin límite de escena (shotRetime), ordenar el stripboard por columna sin
   cambiar escenas de jornada (sortInDays), las tiras estándar (stripKey) y lo nuevo de la hoja de llamado al cargar un
   proyecto (callNormalize: canales de radio y el largo de una escena en la hoja). node test/produccion-u.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

// solo las funciones: el resto necesita la app entera
const call = fs.readFileSync(R + '/src/tab-call.js', 'utf8').replace(/\r\n/g, '\n'), plan = fs.readFileSync(R + '/src/tab-plan.js', 'utf8').replace(/\r\n/g, '\n');
const fn = (src, name) => { const m = new RegExp(`function ${name}\\([\\s\\S]*?\\n}\\n`).exec(src); assert.ok(m, name + ' está'); return m[0]; };
const line = (src, name) => { const m = new RegExp(`^const ${name} = .*$`, 'm').exec(src); assert.ok(m, name + ' está'); return m[0]; };
const c = { Math, isFinite, Object, Array, String };
vm.createContext(c);
vm.runInContext([fn(call, 'shotOffsets'), fn(call, 'shotRetime'), fn(plan, 'sortInDays'), line(plan, 'stripDN'), line(plan, 'stripKey'), fn(call, 'callNormalize'),
  'this.shotOffsets = shotOffsets; this.shotRetime = shotRetime; this.sortInDays = sortInDays; this.stripKey = stripKey; this.callNormalize = callNormalize;'].join('\n'), c);
const J = x => JSON.parse(JSON.stringify(x));

/* ---------- la hora de un plano ---------- */
// una escena de 07:00 (420) a 07:45 con tres planos repartidos parejo: 07:00, 07:15, 07:30
const base = { start: 420, dur: 45, pos: [0, 15, 30], fix: [null, null, null] };
test('dentro de su tramo: el plano queda fijo y la escena no cambia', () => {
  const r = c.shotRetime({ ...base, i: 1, m: 430 });
  assert.deepStrictEqual(J(r), { start: 420, dur: 45, fix: [null, 10, null] });
});
test('después del fin: la escena se alarga y el plano conserva su tiempo (antes se recortaba)', () => {
  const r = c.shotRetime({ ...base, i: 2, m: 475 });   // 07:55
  assert.strictEqual(r.start, 420);
  assert.strictEqual(r.dur, 70, 'termina 08:10: los 15 minutos del último plano después de las 07:55');
  assert.deepStrictEqual(J(r.fix), [null, null, 55]);
});
test('antes del comienzo: la escena empieza antes y los planos de antes conservan su tiempo', () => {
  const r = c.shotRetime({ ...base, i: 2, m: 410 });   // 06:50
  assert.strictEqual(r.start, 380, 'empieza 06:20: los 30 minutos de los dos primeros planos');
  assert.strictEqual(r.start + r.dur, 465, 'el fin no cambia');
  assert.deepStrictEqual(J(r.fix), [null, null, 30]);
});
test('el primer plano corre la escena entera', () => {
  const r = c.shotRetime({ ...base, i: 0, m: 435 });
  assert.deepStrictEqual(J(r), { start: 435, dur: 45, fix: [null, null, null] });
});
test('un plano fijo que estorba se corre lo mismo: el orden de los planos se mantiene', () => {
  const o = { start: 420, dur: 45, pos: [0, 17.5, 35], fix: [null, null, 35] };
  const r = c.shotRetime({ ...o, i: 1, m: 460 });   // 07:40, después del fijo de 07:35
  // el plano 2 iba a las 07:17:30 (repartido): se atrasa 22,5 minutos y el fijo de 07:35 se corre lo mismo
  assert.deepStrictEqual(J(r.fix), [null, 40, 57.5]);
  assert.ok(r.fix[1] < r.fix[2], 'en orden');
  assert.strictEqual(r.start + r.dur, 487.5, 'la escena termina cuando termina su último plano (sus 10 minutos)');
  // y lo que devuelve se reparte bien con shotOffsets (lo que dibuja la hoja)
  const p = c.shotOffsets([{ id: 'a' }, { id: 'b' }, { id: 'c' }], r.dur, { b: r.fix[1], c: r.fix[2] });
  assert.deepStrictEqual(J(p.pos), [0, 40, 57.5]);
});
test('hacia atrás, el fijo de antes que estorba también se corre', () => {
  const o = { start: 420, dur: 60, pos: [0, 10, 20, 40], fix: [null, 10, null, 40] };
  const r = c.shotRetime({ ...o, i: 3, m: 425 });   // 07:05, antes del fijo de 07:10
  assert.ok(r.fix[1] < r.fix[3], 'en orden');
  assert.ok(r.start <= 420 + 0, 'la escena empieza a tiempo o antes');
  assert.strictEqual(r.start + r.dur, 480, 'el fin no cambia');
});
test('jornadas que pasan la medianoche', () => {
  const r = c.shotRetime({ start: 1410, dur: 60, pos: [0, 30], fix: [null, null], i: 1, m: 10 });   // 23:30 · 00:10
  assert.deepStrictEqual(J(r), { start: 1410, dur: 60, fix: [null, 40] });
});

/* ---------- ordenar el stripboard ---------- */
test('ordenar: dentro de cada jornada y en «Sin programar»; los eventos y los cortes se quedan en su lugar', () => {
  const it = [{ k: '1' }, { e: 'almuerzo' }, { k: '2' }, { k: '3' }, { d: 'j1' }, { k: '4' }, { k: '5' }, { d: 'j2' }, { k: '7' }, { k: '6' }];
  const out = c.sortInDays(it, x => +x.k, -1).map(x => x.k || x.e || x.d);
  assert.deepStrictEqual(out, ['3', 'almuerzo', '2', '1', 'j1', '5', '4', 'j2', '7', '6']);
  const asc = c.sortInDays(it, x => +x.k, 1).map(x => x.k || x.e || x.d);
  assert.deepStrictEqual(asc, ['1', 'almuerzo', '2', '3', 'j1', '4', '5', 'j2', '6', '7']);
});
test('ordenar: los iguales conservan su orden y lo vacío va al final (en los dos sentidos)', () => {
  const it = [{ k: 'a', v: 'B' }, { k: 'b', v: '' }, { k: 'c', v: 'A' }, { k: 'd', v: 'B' }, { d: 'x' }];
  assert.deepStrictEqual(c.sortInDays(it, x => x.v, 1).map(x => x.k || x.d), ['c', 'a', 'd', 'b', 'x']);
  assert.deepStrictEqual(c.sortInDays(it, x => x.v, -1).map(x => x.k || x.d), ['a', 'd', 'c', 'b', 'x']);
  assert.deepStrictEqual(it.map(x => x.k || x.d), ['a', 'b', 'c', 'd', 'x'], 'no cambia la lista de entrada');
});

/* ---------- las tiras estándar ---------- */
test('tiras: interior de día blanca, exterior de día amarilla, interior de noche azul, exterior de noche verde, amanecer y atardecer rosa', () => {
  const k = (ie, dn, tod = '') => c.stripKey({ ie, dn, tod });
  assert.strictEqual(k('INT', 'D', 'DÍA'), 'di');
  assert.strictEqual(k('EXT', 'D', 'DÍA'), 'd');
  assert.strictEqual(k('INT', 'N', 'NOCHE'), 'n');
  assert.strictEqual(k('EXT', 'N', 'NOCHE'), 'ne');
  assert.strictEqual(k('INT/EXT', 'N', 'NOCHE'), 'ne', 'INT/EXT va como exterior');
  assert.strictEqual(k('EXT', 'D', 'ATARDECER'), 'dd');
  assert.strictEqual(k('INT', 'D', 'AMANECER'), 'dd');
  assert.strictEqual(k('EXT', 'N', 'DUSK'), 'dd');
});
test('la leyenda tiene las tres tiras nuevas y el plan y la hoja de llamado las muestran', () => {
  const lg = fs.readFileSync(R + '/src/leyenda.js', 'utf8').replace(/\r\n/g, '\n');
  for (const key of ['di', 'ne', 'dd']) assert.ok(new RegExp(`\\n    ${key}: \\['`).test(lg), 'LG.plan.' + key);
  assert.ok(/const LG_STRIPS = \['di', 'd', 'n', 'ne', 'dd'\]/.test(lg));
});

/* ---------- la hoja de llamado al cargar un proyecto ---------- */
test('canales de radio y largo de escena: se limpian al cargar (proyectos viejos abren igual)', () => {
  const P1 = { call: { radio: '  1 Producción\n2 Libre ' + 'x'.repeat(400), days: { a: { dur: { 'k:1|': 60, 'k:2|': -5, 'k:3|': 'x', 'k:4|': 5000 } }, b: { dur: [1, 2] } } } };
  c.callNormalize(P1);
  assert.ok(P1.call.radio.length <= 300 && !/\n/.test(P1.call.radio), 'una línea, hasta 300');
  assert.deepStrictEqual(J(P1.call.days.a.dur), { 'k:1|': 60 });
  assert.strictEqual(P1.call.days.b.dur, undefined);
  const P2 = { call: { radio: 42, days: {} } }; c.callNormalize(P2); assert.strictEqual(P2.call.radio, undefined);
  const P3 = { call: { radio: '   ', days: {} } }; c.callNormalize(P3); assert.strictEqual(P3.call.radio, undefined);
  const P4 = { call: { crew: [] } }; c.callNormalize(P4); assert.deepStrictEqual(J(P4), { call: { crew: [] } }, 'sin días: nada cambia');
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
