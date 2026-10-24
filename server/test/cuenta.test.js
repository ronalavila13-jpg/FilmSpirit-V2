'use strict';
/* Cuentas: eliminar la cuenta (suscripción cancelada, proyectos borrados, el mes gratis no se repite),
   cerrar la sesión en todos los navegadores y datos de Google que no se guardan tal cual */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const DAY = 864e5;
const MPS = { pre: {}, n: 0, down: false, calls: [] };
const mock = http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c;
  const b = body ? JSON.parse(body) : {};
  const u = new URL(req.url, 'http://x');
  MPS.calls.push(`${req.method} ${u.pathname}`);
  const send = (st, o) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (MPS.down) return send(500, { message: 'caído' });
  let m;
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
let S, H, base;
const login = async (c, email, more) => (await c.post('/api/auth/google', { credential: S.token(email, email.split('@')[0], more), tz: 'America/Lima' })).json;
const user = email => S.S.one('SELECT * FROM users WHERE email=?', email);
const sec = t => ({ guion: JSON.stringify({ meta: { title: t }, paras: [] }) });

test.before(async () => {
  await new Promise(r => mock.listen(0, '127.0.0.1', r));
  Object.assign(process.env, { MP_ACCESS_TOKEN: 'MP-TOKEN', MP_API_BASE: `http://127.0.0.1:${mock.address().port}`, MP_WEBHOOK_SECRET: '' });
  H = require('./helpers');
  S = await H.start({ FOUNDER_UNTIL: '2020-01-01' });
  base = S.base;
});
test.after(async () => { await S.stop(); mock.close(); });

test('eliminar la cuenta: confirma con el correo, cancela la suscripción, borra sus proyectos y no repite el mes gratis', async () => {
  const A = H.client(base); await login(A, 'borrar@prueba.pe');
  const B = H.client(base); await login(B, 'equipo@prueba.pe');
  // A con Pro (mes gratis de Mercado Pago) y un proyecto con B en el equipo
  let r = await A.post('/api/billing/checkout', { plan: 'pro', cycle: 'month', region: 'pe' }); assert.equal(r.status, 200, r.text);
  const pre = Object.values(MPS.pre).at(-1);
  pre.status = 'authorized'; pre.payer_id = 'p1'; pre.next_payment_date = new Date(Date.now() + 30 * DAY).toISOString();
  await S.billing.syncPre(pre.id);
  assert.equal(user('borrar@prueba.pe').plan, 'pro');
  S.S.run("INSERT INTO payments(ext_id,sid,uid,amount,status,ts,currency) VALUES('mp:1',?,?,49,'approved',?,'PEN')", r.json.sid, user('borrar@prueba.pe').id, Date.now());
  const pid = (await A.post('/api/projects', { sections: sec('De A') })).json.pid;
  await B.post(`/api/p/${pid}/request`, {});
  r = await A.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'equipo@prueba.pe', role: 'Dirección', perms: { guion: 'ver' } }] }); assert.equal(r.status, 200, r.text);
  assert.equal((await B.get(`/api/p/${pid}`)).status, 200);
  const pB = (await B.post('/api/projects', { sections: sec('De B') })).json.pid;
  await B.put(`/api/p/${pB}/team`, { list: [{ add: true, email: 'borrar@prueba.pe', role: 'Guion', perms: { guion: 'ver' } }] });
  await A.post('/api/waitlist', { plan: 'studio' });
  // confirmar: sin el correo o con otro, no
  r = await A.post('/api/me/delete', {}); assert.equal(r.json.code, 'bad_confirm');
  r = await A.post('/api/me/delete', { confirm: 'otro@prueba.pe' }); assert.equal(r.json.code, 'bad_confirm');
  r = await A.req('POST', '/api/me/delete', { confirm: 'borrar@prueba.pe' }, { 'X-FS': '' }); assert.equal(r.status, 403, 'desde otro sitio, no');
  r = await A.req('POST', '/api/me/delete', { confirm: 'borrar@prueba.pe' }, { Origin: 'https://malo.example' }); assert.equal(r.status, 403);
  // Mercado Pago no responde: la cuenta sigue igual (si no, seguiría cobrando)
  MPS.down = true;
  r = await A.post('/api/me/delete', { confirm: 'Borrar@Prueba.pe' }); assert.equal(r.status, 502); assert.equal(r.json.code, 'cancel_failed');
  assert.ok(user('borrar@prueba.pe')); assert.equal((await A.get('/api/me')).status, 200);
  MPS.down = false;
  r = await A.post('/api/me/delete', { confirm: 'Borrar@Prueba.pe' }); assert.equal(r.status, 200, r.text); assert.equal(r.json.projects, 1);
  assert.equal(MPS.pre[pre.id].status, 'cancelled', 'suscripción cancelada en Mercado Pago');
  assert.ok(!user('borrar@prueba.pe'));
  assert.equal((await A.get('/api/me')).status, 401, 'la sesión terminó');
  assert.equal((await B.get(`/api/p/${pid}`)).status, 404, 'su proyecto ya no existe para el equipo');
  assert.equal((await B.get(`/api/p/${pB}`)).status, 200, 'los proyectos ajenos siguen');
  assert.equal(S.S.one('SELECT COUNT(*) n FROM invites WHERE email=?', 'borrar@prueba.pe').n, 0);
  assert.equal(S.S.one('SELECT COUNT(*) n FROM waitlist WHERE email=?', 'borrar@prueba.pe').n, 0);
  assert.equal(S.S.one('SELECT COUNT(*) n FROM sections WHERE pid=?', pid).n, 0);
  assert.equal(S.S.one("SELECT COUNT(*) n FROM payments WHERE ext_id='mp:1'").n, 1, 'los cobros quedan (contabilidad)');
  assert.equal(S.S.one('SELECT COUNT(*) n FROM gone WHERE trial=1').n, 2);
  assert.ok(!JSON.stringify(S.S.all('SELECT * FROM gone')).includes('borrar'), 'solo huellas, no el correo');
  // vuelve con la misma cuenta de Google: cuenta nueva, sin proyectos y sin otro mes gratis
  const A2 = H.client(base); const j = await login(A2, 'borrar@prueba.pe');
  assert.equal(j.isNew, true); assert.equal(j.me.plan, 'free'); assert.equal(j.me.scripts + j.me.own, 0);
  assert.equal(user('borrar@prueba.pe').trial_used, 1);
  r = await A2.post('/api/billing/quote', { plan: 'pro', cycle: 'month', region: 'pe' }); assert.equal(r.json.trialDays, 0);
  // una cuenta sin suscripción se elimina sin llamar a ningún medio de pago
  const C = H.client(base); await login(C, 'simple@prueba.pe');
  const n = MPS.calls.length;
  r = await C.post('/api/me/delete', { confirm: 'simple@prueba.pe' }); assert.equal(r.status, 200);
  assert.equal(MPS.calls.length, n);
  const C2 = H.client(base); await login(C2, 'simple@prueba.pe');
  assert.equal(user('simple@prueba.pe').trial_used, 0, 'sin mes gratis usado, puede usarlo');
});

