'use strict';
/* Gastos (lote J): órdenes de compra, caja chica, reembolsos y sus fotos. Cada persona recibe y guarda solo lo suyo;
   el plan Free e Indie no lo tienen; las fotos cuentan para el espacio del plan. */
process.env.PRO_STORAGE_MB = '2';     // espacio chico para probar que las fotos de los recibos cuentan
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, client, listen } = require('./helpers');

let S, ana, luis, rosa, carla, pepe, pid;
const ids = {};
const LINES = [
  { id: 'l-art', sec: 'art', name: 'Atrezzo', qty: 1, unit: 'global', mult: 1, rate: 450 },
  { id: 'l-snd', sec: 'sound', name: 'Kit de sonido', qty: 1, unit: 'día', mult: 2, rate: 150 },
  { id: 'l-ward', sec: 'ward', name: 'Vestuario', qty: 1, unit: 'global', mult: 1, rate: 1040 },
];
const sections = () => ({
  guion: JSON.stringify({ meta: { title: 'Gastos' }, paras: [] }),
  presupuesto: JSON.stringify({ budget: { currency: 'S/', contingency: 10, igv: false, igvRate: 18, lines: LINES } }),
  gastos: JSON.stringify({ ocs: [{ id: 'x', num: 'OC-999', vendor: 'colado al crear', amount: 1, state: 'paid' }] }),
});
const getG = async C => { const r = await C.get(`/api/p/${pid}/s/gastos`); assert.equal(r.status, 200, r.text); return { v: r.json.v, g: JSON.parse(r.json.json) }; };
const putG = (C, v, g, more) => C.put(`/api/p/${pid}/s/gastos`, { json: JSON.stringify(g), base: v, c: 'c' + Math.random(), ...(more || {}) });
const today = () => new Date().toISOString().slice(0, 10);
/* una imagen JPEG de verdad para el servidor (cabecera con su tamaño) y de unos «kb» kilobytes */
const jpeg = kb => { const head = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x00, 0x01, 0x40, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]); return 'data:image/jpeg;base64,' + Buffer.concat([head, Buffer.alloc(kb * 1024, 7)]).toString('base64'); };

test.before(async () => {
  S = await start();
  ana = client(S.base); luis = client(S.base); rosa = client(S.base); carla = client(S.base); pepe = client(S.base);
  await ana.post('/api/auth/google', { credential: S.token('ana@prueba.pe', 'Ana') });
  S.S.run("UPDATE users SET plan='pro' WHERE email='ana@prueba.pe'");
  const r = await ana.post('/api/projects', { sections: sections(), c: 'cA' });
  assert.equal(r.status, 201, r.text);
  pid = r.json.pid;
  const t = await ana.put(`/api/p/${pid}/team`, { list: [
    { add: true, email: 'luis@prueba.pe', role: 'Jefatura de producción', perms: { guion: 'ver', presupuesto: 'editar', gastos: 'editar' } },
    { add: true, email: 'rosa@prueba.pe', role: 'Dirección de arte', perms: { guion: 'ver', desglose: 'editar', areas: ['props'], gastos: 'editar' } },
    { add: true, email: 'carla@prueba.pe', role: 'Vestuario y maquillaje', perms: { guion: 'ver' } },
    { add: true, email: 'pepe@prueba.pe', role: 'Producción ejecutiva', perms: { guion: 'ver', presupuesto: 'ver', gastos: 'ver' } },
  ] });
  assert.equal(t.status, 200, t.text);
  for (const [C, e, n] of [[luis, 'luis', 'Luis'], [rosa, 'rosa', 'Rosa'], [carla, 'carla', 'Carla'], [pepe, 'pepe', 'Pepe']]) {
    await C.post('/api/auth/google', { credential: S.token(e + '@prueba.pe', n) });
    ids[e] = (await C.get('/api/me')).json.id;
  }
  ids.ana = (await ana.get('/api/me')).json.id;
});
test.after(async () => { await S.stop(); });

test('el permiso «gastos» se guarda en el equipo y Gastos no se crea con el proyecto', async () => {
  const st = (await ana.get(`/api/p/${pid}?full=1`)).json;
  const rosaM = st.members.find(m => m.email === 'rosa@prueba.pe');
  assert.equal(rosaM.perms.gastos, 'editar');
  const g = JSON.parse(st.sections.gastos.json);
  assert.equal(st.sections.gastos.v, 0, 'empieza vacío');
  assert.deepEqual(g.ocs, [], 'lo que vino al crear el proyecto no se guardó');
  assert.equal(st.limits.gastos, true);
});

