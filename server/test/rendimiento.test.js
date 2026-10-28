'use strict';
/* Lote V · rendimiento: historial cada 5 minutos, abrir sin volver a bajar lo que el navegador ya tiene, cola de
   correos con reintentos y archivos comprimidos al compilar */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { start, client } = require('./helpers');
const { makeMail, BACKOFF } = require('../lib/mail');

const sec = o => JSON.stringify(o);
let S, A, B, pid;
test.before(async () => {
  S = await start();
  A = client(S.base); B = client(S.base);
  let r = await A.post('/api/auth/google', { credential: S.token('ana@prueba.pe', 'Ana') });
  assert.equal(r.status, 200, r.text);
  r = await B.post('/api/auth/google', { credential: S.token('beto@prueba.pe', 'Beto') });
  assert.equal(r.status, 200, r.text);
  S.S.run("UPDATE users SET plan='pro' WHERE email='ana@prueba.pe'");
  r = await A.post('/api/projects', { kind: 'prod', sections: {
    guion: sec({ meta: { title: 'El faro' }, paras: [{ t: 'scene', x: 'INT. FARO - NOCHE' }, { t: 'a', x: 'Ñandú y café ☕ 😀' }] }),
    desglose: sec({ elements: { e1: { id: 'e1', name: 'MARÍA', cat: 'cast' } }, tags: [], scenes: {} }),
    plan: sec({ schedule: { items: [] } }),
  } });
  assert.equal(r.status, 201, r.text);
  pid = r.json.pid;
});
test.after(async () => { await S.stop(); });

const hist = (s = 'guion') => S.S.all('SELECT v, ts FROM history WHERE pid=? AND sec=? ORDER BY v', pid, s);

test('historial: una copia cada 5 minutos, no en cada guardado', async () => {
  let v = 1;
  for (let i = 0; i < 6; i++) {
    const r = await A.put(`/api/p/${pid}/s/guion`, { json: sec({ meta: { title: 'El faro' }, paras: [{ t: 'a', x: 'toma ' + i }] }), base: v });
    assert.equal(r.status, 200, r.text); v = r.json.v;
  }
  assert.equal(v, 7);
  assert.deepEqual(hist().map(h => h.v), [1], 'solo la versión de antes de empezar a escribir');
  // pasaron 6 minutos desde la última copia: el siguiente guardado guarda la versión vigente
  S.S.run('UPDATE history SET ts=ts-? WHERE pid=?', 6 * 60e3, pid);
  let r = await A.put(`/api/p/${pid}/s/guion`, { json: sec({ meta: { title: 'El faro' }, paras: [{ t: 'a', x: 'otra' }] }), base: v });
  assert.equal(r.status, 200); v = r.json.v;
  assert.deepEqual(hist().map(h => h.v), [1, 7]);
  r = await A.put(`/api/p/${pid}/s/guion`, { json: sec({ meta: { title: 'El faro' }, paras: [{ t: 'a', x: 'y otra' }] }), base: v });
  assert.deepEqual(hist().map(h => h.v), [1, 7], 'dentro de los 5 minutos no se copia');
  // la copia guardada es la versión anterior completa (comprimida)
  const z = S.S.one('SELECT z FROM history WHERE pid=? AND sec=? AND v=7', pid, 'guion').z;
  assert.equal(JSON.parse(S.S.gunz(z)).paras[0].x, 'toma 5');
});

