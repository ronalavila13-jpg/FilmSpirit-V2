'use strict';
/* Suscripciones con un Mercado Pago simulado, códigos de influencer, panel y libro de reclamaciones */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');

/* ---------- Mercado Pago de mentira ---------- */
const MPS = { pre: {}, pay: {}, n: 0, calls: [] };
const mock = http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c;
  const b = body ? JSON.parse(body) : {};
  const u = new URL(req.url, 'http://x');
  MPS.calls.push(`${req.method} ${u.pathname}`);
  const send = (st, o) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.headers.authorization !== 'Bearer TEST-TOKEN') return send(401, { message: 'token' });
  let m;
  if (req.method === 'POST' && u.pathname === '/preapproval') {
    const id = 'pre' + (++MPS.n);
    MPS.pre[id] = { id, status: 'pending', ...b, init_point: 'https://mp.test/checkout?preapproval_id=' + id };
    return send(201, MPS.pre[id]);
  }
  if (req.method === 'GET' && u.pathname === '/preapproval/search') return send(200, { results: Object.values(MPS.pre).filter(p => p.external_reference === u.searchParams.get('external_reference')) });
  if ((m = /^\/preapproval\/(\w+)$/.exec(u.pathname))) {
    const p = MPS.pre[m[1]]; if (!p) return send(404, { message: 'no existe' });
    if (req.method === 'PUT') { if (b.status) p.status = b.status; if (b.auto_recurring) Object.assign(p.auto_recurring, b.auto_recurring); }
    return send(200, p);
  }
  if ((m = /^\/authorized_payments\/(\w+)$/.exec(u.pathname)) && MPS.pay[m[1]]) return send(200, MPS.pay[m[1]]);
  send(404, { message: 'no' });
});
const DAY = 864e5;
function authorize(id, payer, days) { const p = MPS.pre[id]; p.status = 'authorized'; p.payer_id = payer; p.next_payment_date = new Date(Date.now() + days * DAY).toISOString(); }
function pay(id) {
  const p = MPS.pre[id], pid = 'ap' + (++MPS.n);
  MPS.pay[pid] = { id: pid, preapproval_id: id, status: 'processed', transaction_amount: p.auto_recurring.transaction_amount, payment: { id: 9000 + MPS.n, status: 'approved' } };
  p.next_payment_date = new Date(Date.parse(p.next_payment_date) + 30 * DAY).toISOString();
  return pid;
}

let S, base, H;
const SECRET = 'secreto-de-prueba';
async function hook(type, id, { sign = true } = {}) {
  const ts = String(Math.floor(Date.now() / 1000)), rq = crypto.randomUUID();
  const v1 = crypto.createHmac('sha256', SECRET).update(`id:${String(id).toLowerCase()};request-id:${rq};ts:${ts};`).digest('hex');
  const r = await fetch(`${base}/api/billing/webhook?data.id=${id}&type=${type}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-request-id': rq, 'x-signature': sign ? `ts=${ts},v1=${v1}` : `ts=${ts},v1=00` }, body: JSON.stringify({ type, data: { id } }) });
  await new Promise(r => setTimeout(r, 120));   // el servidor procesa después de responder
  return r.status;
}
const login = async (c, email, name, ref) => (await c.post('/api/auth/google', { credential: S.token(email, name || email.split('@')[0]), ref })).json;
const user = email => S.S.one('SELECT * FROM users WHERE email=?', email);
const paras = n => JSON.stringify({ meta: { title: 'Guion' }, paras: Array.from({ length: n }, (_, i) => ({ t: i % 4 ? 'action' : 'scene', x: 'Línea ' + i })) });

test.before(async () => {
  await new Promise(r => mock.listen(0, '127.0.0.1', r));
  Object.assign(process.env, { MP_ACCESS_TOKEN: 'TEST-TOKEN', MP_API_BASE: `http://127.0.0.1:${mock.address().port}`, MP_WEBHOOK_SECRET: SECRET });
  H = require('./helpers');
  // precios fijos para estas pruebas (y sin precio de fundador ni lista de espera: eso se prueba en plans.test.js)
  S = await H.start({ ADMIN_EMAILS: 'admin@prueba.pe', PEN_PRO_MONTH: '29', PEN_PRO_YEAR: '290', PEN_STUDIO_MONTH: '80', PEN_STUDIO_YEAR: '800', FOUNDER_UNTIL: '2020-01-01', STUDIO_OPEN: '1' });
  base = S.base;
});
test.after(async () => { await S.stop(); mock.close(); });

