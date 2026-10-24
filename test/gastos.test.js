/* Gastos (lote J): las partidas de las reglas son las del presupuesto, y las sumas por partida.
   node test/gastos.test.js */
const path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
const C = require(R + '/src/core.js');
const A = require(R + '/src/areas.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

const lines = [
  { id: 'l-art', sec: 'art', name: 'Atrezzo', qty: 1, mult: 1, rate: 450 },
  { id: 'l-food', sec: 'food', name: 'Alimentación', qty: 1, mult: 1, rate: 1000 },
  { id: 'l-pre', sec: 'pre', name: 'Casting', qty: 1, mult: 1, rate: 3600 },
];
const P = { budget: { currency: 'S/', contingency: 10, igv: false, igvRate: 18, lines }, gastos: {
  ocs: [
    { id: 'o1', line: 'l-art', sec: 'art', amount: 312, igv: true, state: 'paid' },        // gastado (sin IGV: 312)
    { id: 'o2', line: 'l-art', sec: 'art', amount: 36, state: 'ok' },                      // comprometido
    { id: 'o3', line: 'l-art', sec: 'art', amount: 999, state: 'void' },                   // anulada: no cuenta
    { id: 'o4', line: 'l-art', sec: 'art', amount: 50, state: 'draft' },                   // borrador: no cuenta
    { id: 'o5', line: 'gone', sec: 'food', amount: 85, state: 'paid' },                    // línea que ya no está: su partida
  ],
  cajas: [{ id: 'c1', given: [{ id: 'g', amount: 800 }], recibos: [
    { id: 'r1', line: 'l-food', amount: 1000, kind: 'factura', ok: { by: 'x' } },
    { id: 'r2', line: 'l-art', amount: 48, kind: 'sc' },
    { id: 'r3', line: 'l-art', amount: 500, kind: 'boleta', void: { why: 'duplicado' } },
  ] }, { id: 'c2', given: [{ id: 'g2', amount: 100 }], recibos: [], closed: { how: 'devuelto', amount: 100 } }],
  reemb: [{ id: 'b1', line: 'l-pre', amount: 25, state: 'ok' }, { id: 'b2', line: 'l-pre', amount: 40, state: 'paid' }, { id: 'b3', line: 'l-pre', amount: 70, state: 'pend' }],
} };

test('las partidas de las reglas (areas.js) son las del presupuesto (core.js · BUD_SECTIONS)', () => {
  assert.deepStrictEqual(A.GA_SECS, C.BUD_SECTIONS.map(s => s.id));
  for (const secs of Object.values(A.GA_ROLE_SECS)) for (const s of secs) assert.ok(A.GA_SECS.includes(s), s);
});
test('las sumas por partida: comprometido y gastado; lo anulado y los borradores no cuentan', () => {
  const G = C.gastosTotals(P);
  assert.deepStrictEqual(G.bySec.art, { comp: 36, spent: 312 + 48 });
  assert.deepStrictEqual(G.bySec.food, { comp: 0, spent: 85 + 1000 });
  assert.deepStrictEqual(G.bySec.pre, { comp: 25, spent: 40 });
  assert.strictEqual(G.comp, 36 + 25); assert.strictEqual(G.spent, 312 + 48 + 85 + 1000 + 40);
  assert.strictEqual(G.nComp, 2);
  assert.deepStrictEqual(G.byLine['l-art'], { comp: 36, spent: 360 });
});
test('la suma de las partidas cuadra con el total, y con las partidas de budgetTotals', () => {
  const G = C.gastosTotals(P), T = C.budgetTotals(P);
  const sum = Object.values(G.bySec).reduce((a, x) => a + x.comp + x.spent, 0);
  assert.strictEqual(sum, G.comp + G.spent);
  for (const s of Object.keys(G.bySec)) assert.ok(s in T.bySec || s === 'gen', s);
});
test('caja chica: entregado, rendido, en mano (solo las cajas abiertas), por revisar y sin comprobante', () => {
  const { caja } = C.gastosTotals(P);
  assert.strictEqual(caja.given, 900); assert.strictEqual(caja.rendered, 1048); assert.strictEqual(caja.inHand, 800 - 1048);
  assert.strictEqual(caja.n, 2); assert.strictEqual(caja.toReview, 1); assert.strictEqual(caja.noReceipt, 48); assert.strictEqual(caja.people, 2);
});
test('al cerrar una caja, el saldo queda en cero: devolviendo lo que sobró o reembolsando lo gastado de más', () => {
  const c = { given: [{ amount: 800 }], recibos: [{ amount: 312, ok: {} }, { amount: 48.5 }, { amount: 99, void: { why: 'x' } }] };
  assert.deepStrictEqual(C.gastosCaja(c), { given: 800, rendered: 360.5, n: 2, toReview: 1, saldo: 439.5 });
  assert.strictEqual(C.gastosCaja({ ...c, closed: { how: 'devuelto', amount: 439.5 } }).saldo, 0);
  const d = { given: [{ amount: 100 }], recibos: [{ amount: 130.25 }], closed: { how: 'reembolsado', amount: 30.25 } };
  assert.strictEqual(C.gastosCaja(d).saldo, 0);
  // las mismas reglas que el servidor (areas.js · gaFilter calcula el cierre)
  const A2 = A.gaFilter({ cajas: [{ id: 'c1', uid: 'u', name: 'Rosa', given: [{ id: 'g', amount: 100 }], recibos: [{ id: 'r', amount: 130.25, ok: { by: 'a' } }] }] },
    { cajas: [{ id: 'c1', uid: 'u', name: 'Rosa', given: [{ id: 'g', amount: 100 }], recibos: [{ id: 'r', amount: 130.25, ok: { by: 'a' } }], closed: { how: 'devuelto', amount: 1 } }] },
    { admin: true, uid: 'a' }, { t: 1, name: 'Ana' });
  assert.deepStrictEqual([A2.cajas[0].closed.how, A2.cajas[0].closed.amount], ['reembolsado', 30.25]);
  assert.strictEqual(C.gastosCaja(A2.cajas[0]).saldo, 0);
});
test('una orden con impuesto: monto, impuesto y total con dos decimales', () => {
  assert.deepStrictEqual(C.gastosOc({ amount: 312.46, igv: true }, 18), { net: 312.46, tax: 56.24, total: 368.7 });
  assert.deepStrictEqual(C.gastosOc({ amount: 100, igv: false }, 18), { net: 100, tax: 0, total: 100 });
});
test('los pagos: órdenes pagadas con impuesto, reembolsos pagados y la caja chica (lo devuelto resta)', () => {
  const Q = { budget: P.budget, gastos: { ...P.gastos, reemb: [...P.gastos.reemb, { id: 'b4', name: 'Luis', amount: 12, state: 'paid', paid: { date: '2026-10-20' } }] } };
  const rows = C.gastosPagos(Q, 18);
  assert.deepStrictEqual(rows.map(r => r.kind).sort(), ['back', 'give', 'give', 'oc', 'oc', 'rb', 'rb']);
  const o1 = rows.find(r => r.id === 'o1');
  assert.deepStrictEqual([o1.net, o1.tax, o1.amount, o1.sec], [312, 56.16, 368.16, 'art']);
  assert.strictEqual(rows.find(r => r.kind === 'back').amount, -100);
  const total = rows.reduce((a, r) => a + r.amount, 0);
  assert.strictEqual(Math.round(total * 100) / 100, 368.16 + 85 + 40 + 12 + 800 + 100 - 100);
  // ordenados por fecha
  const d = rows.map(r => r.date); assert.deepStrictEqual(d, d.slice().sort());
});
test('el resumen (pantalla y reporte de sobrecostos): las partidas que se pasaron, cuánto y la suma', () => {
  const R = C.gastosResumen(P);
  const art = R.rows.find(r => r.id === 'art');
  assert.deepStrictEqual([art.budget, art.comp, art.spent, art.left, art.over], [450, 36, 360, 54, 0]);
  const food = R.rows.find(r => r.id === 'food');
  assert.deepStrictEqual([food.budget, food.used, food.over], [1000, 1085, 85]);
  assert.deepStrictEqual(R.over.map(r => r.id), ['food'], 'solo alimentación se pasó');
  assert.strictEqual(R.overSum, 85);
  assert.strictEqual(R.left, R.T.sub - R.G.comp - R.G.spent);
  assert.strictEqual(Math.round(R.rows.reduce((a, r) => a + r.used, 0) * 100) / 100, Math.round((R.G.comp + R.G.spent) * 100) / 100, 'las filas suman lo mismo que los totales de arriba');
  // quien no ve el presupuesto: todo presupuestado en cero (no se le muestran montos que no tiene)
  assert.ok(C.gastosResumen(P, false).rows.every(r => r.budget === 0));
});
test('el permiso «gastos» se guarda (y nada más que «ver» o «editar»)', () => {
  assert.deepStrictEqual(A.cleanPerms({ guion: 'ver', gastos: 'editar' }), { guion: 'ver', gastos: 'editar' });
  assert.deepStrictEqual(A.cleanPerms({ gastos: 'todo' }), {});
});
test('los papeles: producción, jefatura, solo ver, jefe de área y los demás', () => {
  assert.strictEqual(A.gaRole({ admin: true }), 'prod');
  assert.strictEqual(A.gaRole({ role: 'Producción', perms: { gastos: 'editar' } }), 'prod');
  assert.strictEqual(A.gaRole({ role: 'Jefatura de producción', perms: { gastos: 'editar' } }), 'jefe');
  assert.strictEqual(A.gaRole({ role: 'Producción ejecutiva', perms: { gastos: 'ver' } }), 'ver');
  assert.strictEqual(A.gaRole({ role: 'Dirección de arte', perms: { gastos: 'editar' } }), 'area');
  assert.strictEqual(A.gaRole({ role: 'Dirección de arte', perms: { gastos: 'ver' } }), 'own', 'un jefe de área con «ver» no ve el resumen');
  assert.strictEqual(A.gaRole({ role: 'Producción', perms: {} }), 'own');
  const can = A.gaCan({ role: 'Jefatura de producción', perms: { gastos: 'editar' } });
  assert.ok(can.ocApprove && can.give && can.review && !can.ocPay && !can.void && !can.close);
});
test('las fotos: «ga~» es de Gastos', () => {
  assert.strictEqual(A.frameSec('ga~oc~o1'), 'gastos');
  assert.strictEqual(A.frameSec('ga~c1~r1'), 'gastos');
  assert.strictEqual(A.frameSec('bd~e1'), 'desglose');
});

console.log(fail ? `${fail} fallan` : 'todas pasan');
process.exit(fail ? 1 : 0);