test('historial: si otra persona guarda encima, la versión anterior se copia (como mucho una vez por minuto)', async () => {
  // Beto entra al equipo con permiso de editar el guion
  let r = await A.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'beto@prueba.pe', role: 'Guion', perms: { guion: 'editar' } }] });
  assert.equal(r.status, 200, r.text);
  r = await B.get(`/api/p/${pid}`); assert.equal(r.status, 200, r.text);
  S.S.run('UPDATE history SET ts=? WHERE pid=?', Date.now() - 2 * 60e3, pid);     // la última copia, hace 2 minutos
  const n0 = hist().length;
  let v = S.S.one("SELECT v FROM sections WHERE pid=? AND sec='guion'", pid).v;
  r = await B.put(`/api/p/${pid}/s/guion`, { json: sec({ meta: { title: 'El faro' }, paras: [{ t: 'a', x: 'de Beto' }] }), base: v });
  assert.equal(r.status, 200, r.text);
  assert.equal(hist().length, n0 + 1, 'lo de Ana queda copiado aunque no pasaron 5 minutos');
  r = await A.put(`/api/p/${pid}/s/guion`, { json: sec({ meta: { title: 'El faro' }, paras: [{ t: 'a', x: 'de Ana otra vez' }] }), base: r.json.v });
  assert.equal(r.status, 200, r.text);
  assert.equal(hist().length, n0 + 1, 'dentro del minuto no se vuelve a copiar');
  r = await A.put(`/api/p/${pid}/team`, { list: [{ id: (S.S.one("SELECT id FROM users WHERE email='beto@prueba.pe'")).id, remove: true }] });
  assert.equal(r.status, 200, r.text);
});

test('modelos 3D: uno que descomprimido pasa de 96 MB se rechaza sin llenar la memoria', async () => {
  const head = Buffer.from(JSON.stringify({ v: 1, kind: 'set', parts: [] }));
  const raw = Buffer.alloc(8 + head.length + 97 * 1024 * 1024); raw.write('FSM1', 0, 'latin1'); raw.writeUInt32LE(head.length, 4); head.copy(raw, 8);
  const url = 'data:model/x-fsm;base64,' + zlib.gzipSync(raw).toString('base64');
  const rss = process.memoryUsage().rss;
  // (lote AD) con modelos de personajes («m3~c~…»): los de escenarios son de Studio y este proyecto es de Pro
  const rs = await Promise.all([1, 2, 3, 4, 5, 6].map(i => A.put(`/api/p/${pid}/f`, { k: 'm3~c~b' + i, url })));
  assert.ok(rs.every(r => r.status === 400 && r.json.code === 'bad_image'), rs.map(r => r.status).join(','));
  assert.ok(process.memoryUsage().rss - rss < 200 * 1048576, 'seis a la vez no suman cientos de MB');
});

test('historial: quedan las 40 copias más recientes aunque las versiones no sean seguidas', async () => {
  const old = Date.now() - 864e5;
  S.S.run('DELETE FROM history WHERE pid=? AND sec=?', pid, 'plan');
  for (let i = 0; i < 45; i++) S.S.run('INSERT INTO history(pid,sec,v,z,by,ts) VALUES(?,?,?,?,?,?)', pid, 'plan', 1000 + i * 7, S.S.gz('{}'), null, old);
  const cur = S.S.one("SELECT v FROM sections WHERE pid=? AND sec='plan'", pid).v;
  S.S.run("UPDATE sections SET v=? WHERE pid=? AND sec='plan'", 2000, pid);
  const r = await A.put(`/api/p/${pid}/s/plan`, { json: sec({ schedule: { items: [{ id: 'x' }] } }), base: 2000 });
  assert.equal(r.status, 200, r.text);
  const h = hist('plan');
  assert.equal(h.length, 40);
  assert.equal(h[h.length - 1].v, 2000, 'la nueva copia');
  assert.equal(h[0].v, 1000 + 6 * 7, 'se borran las más antiguas');
  assert.ok(cur >= 1);
});