test('Gastos es de Pro y Studio: con Indie o Free no se guarda', async () => {
  S.S.run("UPDATE users SET plan='indie' WHERE email='ana@prueba.pe'");
  let r = await putG(ana, 0, { ocs: [{ id: 'o1', vendor: 'Ferretería', line: 'l-art', amount: 100 }] });
  assert.equal(r.status, 403); assert.equal(r.json.code, 'plan_gastos');
  S.S.run("UPDATE users SET plan='free' WHERE email='ana@prueba.pe'");
  r = await putG(ana, 0, { ocs: [] });
  assert.equal(r.status, 403);
  S.S.run("UPDATE users SET plan='pro' WHERE email='ana@prueba.pe'");
});

test('órdenes de compra: producción las crea aprobadas y numeradas; el jefe de área, en borrador y de su partida', async () => {
  let { v, g } = await getG(ana);
  g.ocs.push({ id: 'o1', vendor: 'Ferretería El Clavo', ruc: '20123456789', line: 'l-art', sec: 'pre', desc: 'Letras de acrílico', amount: '312.456', igv: true, date: today(), state: 'draft', num: 'OC-777', ok: { by: 'otro', name: 'Inventado' } });
  let r = await putG(ana, v, g, { what: 'creó la orden OC-001', ref: 'gastos|oc|o1' });
  assert.equal(r.status, 200, r.text);
  ({ v, g } = await getG(ana));
  const o1 = g.ocs.find(o => o.id === 'o1');
  assert.equal(o1.num, 'OC-001', 'el número lo pone el servidor');
  assert.equal(o1.state, 'ok', 'la de producción nace aprobada');
  assert.equal(o1.ok.by, ids.ana); assert.equal(o1.ok.name, 'Ana');
  assert.equal(o1.sec, 'art', 'la partida sale de su línea del presupuesto');
  assert.equal(o1.amount, 312.46);
  // Rosa (Dirección de arte): una en arte (queda en borrador) y otra en sonido (no es de su área: no entra)
  let R = await getG(rosa);
  R.g.ocs.push({ id: 'o2', vendor: 'Librería Tauro', line: 'l-art', desc: 'Cartulinas', amount: 36, state: 'ok', uid: ids.luis });
  R.g.ocs.push({ id: 'o3', vendor: 'Audio SAC', line: 'l-snd', desc: 'Pilas', amount: 20 });
  r = await putG(rosa, R.v, R.g);
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.json, 'lo que no entró vuelve corregido');
  ({ v, g } = await getG(ana));
  const o2 = g.ocs.find(o => o.id === 'o2');
  assert.equal(o2.state, 'draft'); assert.equal(o2.uid, ids.rosa, 'es de quien la pidió'); assert.equal(o2.num, 'OC-002'); assert.equal(o2.ok, undefined);
  assert.equal(g.ocs.find(o => o.id === 'o3'), undefined, 'en una partida que no es la suya no se crea');
});

test('recorte por persona: el jefe de área ve solo sus órdenes y las partidas sin montos; la asistente sin caja, nada', async () => {
  const st = (await rosa.get(`/api/p/${pid}?full=1`)).json;
  assert.equal(st.sections.presupuesto, null, 'el presupuesto no le llega');
  const g = JSON.parse(st.sections.gastos.json);
  assert.deepEqual(g.ocs.map(o => o.id), ['o2']);
  assert.deepEqual(g.partidas.map(l => l.id).sort(), ['l-art', 'l-snd', 'l-ward']);
  assert.ok(g.partidas.every(l => !('rate' in l) && !('qty' in l)), 'sin montos');
  const c = JSON.parse((await carla.get(`/api/p/${pid}?full=1`)).json.sections.gastos.json);
  assert.deepEqual(c, { ocs: [], cajas: [], reemb: [], motivos: {} });
  const p = JSON.parse((await pepe.get(`/api/p/${pid}?full=1`)).json.sections.gastos.json);
  assert.equal(p.ocs.length, 2, 'producción ejecutiva con «ver» ve todo');
});

