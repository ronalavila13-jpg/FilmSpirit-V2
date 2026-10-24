'use strict';
/* Seguridad de la web (lote F): el panel pide haber entrado hace poco, la sección Seguridad del panel, los topes de
   los formularios públicos, la tabla de límites con tope y la cabecera de país */
process.env.ESPERA_DIA = '3';
process.env.RECLAMOS_SOPORTE_DIA = '1';
process.env.MAIL_PROVIDER = 'resend'; process.env.MAIL_API_KEY = 'clave-de-prueba'; process.env.MAIL_FROM = 'FilmSpirit <hola@prueba.pe>';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { start, client } = require('./helpers');

// los correos no salen: se anotan
const sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (u, o) => { if (String(u).startsWith('https://api.resend.com')) { sent.push(JSON.parse(o.body)); return Promise.resolve(new Response('{"id":"x"}', { status: 200 })); } return realFetch(u, o); };

let S, adm;
test.before(async () => {
  S = await start({ ADMIN_EMAILS: 'jefa@prueba.pe', SUPPORT_EMAIL: 'soporte@prueba.pe' });
  fs.writeFileSync(path.join(S.tmp, 'public', 'admin.html'), '<h1>panel</h1>');
  adm = client(S.base); await adm.post('/api/auth/google', { credential: S.token('jefa@prueba.pe') });
});
test.after(async () => { await S.stop(); globalThis.fetch = realFetch; });

test('el panel pide volver a entrar con Google si la sesión tiene más de 12 horas', async () => {
  let r = await adm.get('/api/admin/stats'); assert.equal(r.status, 200);
  r = await adm.get('/admin'); assert.equal(r.status, 200);
  S.S.run('UPDATE sessions SET created=?', Date.now() - 13 * 3600e3);
  r = await adm.get('/api/admin/stats'); assert.equal(r.status, 401); assert.equal(r.json.code, 'reauth');
  r = await adm.get('/admin'); assert.equal(r.status, 302); assert.match(r.headers.get('location'), /^\/entrar\?next=%2Fadmin&reauth=1$/);
  // la sesión sigue sirviendo para la app
  r = await adm.get('/api/me'); assert.equal(r.status, 200);
  // entra de nuevo: el panel vuelve a abrir
  await adm.post('/api/auth/google', { credential: S.token('jefa@prueba.pe') });
  r = await adm.get('/api/admin/stats'); assert.equal(r.status, 200);
});

test('Seguridad en el panel: bloqueos por límite e inicios rechazados', async () => {
  const B = client(S.base); await B.post('/api/auth/google', { credential: S.token('apurada@prueba.pe') });
  for (let i = 0; i < 33; i++) await B.post('/api/billing/sync', { sid: 'nada' });
  const X = client(S.base);
  let r = await X.post('/api/auth/google', { credential: 'esto-no-es-un-token' }); assert.equal(r.status, 401);
  r = await adm.get('/api/admin/security'); assert.equal(r.status, 200, r.text);
  assert.ok(r.json.limits.bsync >= 3, JSON.stringify(r.json.limits));
  assert.equal(r.json.logins.bad_token, 1);
  assert.ok(r.json.top.some(([k]) => k.startsWith('bsync:')));
  assert.deepEqual(r.json.admins, ['jefa@prueba.pe']);
  // al cerrar la hora queda una fila en la bitácora y el resumen lo sigue mostrando (también después de reiniciar)
  const before = r.json.limits.bsync;
  S.sec.flush();
  assert.equal(S.S.one("SELECT COUNT(*) n FROM audit WHERE action='sec:hora'").n, 1);
  r = await adm.get('/api/admin/security');
  assert.equal(r.json.limits.bsync, before); assert.equal(r.json.logins.bad_token, 1);
  // quien no administra no lo ve
  r = await B.get('/api/admin/security'); assert.equal(r.status, 403);
});

test('lista de espera: tope de correos nuevos por día; quien ya está se puede volver a anotar', async () => {
  const A = client(S.base), codes = [];
  for (const e of ['a@x.pe', 'b@x.pe', 'c@x.pe', 'd@x.pe']) codes.push((await A.post('/api/waitlist', { plan: 'studio', email: e })).status);
  assert.deepEqual(codes, [200, 200, 200, 429]);
  assert.equal((await A.post('/api/waitlist', { plan: 'studio', email: 'a@x.pe' })).status, 200);
});

test('libro de reclamaciones: la copia a soporte tiene tope; la hoja se guarda igual', async () => {
  const A = client(S.base);
  const hoja = n => ({ nombre: 'Rosa ' + n, doc_num: '1234567' + n, domicilio: 'Trujillo', email: `rosa${n}@prueba.pe`, descripcion: 'Pro', detalle: 'detalle', pedido: 'pedido' });
  sent.length = 0;
  for (const n of [1, 2]) assert.equal((await A.post('/api/reclamos', hoja(n))).status, 201);
  await new Promise(r => setTimeout(r, 50));
  assert.equal(sent.filter(m => [].concat(m.to).includes('soporte@prueba.pe')).length, 1, 'una copia a soporte');
  assert.equal(sent.filter(m => /rosa\d@/.test([].concat(m.to).join())).length, 2, 'cada persona recibe la suya');
  assert.equal(S.S.one('SELECT COUNT(*) n FROM reclamos').n, 2);
});

test('la tabla de límites en memoria tiene tope', () => {
  const U = require('../lib/util');
  for (let i = 0; i < U.RL_MAX + 5000; i++) U.rateLimit('prueba:' + i, 5, 60e3);
  assert.ok(U.RL.size <= U.RL_MAX, String(U.RL.size));
  // las claves recientes siguen contando
  for (let i = 0; i < 5; i++) U.rateLimit('prueba:fija', 5, 60e3);
  assert.throws(() => U.rateLimit('prueba:fija', 5, 60e3), e => e.status === 429);
});

test('la cabecera de país solo vale con GEO_HEADER', async () => {
  let r = await fetch(S.base + '/api/geo?tz=America/Lima', { headers: { 'CF-IPCountry': 'US' } }).then(r => r.json());
  assert.equal(r.country, 'PE');
  process.env.GEO_HEADER = 'CF-IPCountry';
  r = await fetch(S.base + '/api/geo?tz=America/Lima', { headers: { 'CF-IPCountry': 'US' } }).then(r => r.json());
  assert.equal(r.country, 'US');
  delete process.env.GEO_HEADER;
});

test('las firmas falsas de los avisos de pago se cuentan por hora y no quedan pegadas', () => {
  const { makeSecurity } = require('../lib/seguridad');
  const rows = [], db = { run: (q, ...a) => rows.push({ action: a[2], detail: a[3], ts: a[0] }), all: q => /sec:hora/.test(q) ? rows.filter(r => r.action === 'sec:hora') : [] };
  const sec = makeSecurity(db);
  sec.sigFail('mp', '1.2.3.4'); sec.sigFail('mp', '1.2.3.4'); sec.sigFail('paddle', '5.6.7.8');
  assert.deepEqual(sec.summary().sigs, { mp: 2, paddle: 1 });
  assert.equal(rows.length, 0, 'nada se anota antes de cerrar la hora');
  sec.flush();
  assert.equal(rows.length, 1);
  assert.deepEqual(sec.summary().sigs, { mp: 2, paddle: 1 }, 'después de la hora sigue en el resumen, desde la bitácora');
  sec.stop();
});