test('abrir: lo que el navegador ya tiene en la misma versión no se vuelve a enviar', async () => {
  let r = await A.get(`/api/p/${pid}?full=1`);
  assert.equal(r.status, 200);
  const full = r.json.sections;
  const g = full.guion, d = full.desglose;
  assert.ok(g.json && d.json);
  r = await A.get(`/api/p/${pid}?full=1&have=${encodeURIComponent(`guion.${g.v},desglose.${d.v - 1},notas.1,gastos.0,inventada.3,malo,plan.x`)}`);
  assert.equal(r.status, 200);
  const s = r.json.sections;
  assert.deepEqual(s.guion, { v: g.v, same: 1, n: Buffer.byteLength(g.json) }, 'el guion no viaja: solo su versión y su largo en bytes');
  assert.equal(s.desglose.json, d.json, 'otra versión: se envía completa');
  assert.ok(s.plan.json, 'sin versión válida: se envía');
  assert.equal(r.json.vers.guion, g.v);
  // las notas se envían siempre (cada quien ve las suyas)
  assert.ok(!(s.notas && s.notas.same));
  // quien no puede leer el desglose no lo recibe, diga lo que diga
  r = await A.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'beto@prueba.pe', role: 'Guion', perms: { guion: 'ver' } }] });
  assert.equal(r.status, 200, r.text);
  r = await B.get(`/api/p/${pid}?full=1&have=${encodeURIComponent(`guion.${g.v},desglose.${d.v}`)}`);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.sections.desglose, null);
  assert.equal(r.json.sections.guion.same, 1);
});

test('correos: lo que no sale queda en cola y se reintenta; lo rechazado no', async () => {
  const sentTo = [];
  let fails = 2;
  const mail = makeMail({}, S.S, { ready: true, transport: async m => {
    if (m.to === 'malo@prueba.pe') return { sent: false, permanent: true, err: '422 dirección inválida' };
    if (m.to === 'nunca@prueba.pe') return { sent: false, err: 'caído' };
    if (fails-- > 0) throw new Error('servicio caído');
    sentTo.push(m.to); return { sent: true };
  } });
  // el libro de reclamaciones: se intenta en el momento
  let r = await mail.deliver({ kind: 'reclamo', to: 'cliente@prueba.pe', subject: 'Hoja LR-1', text: 'datos personales' });
  assert.deepEqual(r, { sent: false, queued: true });
  const row = () => S.S.one("SELECT * FROM outbox WHERE to_addr='cliente@prueba.pe'");
  assert.equal(row().tries, 1); assert.ok(row().next > Date.now() + 30e3, 'se reintenta al minuto');
  assert.equal(await mail.flush(), 0, 'todavía no le toca');
  S.S.run('UPDATE outbox SET next=0');
  await mail.flush();
  assert.equal(row().tries, 2); assert.equal(row().sent, null);
  S.S.run('UPDATE outbox SET next=0');
  assert.equal(await mail.flush(), 1);
  assert.ok(row().sent); assert.equal(row().body, '', 'lo enviado no guarda el texto');
  assert.deepEqual(sentTo, ['cliente@prueba.pe']);
  // en cola sin esperar (aviso del fin del mes gratis)
  assert.deepEqual(mail.queue({ kind: 'fin-mes-gratis', to: 'ana@prueba.pe', subject: 'Tu mes gratis termina', text: '…' }), { queued: true });
  await new Promise(res => setImmediate(res)); await mail.flush();
  assert.deepEqual(sentTo, ['cliente@prueba.pe', 'ana@prueba.pe']);
  // rechazado por el servicio: no se reintenta y queda anotado
  r = await mail.deliver({ kind: 'reclamo', to: 'malo@prueba.pe', subject: 'x', text: 'y' });
  assert.deepEqual(r, { sent: false, queued: false });
  assert.ok(S.S.one("SELECT dead FROM outbox WHERE to_addr='malo@prueba.pe'").dead);
  const dead = S.S.one("SELECT id FROM outbox WHERE to_addr='malo@prueba.pe'").id;
  assert.ok(S.S.one("SELECT 1 x FROM audit WHERE action='mail_failed' AND detail LIKE ?", `%"id":${dead},%`), 'queda en la bitácora (por su número, sin la dirección)');
  // falla siempre: se rinde después de todos los reintentos (unas 48 horas)
  mail.queue({ to: 'nunca@prueba.pe', subject: 'x', text: 'y' });
  await new Promise(res => setImmediate(res));
  for (let i = 0; i <= BACKOFF.length + 1; i++) { S.S.run("UPDATE outbox SET next=0 WHERE to_addr='nunca@prueba.pe'"); await mail.flush(); }
  const n = S.S.one("SELECT * FROM outbox WHERE to_addr='nunca@prueba.pe'");
  assert.ok(n.dead); assert.equal(n.tries, BACKOFF.length + 1); assert.equal(n.body, '');
  // cada intento lleva la misma clave (Resend no manda dos veces lo que ya recibió)
  const keys = [];
  const k = makeMail({}, S.S, { ready: true, transport: async m => { keys.push(m.key); return keys.length < 2 ? { sent: false, err: '401 clave' } : { sent: true }; } });
  await k.deliver({ to: 'llave@prueba.pe', subject: 'x', text: 'y' });
  S.S.run("UPDATE outbox SET next=0 WHERE to_addr='llave@prueba.pe'"); await k.flush();
  assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]); assert.match(keys[0], /^fs-outbox-\d+-\d+$/);
  // la bitácora no guarda la dirección
  assert.ok(!S.S.one("SELECT 1 x FROM audit WHERE action='mail_failed' AND detail LIKE '%@%'"));
  // cuenta eliminada: sus correos pendientes se van con ella
  mail.queue({ to: 'beto@prueba.pe', subject: 'Bienvenida', text: '…' });
  r = await B.post('/api/me/delete', { confirm: 'beto@prueba.pe' });
  assert.equal(r.status, 200, r.text);
  assert.equal(S.S.one("SELECT COUNT(*) n FROM outbox WHERE to_addr='beto@prueba.pe'").n, 0);
  // sin servicio configurado no se anota nada (como antes)
  const off = makeMail({}, S.S, { ready: false });
  assert.deepEqual(await off.deliver({ to: 'a@b.pe', subject: 'x', text: 'y' }), { sent: false, queued: false });
});