test('código de influencer, mes gratis y suscripción autorizada por aviso firmado', async () => {
  const adm = H.client(base); await login(adm, 'admin@prueba.pe', 'Admin');
  let r = await adm.post('/api/admin/codes', { code: 'maria20', label: 'María (Instagram)', pct: 20, cycles: 3, trialDays: 15, maxUses: 2 });
  assert.equal(r.status, 201, r.text);
  const ana = H.client(base); await login(ana, 'ana@prueba.pe', 'Ana');
  r = await ana.get('/api/billing');
  assert.equal(r.json.enabled, true); assert.deepEqual(r.json.prices.PEN.pro, { month: 29, year: 290 }); assert.deepEqual(r.json.prices.PEN.studio, { month: 80, year: 800 }); assert.equal(r.json.trial, true);
  assert.equal(r.json.ref, undefined, 'sin referidos');
  r = await ana.post('/api/billing/quote', { cycle: 'month', code: 'MARIA20' });
  assert.equal(r.json.amount, 23.2); assert.equal(r.json.trialDays, 45); assert.equal(r.json.cycles, 3);
  r = await ana.post('/api/billing/quote', { cycle: 'month', code: 'NOEXISTE' });
  assert.equal(r.status, 400);
  r = await ana.post('/api/billing/checkout', { cycle: 'month', code: 'maria20' });
  assert.equal(r.status, 200, r.text);
  assert.match(r.json.url, /^https:\/\/mp\.test\/checkout/);
  const pre = Object.values(MPS.pre).at(-1);
  assert.equal(pre.auto_recurring.transaction_amount, 23.2);
  assert.deepEqual(pre.auto_recurring.free_trial, { frequency: 45, frequency_type: 'days' });
  assert.equal(pre.auto_recurring.currency_id, 'PEN');
  assert.equal(pre.external_reference, r.json.sid);
  assert.equal(user('ana@prueba.pe').plan, 'free', 'pendiente: aún no es Pro');
  // aviso sin firma válida: se rechaza
  authorize(pre.id, 'payer-1', 45);
  assert.equal(await hook('subscription_preapproval', pre.id, { sign: false }), 401);
  assert.equal(user('ana@prueba.pe').plan, 'free');
  assert.equal(await hook('subscription_preapproval', pre.id), 200);
  const u = user('ana@prueba.pe');
  assert.equal(u.plan, 'pro', 'autorizada: Pro');
  assert.ok(u.pro_until > Date.now() + 47 * DAY, 'hasta el primer cobro + gracia');
  assert.equal(u.trial_used, 1);
  assert.equal(S.S.one("SELECT uses FROM codes WHERE code='MARIA20'").uses, 1);
  r = await ana.post('/api/billing/checkout', { cycle: 'year' });
  assert.equal(r.status, 409, 'una sola suscripción');
  // aviso 3 días antes del primer cobro (una sola vez)
  S.S.run('UPDATE subs SET next_payment=? WHERE ext_id=?', Date.now() + 2 * DAY, pre.id);
  await S.billing.hourly();
  assert.ok(S.S.one('SELECT reminded FROM subs WHERE ext_id=?', pre.id).reminded, 'aviso del primer cobro');
  // tres cobros con descuento → vuelve al precio completo
  for (let i = 0; i < 3; i++) assert.equal(await hook('subscription_authorized_payment', pay(pre.id)), 200);
  assert.equal(S.S.one('SELECT paid_cycles FROM subs WHERE ext_id=?', pre.id).paid_cycles, 3);
  assert.equal(MPS.pre[pre.id].auto_recurring.transaction_amount, 29, 'termina el descuento');
  // el mismo aviso dos veces no cuenta doble
  const again = Object.keys(MPS.pay).at(-1);
  await hook('subscription_authorized_payment', again);
  assert.equal(S.S.one('SELECT paid_cycles FROM subs WHERE ext_id=?', pre.id).paid_cycles, 3);
});

