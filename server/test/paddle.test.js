'use strict';
/* Planes Indie, Pro y Studio: precio de fundador, lista de espera de Studio y pagos fuera del Perú con un
   Paddle simulado (transacción → /pagar → suscripción; avisos firmados, cobros, portal, cancelación) */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DAY = 864e5;
const PDS = { customers: {}, txns: {}, subs: {}, calls: [], bodies: [], n: 0 };
const MPS = { pre: {}, n: 0 };
const iso = t => new Date(t).toISOString();
const mock = http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c;
  const b = body ? JSON.parse(body) : {};
  const u = new URL(req.url, 'http://x');
  const send = (st, o) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  let m;
  if (u.pathname.startsWith('/pd/')) {
    const p = u.pathname.slice(3);
    PDS.calls.push(`${req.method} ${p}`); PDS.bodies.push(b);
    if (req.headers.authorization !== 'Bearer PD-KEY') return send(403, { error: { detail: 'clave' } });
    if (req.method === 'POST' && p === '/customers') {
      const old = Object.values(PDS.customers).find(c => c.email === b.email);
      if (old) return send(409, { error: { type: 'request_error', code: 'customer_already_exists' }, message: `customer email conflicts with customer of id ${old.id}` });
      const id = 'ctm_' + (++PDS.n); PDS.customers[id] = { id, email: b.email };
      return send(201, { data: PDS.customers[id] });
    }
    if (req.method === 'POST' && p === '/transactions') {
      const id = 'txn_' + (++PDS.n); PDS.txns[id] = { id, status: 'ready', ...b, subscription_id: null };
      return send(201, { data: { id, status: 'ready', checkout: { url: null } } });
    }
    if ((m = /^\/transactions\/(txn_\w+)$/.exec(p))) return PDS.txns[m[1]] ? send(200, { data: PDS.txns[m[1]] }) : send(404, {});
    if ((m = /^\/subscriptions\/(sub_\w+)$/.exec(p))) return PDS.subs[m[1]] ? send(200, { data: PDS.subs[m[1]] }) : send(404, {});
    if ((m = /^\/subscriptions\/(sub_\w+)\/cancel$/.exec(p))) {
      const s = PDS.subs[m[1]]; if (!s) return send(404, {});
      if (b.effective_from === 'immediately') { s.status = 'canceled'; s.canceled_at = iso(Date.now()); }
      else s.scheduled_change = { action: 'cancel', effective_at: s.current_billing_period.ends_at };
      return send(200, { data: s });
    }
    if (req.method === 'GET' && (m = /^\/customers\/(ctm_\w+)$/.exec(p))) return PDS.customers[m[1]] ? send(200, { data: PDS.customers[m[1]] }) : send(404, {});
    if ((m = /^\/customers\/(ctm_\w+)\/portal-sessions$/.exec(p))) return send(201, { data: { urls: { general: { overview: `https://customer-portal.paddle.test/${m[1]}` } } } });
    return send(404, {});
  }
  if (req.headers.authorization !== 'Bearer MP-TOKEN') return send(401, { message: 'token' });
  if (req.method === 'POST' && u.pathname === '/preapproval') {
    const id = 'pre' + (++MPS.n);
    MPS.pre[id] = { id, status: 'pending', ...b, init_point: 'https://mp.test/checkout?preapproval_id=' + id };
    return send(201, MPS.pre[id]);
  }
  if ((m = /^\/preapproval\/(\w+)$/.exec(u.pathname))) {
    const p = MPS.pre[m[1]]; if (!p) return send(404, { message: 'no existe' });
    if (req.method === 'PUT' && b.status) p.status = b.status;
    return send(200, p);
  }
  send(404, {});
});

/* Paddle crea la suscripción al pagar la transacción */
function pdPay(txnId, { status = 'active', days = 30 } = {}) {
  const t = PDS.txns[txnId], id = 'sub_' + (++PDS.n);
  const end = iso(Date.now() + days * DAY);
  PDS.subs[id] = { id, status, customer_id: t.customer_id, custom_data: t.custom_data, items: [{ price: { id: t.items[0].price_id } }],
    next_billed_at: end, current_billing_period: { starts_at: iso(Date.now()), ends_at: end }, scheduled_change: null };
  t.status = 'completed'; t.subscription_id = id;
  return PDS.subs[id];
}
const PD_SECRET = 'pdl_ntfset_secreto';
let S, H, base;
async function pdHook(event_type, data, { sign = true, ts = Math.floor(Date.now() / 1000), raw } = {}) {
  const body = raw || JSON.stringify({ event_id: 'evt_' + crypto.randomUUID(), event_type, occurred_at: iso(Date.now()), data });
  const h1 = sign ? crypto.createHmac('sha256', PD_SECRET).update(ts + ':' + body).digest('hex') : 'a'.repeat(64);
  const r = await fetch(base + '/api/billing/paddle-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Paddle-Signature': `ts=${ts};h1=${h1}` }, body });
  await new Promise(r => setTimeout(r, 120));
  return r.status;
}
const login = async (c, email, more) => (await c.post('/api/auth/google', { credential: S.token(email, email.split('@')[0]), ...(more || {}) })).json;
const user = email => S.S.one('SELECT * FROM users WHERE email=?', email);