test('archivos: se usa la copia comprimida al compilar; si es vieja, se comprime sin trabar el servidor', async () => {
  const pub = path.join(S.tmp, 'public', 'app');
  const js = 'const x = ' + JSON.stringify('a'.repeat(4000)) + ';\n';
  fs.writeFileSync(path.join(pub, 'grande.js'), js);
  // una copia .br «de compilación» distinta, para saber cuál se mandó
  const marca = '/* copia de make.js */ ' + js;
  fs.writeFileSync(path.join(pub, 'grande.js.br'), zlib.brotliCompressSync(Buffer.from(marca)));
  const t0 = Date.now() / 1000;
  fs.utimesSync(path.join(pub, 'grande.js'), t0 - 100, t0 - 100);
  fs.utimesSync(path.join(pub, 'grande.js.br'), t0 - 50, t0 - 50);
  let r = await fetch(S.base + '/app/grande.js', { headers: { 'Accept-Encoding': 'br' } });
  assert.equal(r.headers.get('content-encoding'), 'br');
  assert.equal(await r.text(), marca, 'la copia comprimida al compilar');
  // el archivo cambió después de comprimir: la copia no sirve y se comprime en el momento
  fs.utimesSync(path.join(pub, 'grande.js'), t0, t0);
  r = await fetch(S.base + '/app/grande.js', { headers: { 'Accept-Encoding': 'br' } });
  assert.equal(r.headers.get('content-encoding'), 'br');
  assert.equal(await r.text(), js);
  r = await fetch(S.base + '/app/grande.js', { headers: { 'Accept-Encoding': 'gzip' } });
  assert.equal(r.headers.get('content-encoding'), 'gzip');
  assert.equal(await r.text(), js);
  // varios a la vez: una sola compresión y todos reciben lo mismo
  fs.utimesSync(path.join(pub, 'grande.js'), t0 + 5, t0 + 5);
  const all = await Promise.all([1, 2, 3, 4].map(() => fetch(S.base + '/app/grande.js', { headers: { 'Accept-Encoding': 'gzip' } }).then(x => x.text())));
  assert.ok(all.every(x => x === js));
});
