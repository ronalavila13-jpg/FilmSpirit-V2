'use strict';
/* temas de colores de cada persona: se guardan en su cuenta, limpios, y nadie más los ve */
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, client } = require('./helpers');

let S, A, B;
test.before(async () => {
  S = await start(); A = client(S.base); B = client(S.base);
  await A.post('/api/auth/google', { credential: S.token('tema@prueba.pe', 'Tema') });
  await B.post('/api/auth/google', { credential: S.token('otro@prueba.pe', 'Otro') });
});
test.after(async () => { await S.stop(); });

test('guardar y leer los temas; lo que no es un color o sobra no entra', async () => {
  let r = await A.get('/api/me/themes');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.themes, []);
  const t = { id: 't1', name: '  Mi   productora ', tabc: { plan: '#ffd733', budget: 'rojo', otra: '#000000' },
    plan: { d: '#F3CD5B', n: '#93b1ea', brk: 'url(x)', hl: [{ name: 'Toma compleja', c: '#FAC5BD' }, { name: 'Sin color', c: 'nada' }] },
    cal: { pre: '#5B7BD5', hl: [] }, cat: { cast: '#4FB57A', 'mal-nombre': '#111111' }, screen: { bars: 'suave', barh: 'enorme', lt: 'gruesa' }, extra: 'fuera' };
  r = await A.put('/api/me/themes', { themes: [t, { id: 'mal id', name: 'x' }, t] });
  assert.equal(r.status, 200, r.text);
  const [g] = r.json.themes;
  assert.equal(r.json.themes.length, 1, 'el id inválido y el repetido no entran');
  assert.equal(g.name, 'Mi productora');
  assert.deepEqual(g.tabc, { plan: '#FFD733' });
  assert.deepEqual(g.plan, { d: '#F3CD5B', n: '#93B1EA', hl: [{ name: 'Toma compleja', c: '#FAC5BD' }] });
  assert.deepEqual(g.cat, { cast: '#4FB57A' });
  assert.deepEqual(g.screen, { bars: 'suave', barh: 'normal', lt: 'gruesa', lk: 'normal' });
  assert.equal(g.extra, undefined);
  r = await A.get('/api/me/themes');
  assert.equal(r.json.themes[0].id, 't1', 'quedan en la cuenta');
  r = await B.get('/api/me/themes');
  assert.deepEqual(r.json.themes, [], 'cada quien ve solo los suyos');
});

test('las paletas de ahora: la Escala de grises se guarda; sin pantalla no se inventa una', async () => {
  const D = client(S.base); await D.post('/api/auth/google', { credential: S.token('paleta@prueba.pe', 'Paleta') });
  const gris = { id: 'p1', name: 'Para imprimir', mono: true, plan: { d: '#F4F4F4' }, cal: {}, call: {}, cat: { cast: '#3A3A3A' } };
  const r = await D.put('/api/me/themes', { themes: [gris, { id: 'p2', name: 'Color', mono: 'sí', plan: {}, cal: {}, call: {}, cat: {} }] });
  assert.equal(r.status, 200, r.text);
  const [a, b] = r.json.themes;
  assert.equal(a.mono, true); assert.equal(a.screen, undefined);
  assert.equal(b.mono, undefined, 'solo true cuenta');
});

test('sin sesión no hay temas; desde otro sitio no se guardan', async () => {
  const C = client(S.base);
  let r = await C.get('/api/me/themes');
  assert.equal(r.status, 401);
  const res = await fetch(S.base + '/api/me/themes', { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: A.cookie }, body: JSON.stringify({ themes: [] }) });
  assert.notEqual(res.status, 200, 'sin la cabecera de la app, no');
  r = await A.get('/api/me/themes');
  assert.equal(r.json.themes.length, 1);
});