test('cerrar sesión en todos los navegadores', async () => {
  const A = H.client(base), A2 = H.client(base);
  await login(A, 'dos@prueba.pe'); await login(A2, 'dos@prueba.pe');
  assert.equal((await A2.get('/api/me')).status, 200);
  let r = await A.post('/api/auth/logout-all', {}); assert.equal(r.status, 200);
  assert.equal((await A.get('/api/me')).status, 401); assert.equal((await A2.get('/api/me')).status, 401);
  r = await H.client(base).post('/api/auth/logout-all', {}); assert.equal(r.status, 401);
});

test('datos de Google: foto solo https, nombre sin caracteres de control; llaves de prueba nunca con https público', async () => {
  const A = H.client(base);
  let j = await login(A, 'foto@prueba.pe', { picture: 'javascript:alert(1)', name: 'Ana\u0000‮\nMalo' });
  assert.equal(j.me.picture, ''); assert.doesNotMatch(j.me.name, /[\u0000-\u001f]/);
  j = await login(A, 'foto@prueba.pe', { picture: 'https://lh3.googleusercontent.com/a/x=s96-c' });
  assert.equal(j.me.picture, 'https://lh3.googleusercontent.com/a/x=s96-c');
  const { createServer } = require('../server');
  assert.throws(() => createServer({ DATA_DIR: S.tmp + '/x', PUBLIC_DIR: S.tmp + '/public', GOOGLE_CLIENT_ID: 'c', BASE_URL: 'https://filmspiritpro.com' }), /solo para pruebas/);
  // token sin correo verificado, de otra app o vencido
  let r = await A.post('/api/auth/google', { credential: S.token('nv@prueba.pe', 'nv', { email_verified: false }) }); assert.equal(r.status, 401); assert.match(r.json.error, /verificado/);
  r = await A.post('/api/auth/google', { credential: S.token('aud@prueba.pe', 'aud', { aud: 'otra-app' }) }); assert.equal(r.status, 401);
  r = await A.post('/api/auth/google', { credential: S.token('exp@prueba.pe', 'exp', { exp: Math.floor(Date.now() / 1000) - 3600 }) }); assert.equal(r.status, 401);
  r = await A.post('/api/auth/google', { credential: 'a.b.c' }); assert.equal(r.status, 401);
});