test('el mes gratis no se repite: mismo equipo o mismo pagador', async () => {
  // otra cuenta en el mismo navegador de Ana
  const anaJar = { fs_dev: S.S.one("SELECT dev FROM devices d JOIN users u ON u.id=d.uid WHERE u.email='ana@prueba.pe'").dev };
  const otra = H.client(base, anaJar); await login(otra, 'ana.otra@prueba.pe', 'Ana 2');
  let r = await otra.get('/api/billing');
  assert.equal(r.json.trial, false, 'mismo dispositivo: sin mes gratis');
  r = await otra.post('/api/billing/quote', { cycle: 'month' });
  assert.equal(r.json.trialDays, 0);
  // otra persona, otro equipo, pero paga con la misma cuenta de Mercado Pago
  const beto = H.client(base); await login(beto, 'beto@prueba.pe', 'Beto');
  r = await beto.post('/api/billing/checkout', { cycle: 'month' });
  const pre = Object.values(MPS.pre).at(-1);
  assert.ok(pre.auto_recurring.free_trial);
  authorize(pre.id, 'payer-1', 30);
  await hook('subscription_preapproval', pre.id);
  assert.equal(S.S.one('SELECT note FROM subs WHERE ext_id=?', pre.id).note, 'mes gratis repetido');
  assert.equal(user('beto@prueba.pe').plan, 'free', 'Pro empieza con el primer cobro');
  await hook('subscription_authorized_payment', pay(pre.id));
  assert.equal(user('beto@prueba.pe').plan, 'pro');
  // cancelar: sigue Pro hasta el fin del periodo pagado
  r = await beto.post('/api/billing/cancel', {});
  assert.equal(r.status, 200, r.text);
  assert.equal(MPS.pre[pre.id].status, 'cancelled');
  assert.equal(user('beto@prueba.pe').plan, 'pro');
  S.S.run('UPDATE subs SET next_payment=? WHERE ext_id=?', Date.now() - DAY, pre.id);
  S.S.run('UPDATE users SET pro_until=? WHERE email=?', Date.now() - DAY, 'beto@prueba.pe');
  await S.billing.hourly();
  assert.equal(user('beto@prueba.pe').plan, 'free', 'terminó el periodo');
});

/* un pago que quedó a medias y se descartó (a los 7 días, o porque se activó otro) se cancela también en Mercado Pago;
   y si igual se completa, se activa con las comprobaciones del primer pago (el mes gratis no se repite por pagador) */
test('pago a medias descartado: se cancela en Mercado Pago y, si se completa igual, no regala otro mes', async () => {
  const A = H.client(base); await login(A, 'medias1@prueba.pe');
  await A.post('/api/billing/checkout', { plan: 'pro', cycle: 'month', region: 'pe' });
  let pre = Object.values(MPS.pre).at(-1).id; authorize(pre, 'PAG-M', 30); assert.equal(await hook('preapproval', pre), 200);
  assert.equal(user('medias1@prueba.pe').plan, 'pro');
  const B = H.client(base); await login(B, 'medias2@prueba.pe');
  await B.post('/api/billing/checkout', { plan: 'pro', cycle: 'month', region: 'pe' });
  pre = Object.values(MPS.pre).at(-1).id;
  S.S.run('UPDATE subs SET created=created-8*86400000, updated=updated-8*86400000 WHERE uid=?', user('medias2@prueba.pe').id);
  await S.billing.hourly();
  assert.deepEqual({ ...S.S.one('SELECT status, note FROM subs WHERE uid=?', user('medias2@prueba.pe').id) }, { status: 'cancelled', note: 'sin completar' });
  assert.equal(MPS.pre[pre].status, 'cancelled', 'también en Mercado Pago');
  // aunque Mercado Pago lo deje completar: el mismo pagador ya usó el mes gratis
  authorize(pre, 'PAG-M', 30); assert.equal(await hook('preapproval', pre), 200);
  const sub = { ...S.S.one('SELECT status, note FROM subs WHERE uid=?', user('medias2@prueba.pe').id) };
  assert.deepEqual(sub, { status: 'authorized', note: 'mes gratis repetido' });
  assert.equal(user('medias2@prueba.pe').trial_used, 1);
});

