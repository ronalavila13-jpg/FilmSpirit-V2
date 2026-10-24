'use strict';
/* Robustez del servidor: guardados casi simultáneos, cuota con proyectos eliminados, límites de lectura y de pagos */
process.env.FREE_STORAGE_MB = '1'; process.env.FREE_ARCHIVED = '0'; process.env.FREE_SCRIPTS = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { start, client } = require('./helpers');

const guion = (title, x) => JSON.stringify({ meta: { title }, paras: [{ t: 'a', x }] });
let S, A;
test.before(async () => { S = await start(); A = client(S.base); await A.post('/api/auth/google', { credential: S.token('robusta@prueba.pe') }); });
test.after(async () => { await S.stop(); });

/* el cuerpo de un guardado llega lento y otro guardado con la misma base termina antes: el lento recibe «otra persona
   guardó antes» y lo del rápido no se pierde */
test('dos guardados casi a la vez: el segundo recibe conflicto y no se pierde nada', async () => {
  let r = await A.post('/api/projects', { sections: { guion: guion('T', 'v1') } });
  assert.equal(r.status, 201, r.text);
  const pid = r.json.pid;
  const body1 = JSON.stringify({ json: guion('T', 'LENTO'), base: 1 });
  const u = new URL(S.base);
  const slow = new Promise(resolve => {
    const req = http.request({ host: u.hostname, port: u.port, method: 'PUT', path: `/api/p/${pid}/s/guion`, headers: { Cookie: A.cookie, 'X-FS': '1', Origin: S.base, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body1) } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, d })); });
    req.write(body1.slice(0, 10));
    setTimeout(() => req.end(body1.slice(10)), 300);
  });
  await new Promise(r => setTimeout(r, 80));
  r = await A.put(`/api/p/${pid}/s/guion`, { json: guion('T', 'RAPIDO'), base: 1 });
  assert.equal(r.status, 200); assert.equal(r.json.v, 2);
  const s1 = await slow;
  assert.equal(s1.status, 409, s1.d);
  assert.match(S.S.one('SELECT json FROM sections WHERE pid=? AND sec=?', pid, 'guion').json, /RAPIDO/);
});

/* crear y eliminar en ciclo ya no llena el disco: lo eliminado cuenta para la cuota hasta que se borra del todo */
test('cuota: lo eliminado sigue contando; crear y eliminar en ciclo se detiene', async () => {
  const B = client(S.base); await B.post('/api/auth/google', { credential: S.token('ciclo@prueba.pe') });
  const big = JSON.stringify({ meta: { title: 'X' }, paras: [{ t: 'a', x: 'y'.repeat(400 * 1024) }] });
  const codes = [];
  for (let i = 0; i < 5; i++) {
    const r = await B.post('/api/projects', { sections: { guion: big } });
    codes.push(r.status);
    if (r.status === 201) await B.del('/api/p/' + r.json.pid);
  }
  assert.deepEqual(codes.slice(0, 2), [201, 201]);
  assert.ok(codes.includes(413), 'la cuota frena el ciclo: ' + codes.join(','));
});

/* consultar el estado del pago llama al medio de pago con la clave de la tienda: tiene un tope por persona */
test('pagos: «ya pagué» y cancelar tienen tope por persona', async () => {
  let last = 0;
  for (let i = 0; i < 31; i++) last = (await A.post('/api/billing/sync', { sid: 'nada' })).status;
  assert.equal(last, 429);
});
