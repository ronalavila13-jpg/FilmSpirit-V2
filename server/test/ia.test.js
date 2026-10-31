'use strict';
/* imágenes con IA (Studio): la key de cada persona vive cifrada en el servidor; Google se simula con un fetch falso */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { start, client } = require('./helpers');
const { makeIa } = require('../lib/ia');

const KEY = 'AIzaSyPRUEBA-clave-falsa_0123456789abc';
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
let S, A, F, realFetch, google;

test.before(async () => {
  realFetch = global.fetch;
  google = { calls: [], models: { status: 200, body: { models: [] } }, image: { status: 200, body: { steps: [{ type: 'model_output', content: [{ type: 'text', text: 'ok' }, { type: 'image', mime_type: 'image/png', data: 'AAAA' }] }] } } };
  global.fetch = async (url, opt) => {
    if (!String(url).startsWith('https://generativelanguage.googleapis.com/')) return realFetch(url, opt);
    google.calls.push({ url: String(url), opt });
    const r = /\/models/.test(url) ? google.models : google.image;
    if (r.hang) throw new DOMException('timeout', 'TimeoutError');
    return new Response(JSON.stringify(r.body), { status: r.status });
  };
  S = await start(); A = client(S.base); F = client(S.base);
  await A.post('/api/auth/google', { credential: S.token('studio@prueba.pe', 'Studio') });
  await F.post('/api/auth/google', { credential: S.token('gratis@prueba.pe', 'Gratis') });
  S.S.run("UPDATE users SET plan='studio' WHERE email='studio@prueba.pe'");
});
test.after(async () => { global.fetch = realFetch; await S.stop(); });

test('el cifrado va y vuelve; con otro secreto no se abre', () => {
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'fs-ia-'));
  const a = makeIa(tmp, {}), b = makeIa(tmp, { IA_KEY_SECRET: 'otro' });
  const s = a.seal(KEY);
  assert.match(s, /^v1:[^:]+:[^:]+:[^:]+$/); assert.ok(!s.includes(KEY));
  assert.equal(a.unseal(s), KEY);
  assert.equal(makeIa(tmp, {}).unseal(s), KEY, 'el archivo de secreto se reutiliza');
  assert.equal(b.unseal(s), null);
  assert.equal(a.unseal('basura'), null);
  assert.ok(fs.existsSync(path.join(tmp, 'ia-secreto.key')));
});

test('guardar la key: formato, validación con Google y nunca vuelve al navegador', async () => {
  let r = await A.get('/api/me/ia');
  assert.equal(r.status, 200); assert.equal(r.json.studio, true); assert.equal(r.json.hasKey, false); assert.equal(r.json.models.length, 3);
  r = await A.put('/api/me/ia', { key: 'corta' });
  assert.equal(r.status, 400); assert.equal(r.json.code, 'ia_key');
  google.models = { status: 400, body: { error: { status: 'INVALID_ARGUMENT', message: 'API key not valid. Please pass a valid API key.' } } };
  r = await A.put('/api/me/ia', { key: KEY });
  assert.equal(r.status, 400); assert.equal(r.json.code, 'ia_key');
  assert.equal((await A.get('/api/me/ia')).json.hasKey, false, 'la key inválida no se guarda');
  google.models = { status: 200, body: { models: [] } };
  r = await A.put('/api/me/ia', { key: KEY, model: 'gemini-3-pro-image' });
  assert.equal(r.status, 200, r.text); assert.equal(r.json.hasKey, true); assert.equal(r.json.last4, KEY.slice(-4)); assert.equal(r.json.model, 'gemini-3-pro-image');
  assert.equal(google.calls.at(-1).opt.headers['x-goog-api-key'], KEY);
  google.models = { status: 200, body: { models: [{ name: 'models/gemini-3-pro-image' }, { name: 'models/otro' }] } };
  r = await A.put('/api/me/ia', { key: KEY });
  assert.deepEqual(r.json.models.map(m => m.id), ['gemini-3-pro-image'], 'solo los modelos que Google lista para esta key');
  google.models = { status: 200, body: { models: [] } };
  const todo = [(await A.get('/api/me/ia')).text, (await A.get('/api/me')).text, r.text].join('');
  assert.ok(!todo.includes(KEY), 'la key no sale del servidor');
  assert.equal((await A.get('/api/me')).json.ia.key, true);
  const fila = S.S.one("SELECT ia_key FROM users WHERE email='studio@prueba.pe'");
  assert.ok(fila.ia_key.startsWith('v1:') && !fila.ia_key.includes(KEY), 'en la base va cifrada');
  r = await A.put('/api/me/ia', { model: 'inventado' });
  assert.equal(r.status, 400);
});

