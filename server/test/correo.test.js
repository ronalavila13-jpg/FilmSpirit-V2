'use strict';
/* correos: la cuenta de administración no pasa a otra cuenta de Google; el tope del libro de reclamos cuenta por buzón */
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, client } = require('./helpers');
const { isEmail, mailbox } = require('../lib/util');

let S;
test.before(async () => { S = await start({ ADMIN_EMAILS: 'jefa@prueba.pe' }); });
test.after(async () => { await S.stop(); });

test('correo de administración: otra cuenta de Google con el mismo correo no se lo queda', async () => {
  const A = client(S.base);
  let r = await A.post('/api/auth/google', { credential: S.token('jefa@prueba.pe', 'Jefa', { sub: 'sub-original' }) });
  assert.equal(r.status, 200, r.text);
  const B = client(S.base);
  r = await B.post('/api/auth/google', { credential: S.token('jefa@prueba.pe', 'Otra', { sub: 'sub-nueva' }) });
  assert.equal(r.status, 409); assert.equal(r.json.code, 'email_taken');
  assert.equal(S.S.one('SELECT sub FROM users WHERE email=?', 'jefa@prueba.pe').sub, 'sub-original');
  // un correo que no es de administración sí pasa a la cuenta nueva (como antes)
  r = await client(S.base).post('/api/auth/google', { credential: S.token('normal@prueba.pe', 'N', { sub: 'sub-a' }) });
  assert.equal(r.status, 200);
  r = await client(S.base).post('/api/auth/google', { credential: S.token('normal@prueba.pe', 'N', { sub: 'sub-b' }) });
  assert.equal(r.status, 200);
  assert.equal(S.S.one('SELECT sub FROM users WHERE email=?', 'normal@prueba.pe').sub, 'sub-b');
});

test('correos: formas raras no pasan; las variantes cuentan como el mismo buzón', () => {
  assert.ok(isEmail('ana@prueba.pe')); assert.ok(isEmail("o'neil@prueba.pe")); assert.ok(isEmail('ana+x@prueba.pe'));
  for (const e of ['x<ana@prueba.pe>', 'ana@prueba.pe,beto@prueba.pe', '"ana"@prueba.pe', 'ana@prueba.pe;b', 'a(b)@prueba.pe']) assert.equal(isEmail(e), false, e);
  assert.equal(mailbox('A.Na+uno@Prueba.pe'), 'ana@prueba.pe');
  assert.equal(mailbox('ana@prueba.pe'), mailbox('a.n.a+dos@prueba.pe'));
});