test('quien ve todo Gastos sin ver el presupuesto recibe las partidas sin montos, la moneda y el impuesto', async () => {
  const perms = x => ana.put(`/api/p/${pid}/team`, { list: [{ id: ids.pepe, role: 'Producción ejecutiva', perms: x }] });
  assert.equal((await perms({ guion: 'ver', gastos: 'ver' })).status, 200);
  const st = (await pepe.get(`/api/p/${pid}?full=1`)).json;
  assert.equal(st.sections.presupuesto, null);
  const g = JSON.parse(st.sections.gastos.json);
  assert.equal(g.moneda, 'S/');
  assert.deepEqual(g.impuesto, { name: 'IGV', rate: 18 }, 'para el total con impuesto de cada orden y de los pagos');
  assert.ok(g.partidas.length && g.partidas.every(l => !('rate' in l) && !('qty' in l)), 'sin montos');
  const a = JSON.parse((await ana.get(`/api/p/${pid}?full=1`)).json.sections.gastos.json);
  assert.equal(a.impuesto, undefined, 'quien ve el presupuesto lo toma de ahí');
  assert.equal((await perms({ guion: 'ver', presupuesto: 'ver', gastos: 'ver' })).status, 200);
});

test('aprobar, pagar y anular: cada quien lo suyo', async () => {
  // Rosa no puede aprobar su orden
  let R = await getG(rosa);
  R.g.ocs[0].state = 'ok';
  await putG(rosa, R.v, R.g);
  let { v, g } = await getG(ana);
  assert.equal(g.ocs.find(o => o.id === 'o2').state, 'draft');
  // Pepe (solo ver) tampoco cambia nada
  const P0 = await getG(pepe);
  P0.g.ocs.find(o => o.id === 'o2').state = 'ok'; P0.g.motivos.art = 'escrito por Pepe';
  let r = await putG(pepe, P0.v, P0.g);
  assert.equal(r.status, 200);
  ({ v, g } = await getG(ana));
  assert.equal(g.ocs.find(o => o.id === 'o2').state, 'draft'); assert.equal(g.motivos.art, undefined);
  // Luis (jefatura) aprueba; pagar no puede
  let L = await getG(luis);
  L.g.ocs.find(o => o.id === 'o2').state = 'ok';
  L.g.ocs.find(o => o.id === 'o1').state = 'paid';
  r = await putG(luis, L.v, L.g);
  assert.equal(r.status, 200, r.text);
  ({ v, g } = await getG(ana));
  assert.equal(g.ocs.find(o => o.id === 'o2').state, 'ok'); assert.equal(g.ocs.find(o => o.id === 'o2').ok.name, 'Luis');
  assert.equal(g.ocs.find(o => o.id === 'o1').state, 'ok', 'la jefatura no paga');
  // Ana paga la primera; anular sin motivo no vale; con motivo, sí
  g.ocs.find(o => o.id === 'o1').state = 'paid';
  g.ocs.find(o => o.id === 'o2').state = 'void';
  await putG(ana, v, g);
  ({ v, g } = await getG(ana));
  assert.equal(g.ocs.find(o => o.id === 'o1').state, 'paid'); assert.equal(g.ocs.find(o => o.id === 'o1').paid.date, today());
  assert.equal(g.ocs.find(o => o.id === 'o2').state, 'ok', 'anular pide un motivo');
  g.ocs.find(o => o.id === 'o2').state = 'void'; g.ocs.find(o => o.id === 'o2').void = { why: 'El proveedor no tenía stock' };
  // una orden pagada ya no cambia
  g.ocs.find(o => o.id === 'o1').amount = 1;
  await putG(ana, v, g);
  ({ v, g } = await getG(ana));
  assert.equal(g.ocs.find(o => o.id === 'o2').state, 'void'); assert.equal(g.ocs.find(o => o.id === 'o2').void.why, 'El proveedor no tenía stock');
  assert.equal(g.ocs.find(o => o.id === 'o1').amount, 312.46);
  // lo aprobado no se borra (se anula)
  const ln = g.ocs.length;
  g.ocs = g.ocs.filter(o => o.id !== 'o1');
  await putG(ana, v, g);
  assert.equal((await getG(ana)).g.ocs.length, ln);
});