test.before(async () => {
  await new Promise(r => mock.listen(0, '127.0.0.1', r));
  const mb = `http://127.0.0.1:${mock.address().port}`;
  Object.assign(process.env, {
    MP_ACCESS_TOKEN: 'MP-TOKEN', MP_API_BASE: mb, MP_WEBHOOK_SECRET: '',
    PADDLE_API_KEY: 'PD-KEY', PADDLE_API_BASE: mb + '/pd', PADDLE_WEBHOOK_SECRET: PD_SECRET, PADDLE_CLIENT_TOKEN: 'test_cliente', PADDLE_ENV: 'sandbox',
    PADDLE_PRICE_INDIE_MONTH: 'pri_in_m', PADDLE_PRICE_INDIE_YEAR: 'pri_in_y', PADDLE_PRICE_PRO_MONTH: 'pri_pro_m', PADDLE_PRICE_PRO_YEAR: 'pri_pro_y',
    PADDLE_PRICE_STUDIO_MONTH: 'pri_st_m', PADDLE_PRICE_STUDIO_YEAR: 'pri_st_y', PADDLE_PRICE_PRO_MONTH_TRIAL: 'pri_pro_m_t', PADDLE_DISCOUNT_FUNDADOR: 'dsc_fundador',
  });
  H = require('./helpers');
  // el precio de fundador vale hasta dentro de un año; Studio aún en lista de espera
  S = await H.start({ ADMIN_EMAILS: 'admin@prueba.pe', FOUNDER_UNTIL: iso(Date.now() + 365 * DAY) });
  base = S.base;
});
test.after(async () => { await S.stop(); mock.close(); });

test('precio de fundador: Pro a S/ 39 en el Perú; código FUNDADOR (20 %) fuera; Indie a precio normal', async () => {
  const A = H.client(base); await login(A, 'fundador@prueba.pe', { tz: 'America/Lima' });
  let r = await A.get('/api/billing');
  assert.equal(r.json.region, 'pe'); assert.equal(r.json.studioOpen, false); assert.equal(r.json.intl, 'paddle');
  assert.deepEqual(r.json.founder.PEN, { month: 39, year: 390 }); assert.equal(r.json.founder.code, 'FUNDADOR');
  assert.deepEqual(r.json.prices.PEN.indie, { month: 29, year: 290 }); assert.deepEqual(r.json.prices.USD.pro, { month: 14.99, year: 149 });
  r = await A.post('/api/billing/quote', { plan: 'pro', cycle: 'month', region: 'pe' });
  assert.deepEqual([r.json.amount, r.json.list, r.json.founder, r.json.trialDays], [39, 49, true, 30]);
  r = await A.post('/api/billing/quote', { plan: 'pro', cycle: 'year', region: 'pe' }); assert.equal(r.json.amount, 390);
  r = await A.post('/api/billing/quote', { plan: 'indie', cycle: 'month', region: 'pe' });
  assert.deepEqual([r.json.amount, r.json.founder, r.json.trialDays], [29, false, 0], 'la prueba de 30 días es de Pro');
  r = await A.post('/api/billing/quote', { plan: 'pro', cycle: 'month', region: 'intl' });
  assert.deepEqual([r.json.provider, r.json.amount, r.json.pct, r.json.code], ['paddle', 11.99, 20, 'FUNDADOR']);
  r = await A.post('/api/billing/quote', { plan: 'studio', cycle: 'month', region: 'pe' });
  assert.equal(r.status, 403); assert.equal(r.json.code, 'studio_waitlist');
  r = await A.post('/api/billing/checkout', { plan: 'studio', cycle: 'month', region: 'pe' }); assert.equal(r.json.code, 'studio_waitlist');
  r = await A.post('/api/billing/quote', { plan: 'gratis', cycle: 'month', region: 'pe' }); assert.equal(r.json.code, 'bad_plan');
  // Mercado Pago: la suscripción se crea con el precio de fundador
  r = await A.post('/api/billing/checkout', { plan: 'pro', cycle: 'month', region: 'pe' }); assert.equal(r.status, 200, r.text);
  const pre = Object.values(MPS.pre).at(-1);
  assert.equal(pre.auto_recurring.transaction_amount, 39); assert.match(pre.reason, /Pro mensual · precio de fundador/);
  assert.equal(pre.auto_recurring.free_trial.frequency, 30);
});

