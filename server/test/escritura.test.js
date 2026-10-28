'use strict';
/* contadores de escritura y racha de cada persona: se suman en su cuenta (dos envíos no se pisan), se limpian, tienen
   tope, la mejor racha y los logros solo crecen, y nadie más los ve */
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, client } = require('./helpers');
const { merge, clean } = require('../lib/escritura');

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

let S, A, B;
test.before(async () => {
  S = await start(); A = client(S.base); B = client(S.base);
  await A.post('/api/auth/google', { credential: S.token('escribe@prueba.pe', 'Escribe') });
  await B.post('/api/auth/google', { credential: S.token('otra@prueba.pe', 'Otra') });
});
test.after(async () => { await S.stop(); });

test('se suma lo que manda cada envío, por día y por guion', async () => {
  let r = await A.get('/api/me/writing');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.writing.goal, { w: 100, m: 15 });
  assert.deepEqual(r.json.writing.days, {});
  const d = today();
  r = await A.post('/api/me/writing', { add: [{ d, pid: 'p1', t: 'Sacrificio en el cañaveral', w: 120, ws: 300, ts: 60 }] });
  assert.equal(r.status, 200, r.text);
  // otra pestaña manda lo suyo: se suma, no se pisa
  await Promise.all([
    A.post('/api/me/writing', { add: [{ d, pid: 'p1', w: -20, ws: 30, ts: 0 }] }),
    A.post('/api/me/writing', { add: [{ d, pid: 'p2', t: 'Alto riesgo', w: 50, ws: 100, ts: 40 }] }),
  ]);
  r = await A.get('/api/me/writing');
  const day = r.json.writing.days[d];
  assert.deepEqual([day.w, day.ws, day.ts], [150, 430, 100]);
  assert.deepEqual(day.s.p1, [100, 330, 60]);
  assert.deepEqual(day.s.p2, [50, 100, 40]);
  assert.equal(r.json.writing.names.p1, 'Sacrificio en el cañaveral');
  r = await B.get('/api/me/writing');
  assert.deepEqual(r.json.writing.days, {}, 'cada quien ve solo lo suyo');
});

test('la meta se cambia; la mejor racha y los logros solo crecen', async () => {
  let r = await A.post('/api/me/writing', { goal: { w: 250, m: 'x' }, best: 9, got: { 3: daysAgo(6), 7: daysAgo(2), 5: daysAgo(1) } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.writing.goal, { w: 250, m: 15 });
  assert.equal(r.json.writing.best, 9);
  assert.deepEqual(r.json.writing.got, { 3: daysAgo(6), 7: daysAgo(2) }, 'solo los logros que existen');
  r = await A.post('/api/me/writing', { best: 4, got: { 3: today() } });
  assert.equal(r.json.writing.best, 9, 'la mejor racha no baja');
  assert.equal(r.json.writing.got[3], daysAgo(6), 'un logro guarda el primer día');
});

test('lo que no vale no entra: días lejanos, números enormes, guiones con nombres raros', () => {
  const now = Date.now(), d = new Date(now).toISOString().slice(0, 10);
  const W = merge(null, { add: [
    { d: '2020-01-01', w: 50 }, { d: 'ayer', w: 5 }, { d, pid: '../x', w: 1e9, ws: 1e9, ts: -5 }, { d, pid: 'ok', t: 'a\u0000b', w: 3 },
  ] }, now);
  assert.deepEqual(Object.keys(W.days), [d]);
  assert.equal(W.days[d].w, 50003);
  assert.equal(W.days[d].ws, 86400);
  assert.equal(W.days[d].ts, 0);
  assert.deepEqual(Object.keys(W.days[d].s), ['ok']);
  assert.equal(W.names.ok, 'ab');
  // lo guardado de antes se limpia igual
  const C = clean({ goal: { w: 'mucho' }, days: { [d]: { w: 'x', s: { 'mal id': [1, 2, 3] } }, nada: {} }, best: -3, got: { 3: 'hoy' } });
  assert.deepEqual(C.goal, { w: 100, m: 15 });
  assert.deepEqual(C.days[d], { w: 0, ws: 0, ts: 0 });
  assert.equal(C.best, 0); assert.deepEqual(C.got, {});
});

test('sin sesión no hay datos; desde otro sitio no se guardan', async () => {
  const C = client(S.base);
  let r = await C.get('/api/me/writing');
  assert.equal(r.status, 401);
  const res = await fetch(S.base + '/api/me/writing', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: A.cookie }, body: JSON.stringify({ add: [{ d: today(), w: 999 }] }) });
  assert.notEqual(res.status, 200, 'sin la cabecera de la app, no');
  r = await A.get('/api/me/writing');
  assert.equal(r.json.writing.days[today()].w, 150);
});