test('caja chica: la persona recibe solo su caja, rinde sus recibos y no los revisa; lo revisado no cambia; al cerrar cuadra', async () => {
  let { v, g } = await getG(ana);
  g.cajas.push({ id: 'cj1', uid: ids.carla, name: 'Carla Ruiz', role: 'Vestuarista', given: [{ id: 'gv1', amount: 400, date: today() }], recibos: [] });
  g.cajas.push({ id: 'cj2', uid: ids.rosa, name: 'Rosa Quispe', role: 'Directora de arte', given: [{ id: 'gv2', amount: 800, date: today() }], recibos: [] });
  await putG(ana, v, g);
  // Carla ve su caja (y las partidas para elegir); no la de Rosa
  let C = await getG(carla);
  assert.deepEqual(C.g.cajas.map(c => c.id), ['cj1']);
  assert.ok(C.g.partidas.length, 'con caja, le llegan las partidas');
  assert.equal(C.g.cajas[0].given[0].name, 'Ana', 'quién entregó lo anota el servidor');
  // Carla rinde dos recibos, intenta marcarlos revisados y cambiar lo entregado
  C.g.cajas[0].recibos.push({ id: 'r1', date: today(), shop: 'Gamarra', desc: 'Casaca de jean talla S', line: 'l-ward', amount: 95, kind: 'boleta', ok: { by: ids.carla } });
  C.g.cajas[0].recibos.push({ id: 'r2', date: today(), shop: 'Lavandería Express', desc: 'Lavado', line: 'l-ward', amount: 40, kind: 'boleta' });
  C.g.cajas[0].given[0].amount = 4000;
  let r = await putG(carla, C.v, C.g);
  assert.equal(r.status, 200, r.text);
  ({ v, g } = await getG(ana));
  let cj = g.cajas.find(c => c.id === 'cj1');
  assert.equal(cj.recibos.length, 2); assert.equal(cj.recibos[0].ok, undefined, 'no se revisa a sí misma'); assert.equal(cj.recibos[0].by, ids.carla);
  assert.equal(cj.given[0].amount, 400);
  // Rosa no recibe la caja de Carla, y si manda la suya sin la de Carla, la de Carla no se borra
  const R = await getG(rosa);
  assert.deepEqual(R.g.cajas.map(c => c.id), ['cj2']);
  await putG(rosa, R.v, R.g);
  assert.ok((await getG(ana)).g.cajas.find(c => c.id === 'cj1'));
  // Luis revisa el primero
  const L = await getG(luis);
  L.g.cajas.find(c => c.id === 'cj1').recibos[0].ok = { by: 'x' };
  await putG(luis, L.v, L.g);
  // Carla ya no puede cambiar el revisado; el otro lo puede borrar
  C = await getG(carla);
  assert.equal(C.g.cajas[0].recibos[0].ok.name, 'Luis');
  C.g.cajas[0].recibos[0].amount = 9;
  C.g.cajas[0].recibos = C.g.cajas[0].recibos.filter(x => x.id !== 'r2');
  await putG(carla, C.v, C.g);
  ({ v, g } = await getG(ana));
  cj = g.cajas.find(c => c.id === 'cj1');
  assert.equal(cj.recibos.length, 1); assert.equal(cj.recibos[0].amount, 95);
  // Ana cierra: lo entregado (400) menos lo rendido (95) se devuelve
  g.cajas.find(c => c.id === 'cj1').closed = { how: 'reembolsado', amount: 1 };
  await putG(ana, v, g);
  ({ v, g } = await getG(ana));
  cj = g.cajas.find(c => c.id === 'cj1');
  assert.equal(cj.closed.how, 'devuelto'); assert.equal(cj.closed.amount, 305); assert.equal(cj.closed.name, 'Ana');
  // cerrada: no entran más recibos
  C = await getG(carla);
  C.g.cajas[0].recibos.push({ id: 'r3', shop: 'Tarde', amount: 10 });
  await putG(carla, C.v, C.g);
  assert.equal((await getG(ana)).g.cajas.find(c => c.id === 'cj1').recibos.length, 1);
});

test('reembolsos: el jefe de área pide el suyo (pendiente); la jefatura aprueba; producción paga; quien no es jefe de área no pide', async () => {
  const R = await getG(rosa);
  R.g.reemb.push({ id: 'b1', desc: 'Taxi con utilería', line: 'l-art', amount: 25, date: today(), state: 'paid', uid: ids.luis });
  await putG(rosa, R.v, R.g);
  let { v, g } = await getG(ana);
  const b1 = g.reemb.find(x => x.id === 'b1');
  assert.equal(b1.state, 'pend'); assert.equal(b1.uid, ids.rosa);
  const C = await getG(carla);
  C.g.reemb.push({ id: 'b2', desc: 'Pasaje', amount: 5 });
  await putG(carla, C.v, C.g);
  assert.equal((await getG(ana)).g.reemb.find(x => x.id === 'b2'), undefined);
  const L = await getG(luis);
  L.g.reemb.find(x => x.id === 'b1').state = 'ok';
  await putG(luis, L.v, L.g);
  ({ v, g } = await getG(ana));
  g.reemb.find(x => x.id === 'b1').state = 'paid';
  await putG(ana, v, g);
  assert.equal((await getG(ana)).g.reemb.find(x => x.id === 'b1').state, 'paid');
});