test('sin Studio no se guarda key ni se genera; sin sesión tampoco', async () => {
  let r = await F.put('/api/me/ia', { key: KEY });
  assert.equal(r.status, 403); assert.equal(r.json.code, 'plan_studio');
  r = await F.post('/api/ia/imagen', { prompt: 'x' });
  assert.equal(r.status, 403); assert.equal(r.json.code, 'plan_studio');
  assert.equal((await client(S.base).get('/api/me/ia')).status, 401);
});

test('generar: la imagen de Google vuelve como data URL y se pide con el modelo, la proporción y las referencias', async () => {
  const n = google.calls.length;
  const r = await A.post('/api/ia/imagen', { prompt: 'Un detective bajo la lluvia', refs: [PNG, PNG], aspect: '21:9' });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.image, 'data:image/png;base64,AAAA');
  const c = google.calls[n], b = JSON.parse(c.opt.body);
  assert.match(c.url, /\/v1beta\/interactions$/);
  assert.equal(b.model, 'gemini-3-pro-image'); assert.equal(b.response_format.aspect_ratio, '21:9');
  assert.deepEqual(b.input.map(x => x.type), ['text', 'image', 'image']); assert.equal(b.input[1].data, 'iVBORw0KGgo=');
});

test('generar: límites de entrada y de ritmo', async () => {
  let r = await A.post('/api/ia/imagen', { prompt: '' });
  assert.equal(r.status, 400);
  r = await A.post('/api/ia/imagen', { prompt: 'x'.repeat(4001) });
  assert.equal(r.status, 400);
  r = await A.post('/api/ia/imagen', { prompt: 'x', refs: Array(7).fill(PNG) });
  assert.equal(r.status, 400);
  r = await A.post('/api/ia/imagen', { prompt: 'x', refs: ['http://x/y.png'] });
  assert.equal(r.status, 400);
  r = await A.post('/api/ia/imagen', { prompt: 'x', refs: ['data:image/png;base64,' + 'A'.repeat(2.9e6)] });
  assert.equal(r.status, 413);
  let last; for (let i = 0; i < 14; i++) last = await A.post('/api/ia/imagen', { prompt: 'x' });
  assert.equal(last.status, 429);
});

test('cada error de Google llega con su código, sin la key', async () => {
  const U = client(S.base); await U.post('/api/auth/google', { credential: S.token('errores@prueba.pe', 'Errores') });
  S.S.run("UPDATE users SET plan='studio' WHERE email='errores@prueba.pe'");
  assert.equal((await U.post('/api/ia/imagen', { prompt: 'x' })).json.code, 'ia_nokey');
  assert.equal((await U.post('/api/ia/imagen', { prompt: 'x' })).status, 409);
  assert.equal((await U.put('/api/me/ia', { key: KEY })).status, 200);
  const caso = async (img, status, code) => {
    google.image = img;
    const r = await U.post('/api/ia/imagen', { prompt: 'x' });
    assert.equal(r.status, status, code); assert.equal(r.json.code, code); assert.ok(!r.text.includes(KEY));
  };
  await caso({ status: 403, body: { error: { message: 'API key not valid' } } }, 400, 'ia_key');
  await caso({ status: 429, body: { error: { status: 'RESOURCE_EXHAUSTED', message: 'quota' } } }, 402, 'ia_quota');
  await caso({ status: 200, body: { steps: [{ content: [{ type: 'text', text: 'no puedo' }] }] } }, 422, 'ia_blocked');
  await caso({ status: 500, body: {} }, 502, 'ia_failed');
  await caso({ hang: true }, 504, 'ia_timeout');
  const r = await U.del('/api/me/ia');
  assert.equal(r.json.hasKey, false);
  assert.equal((await U.post('/api/ia/imagen', { prompt: 'x' })).json.code, 'ia_nokey');
});