test('lista de espera de Studio: con o sin cuenta, una vez por correo, visible en el panel', async () => {
  const anon = H.client(base);
  let r = await anon.post('/api/waitlist', { plan: 'studio', email: 'Productora@Ejemplo.com', lang: 'en' }); assert.equal(r.status, 200, r.text);
  r = await anon.post('/api/waitlist', { plan: 'studio', email: 'productora@ejemplo.com' }); assert.equal(r.status, 200);
  r = await anon.post('/api/waitlist', { plan: 'studio', email: 'no-es-correo' }); assert.equal(r.json.code, 'bad_email');
  r = await anon.post('/api/waitlist', { plan: 'pro', email: 'x@y.pe' }); assert.equal(r.json.code, 'bad_plan');
  r = await anon.req('POST', '/api/waitlist', { plan: 'studio', email: 'z@y.pe' }, { 'X-FS': '' }); assert.equal(r.status, 403, 'sin la cabecera de la app');
  const A = H.client(base); await login(A, 'espera@prueba.pe');
  r = await A.post('/api/waitlist', { plan: 'studio', email: 'otro@prueba.pe' }); assert.equal(r.status, 200);
  const rows = S.S.all('SELECT * FROM waitlist ORDER BY ts');
  assert.deepEqual(rows.map(x => x.email), ['productora@ejemplo.com', 'espera@prueba.pe'], 'con sesión, el correo de la cuenta');
  assert.equal(rows[0].lang, 'en'); assert.ok(rows[1].uid);
  const adm = H.client(base); await login(adm, 'admin@prueba.pe');
  r = await adm.get('/api/admin/waitlist'); assert.equal(r.json.length, 2);
  r = await adm.get('/api/admin/stats'); assert.equal(r.json.waitlist, 2);
  r = await A.get('/api/admin/waitlist'); assert.notEqual(r.status, 200);
});

