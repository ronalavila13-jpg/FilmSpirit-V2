'use strict';
/* (lote W) enlaces cortos de Google Maps: el servidor sigue las redirecciones (solo https, solo hacia Google Maps, a lo
   más 5 saltos) y devuelve la dirección larga; pide sesión, la cabecera de la app y tiene un límite por persona.
   Las redirecciones se simulan: la prueba no sale a internet */
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, client } = require('./helpers');
const { makeMapas, shortOf } = require('../lib/mapas');

/* un internet de mentira: dirección → [estado, Location] */
function fakeNet(routes) {
  const calls = [];
  const f = async (url, o) => {
    calls.push({ url, o });
    if (routes.__throw) throw new Error('red caída');
    const r = routes[url];
    if (!r) return new Response('nada', { status: 404 });
    return new Response(null, { status: r[0], headers: r[1] ? { Location: r[1] } : {} });
  };
  f.calls = calls;
  return f;
}
const LONG = 'https://www.google.com/maps/place/Plaza+de+Armas/@-8.1116,-79.0287,17z/data=!3m1!4b1';

test('qué enlaces se aceptan', () => {
  assert.equal(shortOf('https://maps.app.goo.gl/AbC123xyz'), 'https://maps.app.goo.gl/AbC123xyz');
  assert.equal(shortOf('maps.app.goo.gl/AbC123xyz?g_st=iw'), 'https://maps.app.goo.gl/AbC123xyz?g_st=iw', 'sin https:// se completa');
  assert.equal(shortOf('http://goo.gl/maps/AbC123'), 'https://goo.gl/maps/AbC123', 'siempre por https');
  for (const u of ['https://goo.gl/AbC123', 'https://bit.ly/x', 'https://evil.com/maps.app.goo.gl/x', 'https://maps.app.goo.gl.evil.com/x', 'https://user:pw@maps.app.goo.gl/x',
    'https://maps.app.goo.gl:8443/x', 'https://maps.app.goo.gl/', 'https://maps.app.goo.gl/a/b', 'file:///etc/passwd', '', null, 'x'.repeat(400)])
    assert.equal(shortOf(u), null, String(u).slice(0, 60));
});

test('sigue las redirecciones hasta Google Maps (con el paso por el consentimiento)', async () => {
  const net = fakeNet({
    'https://maps.app.goo.gl/AbC123': [302, 'https://goo.gl/maps/Zz9'],
    'https://goo.gl/maps/Zz9': [301, 'https://consent.google.com/ml?continue=' + encodeURIComponent(LONG) + '&gl=PE'],
  });
  const M = makeMapas({ fetch: net, userAgent: 'FilmSpirit-prueba' });
  assert.equal(await M.resolve('maps.app.goo.gl/AbC123'), LONG);
  assert.equal(net.calls.length, 2);
  assert.equal(net.calls[0].o.redirect, 'manual', 'las redirecciones se siguen a mano');
  assert.equal(net.calls[0].o.headers['User-Agent'], 'FilmSpirit-prueba');
  assert.ok(net.calls[0].o.signal, 'con tiempo límite');
  assert.equal(await M.resolve('https://maps.app.goo.gl/AbC123'), LONG);
  assert.equal(net.calls.length, 2, 'lo resuelto se recuerda');
});

test('no sigue a otros sitios, ni por http, ni más de 5 saltos', async () => {
  const M = makeMapas({ fetch: fakeNet({
    'https://maps.app.goo.gl/afuera': [302, 'https://evil.com/maps/@-8,-79,15z'],
    'https://maps.app.goo.gl/http': [302, 'http://www.google.com/maps/@-8,-79,15z'],
    'https://maps.app.goo.gl/local': [302, 'https://127.0.0.1/maps'],
    'https://maps.app.goo.gl/l1': [302, 'https://maps.app.goo.gl/l2'], 'https://maps.app.goo.gl/l2': [302, 'https://maps.app.goo.gl/l3'],
    'https://maps.app.goo.gl/l3': [302, 'https://maps.app.goo.gl/l4'], 'https://maps.app.goo.gl/l4': [302, 'https://maps.app.goo.gl/l5'],
    'https://maps.app.goo.gl/l5': [302, 'https://maps.app.goo.gl/l6'], 'https://maps.app.goo.gl/l6': [302, LONG],
    'https://maps.app.goo.gl/nada': [200, null],
    'https://maps.app.goo.gl/gmail': [302, 'https://mail.google.com/x'],
  }) });
  for (const k of ['afuera', 'http', 'local', 'l1', 'nada', 'gmail'])
    await assert.rejects(M.resolve('https://maps.app.goo.gl/' + k), e => e.code === 'no_place', k);
  await assert.rejects(M.resolve('https://bit.ly/x'), e => e.code === 'bad_url');
  const caida = makeMapas({ fetch: fakeNet({ __throw: true }) });
  await assert.rejects(caida.resolve('https://maps.app.goo.gl/x1'), e => e.code === 'resolve_failed');
});

test('el endpoint: con sesión y la cabecera de la app, con límite por persona', async () => {
  const S = await start();
  try {
    S.mapas.clear();
    const net = fakeNet({ 'https://maps.app.goo.gl/Ok1': [302, LONG] });
    // la red de mentira del servidor de prueba
    const real = makeMapas({ fetch: net });
    S.mapas.resolve = real.resolve;
    const anon = client(S.base);
    let r = await anon.post('/api/maps/resolve', { url: 'https://maps.app.goo.gl/Ok1' });
    assert.equal(r.status, 401, 'sin sesión, no');
    const A = client(S.base);
    await A.post('/api/auth/google', { credential: S.token('mapa@prueba.pe', 'Mapa') });
    r = await A.post('/api/maps/resolve', { url: 'https://maps.app.goo.gl/Ok1' });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.url, LONG);
    r = await A.req('POST', '/api/maps/resolve', { url: 'https://maps.app.goo.gl/Ok1' }, { 'X-FS': '' });
    assert.equal(r.status, 403, 'sin la cabecera de la app, no');
    r = await A.post('/api/maps/resolve', { url: 'https://example.com/x' });
    assert.equal(r.status, 400); assert.equal(r.json.code, 'bad_url');
    r = await A.post('/api/maps/resolve', { url: 'https://maps.app.goo.gl/NoExiste' });
    assert.equal(r.status, 422); assert.equal(r.json.code, 'no_place');
    let last = 0;
    for (let i = 0; i < 70; i++) { last = (await A.post('/api/maps/resolve', { url: 'https://maps.app.goo.gl/Ok1' })).status; if (last === 429) break; }
    assert.equal(last, 429, 'tiene límite de pedidos por persona');
    // la política de seguridad deja ver las teselas de OpenStreetMap y nada más de afuera para imágenes
    const h = await fetch(S.base + '/healthz');
    const page = await A.get('/app/');
    const csp = page.headers.get('content-security-policy') || '';
    assert.match(csp, /img-src 'self' data: blob: https:\/\/\*\.googleusercontent\.com https:\/\/tile\.openstreetmap\.org;/);
    assert.ok(!/script-src[^;]*(jsdelivr|unpkg|cdnjs)/.test(csp), 'Leaflet se sirve desde el mismo servidor');
    assert.equal(h.status, 200);
  } finally { await S.stop(); }
});