test('enlace de influencer: /r/CODIGO deja el código guardado para pagar; sin referidos', async () => {
  const adm = H.client(base); await login(adm, 'admin@prueba.pe', 'Admin');
  let r = await adm.post('/api/admin/codes', { code: 'LUCHO10', label: 'Lucho (TikTok)', pct: 10, cycles: 0 });
  assert.equal(r.status, 201, r.text);
  const caro = H.client(base);
  r = await caro.get('/r/lucho10');
  assert.equal(r.status, 302); assert.equal(r.headers.get('location'), '/?ref=LUCHO10');
  await login(caro, 'caro@prueba.pe', 'Carolina', 'LUCHO10');
  r = await caro.get('/api/billing');
  assert.equal(r.json.promo, 'LUCHO10', 'cuenta nueva: el código queda guardado');
  assert.equal(r.json.ref, undefined);
  r = await caro.post('/api/billing/quote', { cycle: 'year', code: r.json.promo });
  assert.equal(r.json.amount, 261); assert.equal(r.json.cycles, 0, 'descuento para siempre');
  // una cuenta que ya existía también lo guarda si nunca usó un código
  const vieja = H.client(base); await login(vieja, 'curiosa@prueba.pe', 'Curiosa');
  await login(vieja, 'curiosa@prueba.pe', 'Curiosa', 'LUCHO10');
  assert.equal(user('curiosa@prueba.pe').promo, 'LUCHO10');
  // Ana ya usó MARIA20: el enlace no le cambia nada y no puede usar otro código
  const ana = H.client(base); await login(ana, 'ana@prueba.pe', 'Ana', 'LUCHO10');
  assert.equal(user('ana@prueba.pe').promo, null);
  r = await ana.post('/api/billing/quote', { cycle: 'month', code: 'LUCHO10' });
  assert.equal(r.json.code, 'code_one');
  // ya no existe la tabla de referidos ni el código personal
  assert.equal(S.S.one("SELECT COUNT(*) n FROM sqlite_master WHERE name='referrals'").n, 0);
  assert.equal(S.S.all('PRAGMA table_info(users)').some(c => c.name === 'ref_code'), false);
});

test('días de cortesía con suscripción activa: se pausa el cobro y se reanuda después', async () => {
  const ana = H.client(base); await login(ana, 'ana@prueba.pe', 'Ana');
  const sub = S.S.one("SELECT s.* FROM subs s JOIN users u ON u.id=s.uid WHERE u.email='ana@prueba.pe' AND s.status='authorized'");
  await S.billing.grantDays(sub.uid, 90, 'cortesia', 'prueba');
  assert.equal(MPS.pre[sub.ext_id].status, 'paused');
  const s2 = S.S.one('SELECT * FROM subs WHERE id=?', sub.id);
  assert.equal(s2.status, 'paused');
  assert.ok(s2.resume_at >= sub.next_payment + 90 * DAY - 1000, 'los días se suman después de lo ya pagado');
  assert.ok(user('ana@prueba.pe').pro_until > s2.resume_at, 'Pro durante la pausa');
  S.S.run('UPDATE subs SET resume_at=? WHERE id=?', Date.now() - 1000, sub.id);
  await S.billing.hourly();
  assert.equal(MPS.pre[sub.ext_id].status, 'authorized', 'se reanuda el cobro');
});

test('panel: solo administración; Pro de cortesía', async () => {
  const x = H.client(base); await login(x, 'curioso@prueba.pe', 'Curioso');
  assert.equal((await x.get('/api/admin/stats')).status, 403);
  assert.equal((await x.get('/admin')).status, 404);
  const adm = H.client(base); await login(adm, 'admin@prueba.pe', 'Admin');
  let r = await adm.get('/api/admin/stats');
  assert.equal(r.status, 200); assert.ok(r.json.users >= 5); assert.ok(r.json.mrr > 0); assert.equal(r.json.refs, undefined);
  r = await adm.get('/api/admin/users?q=curioso');
  assert.equal(r.json.length, 1);
  r = await adm.post('/api/admin/users/' + r.json[0].id, { grantDays: 30 });
  assert.equal(r.json.plan, 'pro');
  r = await adm.post('/api/admin/users/' + r.json.id, { revoke: true });
  assert.equal(r.json.plan, 'free');
  r = await adm.get('/api/admin/audit');
  assert.ok(r.json.some(a => a.action === 'admin:grant'));
});

test('libro de reclamaciones', async () => {
  const anon = H.client(base);
  let r = await anon.post('/api/reclamos', { nombre: 'Rosa', doc_num: '12345678', domicilio: 'Trujillo', email: 'rosa@prueba.pe', descripcion: 'Suscripción Pro', detalle: 'Me cobraron dos veces', pedido: 'Devolución' });
  assert.equal(r.status, 201, r.text);
  assert.match(r.json.code, /^LR-\d{4}-00001$/);
  assert.match(r.json.copy, /INDECOPI/);
  r = await anon.post('/api/reclamos', { nombre: 'Rosa' });
  assert.equal(r.status, 400);
  const adm = H.client(base); await login(adm, 'admin@prueba.pe', 'Admin');
  r = await adm.get('/api/admin/reclamos');
  assert.equal(r.json[0].data.detalle, 'Me cobraron dos veces');
  r = await adm.post('/api/admin/reclamos/' + r.json[0].n, { respuesta: 'Te devolvimos el cobro duplicado.' });
  assert.equal(r.status, 200);
});