test('fotos de recibos: cada quien las de lo suyo; cuentan para el espacio del plan', async () => {
  const k = 'ga~cj2~r9';
  // Rosa sube la foto de un recibo de su caja; Carla no puede subir en la caja de Rosa
  let r = await rosa.put(`/api/p/${pid}/f`, { k, url: jpeg(300) });
  assert.equal(r.status, 200, r.text);
  r = await carla.put(`/api/p/${pid}/f`, { k: 'ga~cj2~r8', url: jpeg(10) });
  assert.equal(r.status, 403);
  // la ven Rosa y producción; Carla no
  assert.ok((await rosa.post(`/api/p/${pid}/frames/get`, { keys: [k] })).json.frames[k]);
  assert.ok((await ana.post(`/api/p/${pid}/frames/get`, { keys: [k] })).json.frames[k]);
  assert.equal((await carla.post(`/api/p/${pid}/frames/get`, { keys: [k] })).json.frames[k], undefined);
  assert.ok(k in (await ana.get(`/api/p/${pid}/frames`)).json);
  assert.ok(!(k in (await carla.get(`/api/p/${pid}/frames`)).json));
  // la caja cerrada de Carla ya no acepta fotos
  r = await carla.put(`/api/p/${pid}/f`, { k: 'ga~cj1~r7', url: jpeg(10) });
  assert.equal(r.status, 403);
  // el espacio: el plan Pro de esta prueba tiene 2 MB; tres fotos de 900 kB no entran
  let last = 200;
  for (const n of [1, 2, 3]) { r = await rosa.put(`/api/p/${pid}/f`, { k: 'ga~cj2~big' + n, url: jpeg(900) }); last = r.status; if (last !== 200) break; }
  assert.equal(last, 413); assert.equal(r.json.code, 'quota');
  // y es de Pro y Studio
  S.S.run("UPDATE users SET plan='indie' WHERE email='ana@prueba.pe'");
  r = await ana.put(`/api/p/${pid}/f`, { k: 'ga~oc~o1', url: jpeg(5) });
  assert.equal(r.status, 403); assert.equal(r.json.code, 'plan_gastos');
  S.S.run("UPDATE users SET plan='pro' WHERE email='ana@prueba.pe'");
});

test('la actividad y los avisos de Gastos con detalle llegan solo a quien ve todo', async () => {
  const a = listen(S.base, ana.cookie, pid), b = listen(S.base, rosa.cookie, pid);
  await a.wait(e => e.t === 'hello'); await b.wait(e => e.t === 'hello');
  const { v, g } = await getG(ana);
  g.motivos.art = 'Letras nuevas: las originales llegaron rotas';
  const r = await putG(ana, v, g, { what: 'escribió el motivo del sobrecosto de Arte', ref: 'gastos|sec|art' });
  assert.equal(r.status, 200, r.text);
  const ea = await a.wait(e => e.t === 'sec' && e.sec === 'gastos'), eb = await b.wait(e => e.t === 'sec' && e.sec === 'gastos');
  assert.ok(ea && eb, 'los dos saben que hay una versión nueva');
  assert.equal(ea.what, 'escribió el motivo del sobrecosto de Arte');
  assert.equal(eb.what, undefined, 'el jefe de área no recibe el detalle'); assert.equal(eb.by, undefined);
  await a.stop(); await b.stop();
  const ra = (await ana.get(`/api/p/${pid}/activity`)).json.items, rb = (await rosa.get(`/api/p/${pid}/activity`)).json.items;
  assert.ok(ra.some(x => x.sec === 'gastos'));
  assert.ok(!rb.some(x => x.sec === 'gastos'));
  // el motivo no le llega a Rosa en su vista
  assert.deepEqual((await getG(rosa)).g.motivos, {});
});