test('Paddle: Pro con 30 días de prueba, aviso firmado, cobro único, portal, cancelación y fin', async () => {
  fs.writeFileSync(path.join(S.tmp, 'public', 'pagar.html'), '<html data-token="__PADDLE_CLIENT_TOKEN__" data-env="__PADDLE_ENV__"></html>');
  const A = H.client(base); await login(A, 'nyc@prueba.com', { tz: 'America/New_York' });
  let r = await A.post('/api/billing/quote', { plan: 'pro', cycle: 'month', region: 'intl' });
  assert.deepEqual([r.json.provider, r.json.trialDays, r.json.currency], ['paddle', 30, 'USD']);
  r = await A.post('/api/billing/checkout', { plan: 'pro', cycle: 'month', region: 'intl' }); assert.equal(r.status, 200, r.text);
  const sid = r.json.sid;
  assert.match(r.json.url, new RegExp(`^${base.replace(/[.]/g, '\\.')}/pagar\\?_ptxn=txn_\\w+&sid=${sid}$`));
  const txn = new URL(r.json.url).searchParams.get('_ptxn'), T = PDS.txns[txn];
  assert.deepEqual(T.items, [{ price_id: 'pri_pro_m_t', quantity: 1 }], 'precio de Pro con prueba');
  assert.equal(T.discount_id, 'dsc_fundador'); assert.equal(T.collection_mode, 'automatic');
  assert.deepEqual(T.custom_data, { uid: user('nyc@prueba.com').id, sid });
  assert.equal(user('nyc@prueba.com').plan, 'free', 'pendiente');
  // la página de pago: Paddle.js con su política de contenido
  r = await fetch(base + '/pagar?_ptxn=' + txn);
  assert.equal(r.status, 200); assert.match(await r.text(), /data-token="test_cliente" data-env="sandbox"/);
  assert.match(r.headers.get('content-security-policy'), /script-src 'self' https:\/\/\*\.paddle\.com https:\/\/cdn\.paddle\.com/);
  // la persona paga: Paddle crea la suscripción en prueba
  const s = pdPay(txn, { status: 'trialing' });
  assert.equal(await pdHook('subscription.created', { id: s.id, custom_data: s.custom_data }, { sign: false }), 401, 'sin firma');
  assert.equal(await pdHook('subscription.created', { id: s.id, custom_data: s.custom_data }, { ts: Math.floor(Date.now() / 1000) - 600 }), 401, 'firma vieja');
  assert.equal(user('nyc@prueba.com').plan, 'free');
  // un aviso firmado con datos falsos no manda: el servidor vuelve a leer la suscripción en Paddle
  assert.equal(await pdHook('subscription.created', { id: s.id, status: 'active', custom_data: { uid: 'u_otro', sid } }), 200);
  assert.equal(user('nyc@prueba.com').plan, 'free', 'otra cuenta en el aviso: no se activa');
  assert.equal(await pdHook('subscription.created', { id: s.id, custom_data: s.custom_data }), 200);
  let u = user('nyc@prueba.com');
  assert.equal(u.plan, 'pro'); assert.equal(u.trial_used, 1); assert.ok(u.pro_until > Date.now() + 29 * DAY);
  let sub = S.S.one('SELECT * FROM subs WHERE id=?', sid);
  assert.deepEqual([sub.status, sub.ext_id, sub.payer_id], ['authorized', 'pd:' + s.id, T.customer_id]);
  // el aviso «Mercado Pago cobrará…» del fin del mes gratis no es para Paddle
  S.S.run('UPDATE subs SET next_payment=? WHERE id=?', Date.now() + DAY, sid); await S.billing.hourly();
  assert.equal(S.S.one('SELECT reminded FROM subs WHERE id=?', sid).reminded, null, 'sin aviso de Mercado Pago');
  // el cobro: una sola vez aunque el aviso llegue repetido
  const paid = { id: txn, status: 'completed', subscription_id: s.id, custom_data: s.custom_data, currency_code: 'USD', details: { totals: { grand_total: '1199' } } };
  assert.equal(await pdHook('transaction.completed', paid), 200); assert.equal(await pdHook('transaction.completed', paid), 200);
  const pay = S.S.all('SELECT * FROM payments WHERE ext_id=?', 'pd:txn:' + txn);
  assert.equal(pay.length, 1); assert.equal(pay[0].amount, 11.99);
  // una devolución queda registrada
  assert.equal(await pdHook('adjustment.created', { action: 'refund', transaction_id: 'txn_otro', subscription_id: s.id }), 200);
  assert.equal(S.S.one("SELECT status FROM payments WHERE ext_id='pd:txn:txn_otro'").status, 'refunded');
  // recibos y medio de pago: el portal de Paddle
  r = await A.post('/api/billing/portal', {}); assert.equal(r.status, 200, r.text); assert.equal(r.json.url, 'https://customer-portal.paddle.test/' + T.customer_id);
  // ya tiene Pro: no se contrata otra vez ni Indie
  r = await A.post('/api/billing/checkout', { plan: 'indie', cycle: 'month', region: 'intl' }); assert.equal(r.status, 409);
  // cancelar: al fin del periodo; sigue Pro hasta entonces
  r = await A.post('/api/billing/cancel', {}); assert.equal(r.status, 200, r.text);
  assert.ok(PDS.calls.includes(`POST /subscriptions/${s.id}/cancel`)); assert.equal(PDS.bodies[PDS.calls.lastIndexOf(`POST /subscriptions/${s.id}/cancel`)].effective_from, 'next_billing_period');
  assert.equal(user('nyc@prueba.com').plan, 'pro'); assert.equal(S.S.one('SELECT status FROM subs WHERE id=?', sid).status, 'cancelled');
  // vence
  s.status = 'canceled'; s.canceled_at = iso(Date.now() - 1000); s.scheduled_change = null; s.current_billing_period.ends_at = iso(Date.now() - 1000);
  assert.equal(await pdHook('subscription.canceled', { id: s.id }), 200);
  assert.equal(user('nyc@prueba.com').plan, 'free');
  // la prueba de 30 días es una vez por cuenta
  r = await A.post('/api/billing/quote', { plan: 'pro', cycle: 'month', region: 'intl' }); assert.equal(r.json.trialDays, 0);
  r = await A.post('/api/billing/checkout', { plan: 'pro', cycle: 'month', region: 'intl' }); assert.equal(r.status, 200, r.text);
  assert.deepEqual(PDS.txns[new URL(r.json.url).searchParams.get('_ptxn')].items[0].price_id, 'pri_pro_m', 'sin prueba');
  assert.equal(PDS.txns[new URL(r.json.url).searchParams.get('_ptxn')].customer_id, T.customer_id, 'el mismo cliente de Paddle (409 → su id)');
});