test('datos que no son válidos se limpian: montos, fechas, textos largos y estados inventados', async () => {
  const { v, g } = await getG(ana);
  g.ocs.push({ id: 'o9', vendor: 'x'.repeat(5000), amount: -50, date: '2026-02-31', state: 'robada', pay: 'bitcoin', line: 'l-art' });
  g.ocs.push({ id: 'mal id con espacios', vendor: 'no', amount: 1 });
  const r = await putG(ana, v, g);
  assert.equal(r.status, 200, r.text);
  const o9 = (await getG(ana)).g.ocs.find(o => o.id === 'o9');
  assert.equal(o9.vendor.length, 120); assert.equal(o9.amount, 0); assert.equal(o9.date, ''); assert.equal(o9.state, 'ok'); assert.equal(o9.pay, 'transf');
  assert.equal((await getG(ana)).g.ocs.find(o => o.id === 'mal id con espacios'), undefined);
});

test('una caja con recibos sin revisar no se cierra', async () => {
  let { v, g } = await getG(ana);
  g.cajas.push({ id: 'cj9', uid: ids.carla, name: 'Carla Ruiz', role: 'Vestuarista', given: [{ id: 'gv9', amount: 100, date: today() }], recibos: [] });
  await putG(ana, v, g);
  let C = await getG(carla);
  C.g.cajas.find(c => c.id === 'cj9').recibos.push({ id: 'r9', date: today(), shop: 'Mercado', desc: 'Telas', line: 'l-ward', amount: 30, kind: 'boleta' });
  await putG(carla, C.v, C.g);
  ({ v, g } = await getG(ana));
  g.cajas.find(c => c.id === 'cj9').closed = { how: 'devuelto', amount: 70 };
  await putG(ana, v, g);
  ({ v, g } = await getG(ana));
  assert.equal(g.cajas.find(c => c.id === 'cj9').closed, undefined, 'con un recibo por revisar sigue abierta');
  // revisado, se cierra
  const cj = g.cajas.find(c => c.id === 'cj9');
  cj.recibos[0].ok = { by: 'x' }; cj.closed = { how: 'devuelto', amount: 70 };
  await putG(ana, v, g);
  assert.equal((await getG(ana)).g.cajas.find(c => c.id === 'cj9').closed.amount, 70);
});

test('muchas fotos de recibos no traban la lista de imágenes', async () => {
  const P = require('../lib/perm');
  const cajas = Array.from({ length: 50 }, (_, i) => ({ id: 'c' + i, uid: 'u' + i, name: 'N' + i, given: [], recibos: Array.from({ length: 30 }, (_, j) => ({ id: 'r' + j, shop: 'Tienda ' + j, desc: 'x'.repeat(100), amount: 1 })) }));
  const g = { cajas }, who = { uid: 'u7', perms: { gastos: 'editar' }, role: 'Vestuario' };
  const t = Date.now();
  let n = 0;
  for (const c of cajas) for (const rc of c.recibos) if (P.gaFrameOk(g, who, `ga~${c.id}~${rc.id}`)) n++;
  assert.equal(n, 30, 'solo las de su caja');
  assert.ok(Date.now() - t < 1000, `tardó ${Date.now() - t} ms`);
});
test('fotos de gastos que aún no se guardan: un tope por persona (no llenan el espacio de la cuenta)', async () => {
  // Rosa sube fotos a recibos inventados de su caja hasta el tope; la que sobra queda en espera (429)
  let r, n = 0;
  for (; n < 60; n++) { r = await rosa.put(`/api/p/${pid}/f`, { k: 'ga~cj2~h' + n, url: jpeg(1) }); if (r.status !== 200) break; }
  assert.equal(r.status, 429, r.text); assert.equal(r.json.code, 'rate_limited');
  assert.ok(n > 40 && n <= 50, `entraron ${n}`);
  // cambiar una foto que ya subió sí se puede, y el tope es de cada persona
  assert.equal((await rosa.put(`/api/p/${pid}/f`, { k: 'ga~cj2~h0', url: jpeg(2) })).status, 200);
  assert.equal((await ana.put(`/api/p/${pid}/f`, { k: 'ga~oc~nueva', url: jpeg(1) })).status, 200);
  // al guardar el recibo, su foto deja de contar y vuelve a haber lugar
  const { v, g } = await getG(rosa);
  g.cajas.find(c => c.id === 'cj2').recibos.push({ id: 'h1', date: today(), shop: 'Ferretería', desc: 'Clavos', line: 'l-art', amount: 12, kind: 'boleta' });
  assert.equal((await putG(rosa, v, g)).status, 200);
  assert.ok((await getG(ana)).g.cajas.find(c => c.id === 'cj2').recibos.some(x => x.id === 'h1'));
  assert.equal((await rosa.put(`/api/p/${pid}/f`, { k: 'ga~cj2~h' + n, url: jpeg(1) })).status, 200);
});