/* el correo del pago no puede apuntar al cliente de Paddle de otra persona (ni abrir su portal) */
test('Paddle: el pago usa el correo de la cuenta; el portal de otro cliente no se abre', async () => {
  const V = H.client(base); await login(V, 'victima@prueba.com', { tz: 'America/New_York' });
  let r = await V.post('/api/billing/checkout', { plan: 'pro', cycle: 'month', region: 'intl' }); assert.equal(r.status, 200, r.text);
  const vt = PDS.txns[new URL(r.json.url).searchParams.get('_ptxn')], vctm = vt.customer_id;
  assert.equal(PDS.customers[vctm].email, 'victima@prueba.com');
  // otra cuenta escribe el correo de la víctima: se ignora, su cliente de Paddle es el suyo
  const X = H.client(base); await login(X, 'atacante@prueba.com', { tz: 'America/New_York' });
  r = await X.post('/api/billing/checkout', { plan: 'pro', cycle: 'month', region: 'intl', email: 'victima@prueba.com' }); assert.equal(r.status, 200, r.text);
  const xtxn = new URL(r.json.url).searchParams.get('_ptxn'), xt = PDS.txns[xtxn];
  assert.notEqual(xt.customer_id, vctm, 'no reutiliza el cliente de la víctima');
  assert.equal(PDS.customers[xt.customer_id].email, 'atacante@prueba.com');
  // un registro viejo que apuntaba al cliente de la víctima (de antes del arreglo): el portal no se abre
  const xs = pdPay(xtxn, { status: 'active' });
  assert.equal(await pdHook('subscription.created', { id: xs.id, custom_data: xs.custom_data }), 200);
  S.S.run('UPDATE subs SET payer_id=? WHERE id=?', vctm, xs.custom_data.sid);
  r = await X.post('/api/billing/portal', {}); assert.equal(r.status, 403, r.text); assert.equal(r.json.code, 'not_owner');
});

/* el precio con prueba solo vale si el servidor la ofreció: quien ya usó la prueba no la repite con Paddle.js */
test('Paddle: la prueba no ofrecida no activa el plan', async () => {
  const A = H.client(base); await login(A, 'repite@prueba.com', { tz: 'America/New_York' });
  S.S.run('UPDATE users SET trial_used=1 WHERE email=?', 'repite@prueba.com');
  let r = await A.post('/api/billing/checkout', { plan: 'pro', cycle: 'month', region: 'intl' }); assert.equal(r.status, 200, r.text);
  const txn = new URL(r.json.url).searchParams.get('_ptxn');
  assert.equal(PDS.txns[txn].items[0].price_id, 'pri_pro_m', 'sin prueba');
  // con Paddle.js arma otro pago con el precio de prueba y el mismo sid
  PDS.txns[txn].items = [{ price_id: 'pri_pro_m_t', quantity: 1 }];
  const s = pdPay(txn, { status: 'trialing' });
  assert.equal(await pdHook('subscription.created', { id: s.id, custom_data: s.custom_data }), 200);
  assert.equal(user('repite@prueba.com').plan, 'free');
  assert.deepEqual({ ...S.S.one('SELECT status, note FROM subs WHERE id=?', s.custom_data.sid) }, { status: 'cancelled', note: 'prueba no ofrecida' });
  assert.equal(s.status, 'canceled', 'cancelada en Paddle');
  // un segundo intento con el mismo sid (la fila ya no está pendiente) tampoco activa nada ni cambia la fila
  const s2 = pdPay(txn, { status: 'trialing' });
  assert.equal(await pdHook('subscription.created', { id: s2.id, custom_data: s.custom_data }), 200);
  assert.equal(user('repite@prueba.com').plan, 'free');
  assert.deepEqual({ ...S.S.one('SELECT status, ext_id FROM subs WHERE id=?', s.custom_data.sid) }, { status: 'cancelled', ext_id: 'pd:' + s.id });
});

/* avisos con firma falsa: no una fila del registro por intento */
test('firmas falsas: se cuentan sin llenar el registro', async () => {
  const before = S.S.one("SELECT COUNT(*) n FROM audit WHERE action='paddle_bad_signature'").n;
  for (let i = 0; i < 6; i++) assert.equal(await pdHook('subscription.created', { id: 'sub_x' }, { sign: false }), 401);
  assert.ok(S.S.one("SELECT COUNT(*) n FROM audit WHERE action='paddle_bad_signature'").n - before <= 1);
});

test('Paddle: Indie da Indie (no Pro); al pasar a Pro, Indie se cancela al instante', async () => {
  const A = H.client(base); await login(A, 'indie@prueba.com', { tz: 'Europe/Madrid' });
  let r = await A.post('/api/billing/checkout', { plan: 'indie', cycle: 'year', region: 'intl' }); assert.equal(r.status, 200, r.text);
  let txn = new URL(r.json.url).searchParams.get('_ptxn');
  assert.equal(PDS.txns[txn].items[0].price_id, 'pri_in_y'); assert.equal(PDS.txns[txn].discount_id, undefined, 'el código de fundador es de Pro');
  const s1 = pdPay(txn, { days: 365 });
  assert.equal(await pdHook('subscription.activated', { id: s1.id, custom_data: s1.custom_data }), 200);
  assert.equal(user('indie@prueba.com').plan, 'indie');
  r = await A.get('/api/me'); assert.equal(r.json.limits.projects, 2); assert.equal(r.json.limits.members, 1);
  r = await A.post('/api/projects', { sections: { guion: JSON.stringify({ meta: { title: 'Corto' }, paras: [] }) } });
  assert.equal(r.status, 201); assert.equal((await A.get(`/api/p/${r.json.pid}`)).json.kind, 'prod');
  // la sincronización de cada hora no la convierte en Pro
  await S.billing.hourly(); assert.equal(user('indie@prueba.com').plan, 'indie');
  // a Pro
  r = await A.post('/api/billing/checkout', { plan: 'pro', cycle: 'month', region: 'intl' }); assert.equal(r.status, 200, r.text);
  txn = new URL(r.json.url).searchParams.get('_ptxn');
  const s2 = pdPay(txn);
  // el aviso de la transacción también basta para activar
  assert.equal(await pdHook('transaction.completed', { id: txn, status: 'completed', subscription_id: s2.id, custom_data: s2.custom_data, currency_code: 'USD', details: { totals: { grand_total: '1199' } } }), 200);
  assert.equal(user('indie@prueba.com').plan, 'pro');
  assert.equal(PDS.subs[s1.id].status, 'canceled', 'Indie se canceló en Paddle');
  assert.equal(S.S.one('SELECT status, note FROM subs WHERE ext_id=?', 'pd:' + s1.id).note, 'cambio de plan');
  // botón «Ya pagué»: /api/billing/sync lee la transacción si aún no llegó el aviso
  r = await A.post('/api/billing/checkout', { plan: 'studio', cycle: 'month', region: 'intl' }); assert.equal(r.json.code, 'studio_waitlist');
});

test('Paddle: «Ya pagué» sin aviso lee la transacción; la clave equivocada no rompe el webhook', async () => {
  const A = H.client(base); await login(A, 'sinaviso@prueba.com', { tz: 'America/Bogota' });
  let r = await A.post('/api/billing/checkout', { plan: 'pro', cycle: 'year', region: 'intl' }); assert.equal(r.status, 200, r.text);
  const sid = r.json.sid, txn = new URL(r.json.url).searchParams.get('_ptxn');
  r = await A.post('/api/billing/sync', { sid }); assert.equal(r.json.plan, 'free', 'aún sin pagar');
  pdPay(txn, { days: 365 });
  r = await A.post('/api/billing/sync', { sid }); assert.equal(r.json.plan, 'pro');
  // avisos raros: cuerpo no JSON, evento desconocido, suscripción inexistente
  assert.equal(await pdHook('', null, { raw: '{no es json' }), 200);
  assert.equal(await pdHook('subscription.updated', { id: 'sub_noexiste' }), 200);
  assert.equal(await pdHook('subscription.updated', { id: '../../admin' }), 200);
  assert.equal(await pdHook('otra.cosa', {}), 200);
  assert.equal(user('sinaviso@prueba.com').plan, 'pro');
  // no se puede sincronizar la suscripción de otra cuenta
  const B = H.client(base); await login(B, 'ajeno@prueba.com');
  r = await B.post('/api/billing/sync', { sid }); assert.equal(r.json.plan, 'free');
  r = await B.post('/api/billing/portal', {}); assert.equal(r.status, 404);
});
