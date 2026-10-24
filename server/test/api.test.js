'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, client, listen } = require('./helpers');

const SECS = ['guion', 'desglose', 'storyboard', 'animatic', 'plan', 'calendario', 'presupuesto', 'llamado', 'hoja'];
const sections = title => ({
  guion: JSON.stringify({ meta: { title, author: 'Ana' }, paras: [{ t: 'scene', x: 'INT. CASA - DÍA' }] }),
  desglose: JSON.stringify({ elements: { e1: { id: 'e1', name: 'MARÍA', cat: 'cast' }, e2: { id: 'e2', name: 'Sombrero', cat: 'wardrobe' } }, tags: [], scenes: {} }),
  storyboard: JSON.stringify({ shots: {}, plans: {}, locPlans: {}, aspect: '16:9', looks: {} }),
  presupuesto: JSON.stringify({ budget: { lines: [{ id: 'l1', name: 'Cámara', amount: 1000 }] } }),
  plan: JSON.stringify({ schedule: { items: [] } }),
});
const PNG = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex').toString('base64');

let S, A, B, C;
test.before(async () => { S = await start(); A = client(S.base); B = client(S.base); C = client(S.base); });
test.after(async () => { await S.stop(); });

test('entrar con Google: token válido, inválido y protección CSRF', async () => {
  let r = await A.post('/api/auth/google', { credential: S.token('ana@prueba.pe', 'Ana', { aud: 'otra-app' }) });
  assert.equal(r.status, 401);
  r = await A.post('/api/auth/google', { credential: S.token('ana@prueba.pe', 'Ana', { email_verified: false }) });
  assert.equal(r.status, 401);
  r = await A.post('/api/auth/google', { credential: S.token('ana@prueba.pe', 'Ana', { exp: Math.floor(Date.now() / 1000) - 600 }) });
  assert.equal(r.status, 401);
  // firma alterada
  const t = S.token('ana@prueba.pe', 'Ana'); const bad = t.slice(0, -4) + (t.endsWith('AAAA') ? 'BBBB' : 'AAAA');
  r = await A.post('/api/auth/google', { credential: bad });
  assert.equal(r.status, 401);
  r = await A.req('POST', '/api/auth/google', { credential: S.token('ana@prueba.pe', 'Ana') }, { 'X-FS': '0' });
  assert.equal(r.status, 403, 'sin X-FS no se acepta');
  r = await A.req('POST', '/api/auth/google', { credential: S.token('ana@prueba.pe', 'Ana') }, { Origin: 'https://malo.example' });
  assert.equal(r.status, 403, 'desde otro sitio no se acepta');
  r = await A.post('/api/auth/google', { credential: S.token('ana@prueba.pe', 'Ana') });
  assert.equal(r.status, 200);
  assert.equal(r.json.me.email, 'ana@prueba.pe');
  assert.equal(r.json.me.plan, 'free');
  assert.match(r.headers.get('set-cookie'), /HttpOnly/);
  r = await A.get('/api/me');
  assert.equal(r.json.name, 'Ana');
  r = await client(S.base).get('/api/me');
  assert.equal(r.status, 401);
});

test('quien entra por www pasa a la dirección oficial (si no, el inicio con Google se rechaza)', async () => {
  const http = require('node:http'), u = new URL(S.base);
  const req = (method, host, p) => new Promise((ok, ko) => {
    const r = http.request({ host: u.hostname, port: u.port, method, path: p, headers: { Host: host, 'X-FS': '1', 'Content-Type': 'application/json' } }, res => { res.resume(); ok(res); });
    r.on('error', ko); r.end(method === 'POST' ? '{}' : undefined);
  });
  let r = await req('GET', 'www.' + u.host, '/entrar?next=%2Fapp%2F');
  assert.equal(r.statusCode, 301);
  assert.equal(r.headers.location, S.base + '/entrar?next=%2Fapp%2F');
  r = await req('POST', 'www.' + u.host, '/api/auth/google');
  assert.equal(r.statusCode, 307, 'el método se conserva');
  r = await req('GET', u.host, '/healthz');
  assert.equal(r.statusCode, 200);
  r = await req('GET', 'otro.ejemplo', '/healthz');
  assert.equal(r.statusCode, 200, 'otras direcciones (127.0.0.1 de la revisión) no se redirigen');
});

test('la app pide sesión; la portada no', async () => {
  const anon = client(S.base);
  let r = await anon.get('/app/');
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), /^\/entrar\?next=/);
  r = await A.get('/app/');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /script-src 'self'/);
  r = await anon.get('/');
  assert.equal(r.status, 200);
  assert.match(r.text, /cliente-de-prueba/, 'la portada recibe el id de cliente de Google');
  r = await anon.get('/../../etc/passwd');
  assert.equal(r.status, 404);
});

let pid;
test('plan Guion: hasta 5 guiones, sin producción; Indie lleva el guion a producción', async () => {
  let r = await A.post('/api/projects', { sections: sections('El faro'), c: 'cA' });
  assert.equal(r.status, 201, r.text);
  pid = r.json.pid;
  assert.equal(r.json.title, 'El faro');
  assert.equal(r.json.admin, true);
  assert.equal(r.json.kind, 'guion', 'con el plan Guion, un proyecto nuevo es un guion');
  r = await A.get(`/api/p/${pid}?full=1`);
  assert.equal(JSON.parse(r.json.sections.guion.json).meta.title, 'El faro');
  assert.deepEqual(r.json.read, ['guion']);
  assert.equal(r.json.sections.desglose, undefined, 'en un guion no se guarda el desglose');
  assert.equal(r.json.vers.guion, 1);
  r = await A.put(`/api/p/${pid}/s/desglose`, { json: sections('x').desglose, base: 0 });
  assert.equal(r.status, 403); assert.equal(r.json.code, 'script_only');
  r = await A.put(`/api/p/${pid}/f`, { k: 'sh1', url: PNG });
  assert.equal(r.status, 403); assert.equal(r.json.code, 'script_only', 'un guion es solo texto');
  // 5 guiones activos
  const extra = [];
  for (let i = 2; i <= 5; i++) { r = await A.post('/api/projects', { sections: sections('Guion ' + i) }); assert.equal(r.status, 201); extra.push(r.json.pid); }
  r = await A.post('/api/projects', { sections: sections('Seis') });
  assert.equal(r.status, 403); assert.equal(r.json.code, 'limit_scripts');
  r = await A.post('/api/projects', { sections: sections('Producción'), kind: 'prod' });
  assert.equal(r.status, 403); assert.equal(r.json.code, 'need_plan');
  r = await A.post(`/api/p/${pid}/produce`, {});
  assert.equal(r.status, 403); assert.equal(r.json.code, 'need_plan');
  r = await A.get('/api/me');
  assert.equal(r.json.scripts, 5); assert.equal(r.json.own, 0); assert.equal(r.json.limits.scripts, 5); assert.equal(r.json.limits.projects, 0);
  for (const x of extra) await A.del(`/api/p/${x}`);
  // con Indie: guiones sin límite y el guion pasa a ser un proyecto de producción
  S.S.run("UPDATE users SET plan='indie' WHERE email='ana@prueba.pe'");
  r = await A.post(`/api/p/${pid}/produce`, {});
  assert.equal(r.status, 200, r.text); assert.equal(r.json.kind, 'prod');
  r = await A.get(`/api/p/${pid}?full=1`);
  assert.equal(r.json.kind, 'prod'); assert.equal(r.json.sections.hoja, null);
  for (const sec of ['desglose', 'storyboard', 'presupuesto', 'plan']) { r = await A.put(`/api/p/${pid}/s/${sec}`, { json: sections('El faro')[sec], base: 0 }); assert.equal(r.status, 200, sec + ' ' + r.text); }
  // Indie es solo para ti
  r = await A.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'x@prueba.pe', role: 'Dirección', perms: { guion: 'ver' } }] });
  assert.equal(r.status, 403); assert.equal(r.json.code, 'limit_members'); assert.match(r.json.error, /Pro/);
  r = await A.get('/api/projects');
  assert.deepEqual(r.json.map(x => x.title), ['El faro']);
  // el resto de las pruebas trabaja en equipo: Pro
  S.S.run("UPDATE users SET plan='pro' WHERE email='ana@prueba.pe'");
});

test('guardar con versión: conflicto 409 si otra persona guardó antes', async () => {
  const g = JSON.stringify({ meta: { title: 'El faro (v2)' }, paras: [] });
  let r = await A.put(`/api/p/${pid}/s/guion`, { json: g, base: 1, c: 'cA' });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.v, 2);
  r = await A.put(`/api/p/${pid}/s/guion`, { json: g, base: 1, c: 'cA' });
  assert.equal(r.status, 409);
  assert.equal(r.json.v, 2);
  assert.equal(JSON.parse(r.json.json).meta.title, 'El faro (v2)');
  r = await A.get('/api/projects');
  assert.equal(r.json[0].title, 'El faro (v2)', 'el título sigue al guion');
  r = await A.put(`/api/p/${pid}/s/guion`, { json: '{malo', base: 2 });
  assert.equal(r.status, 400);
  r = await A.put(`/api/p/${pid}/s/inventada`, { json: '{}', base: 0 });
  assert.equal(r.status, 404);
  const h = S.S.one('SELECT COUNT(*) n FROM history WHERE pid=?', pid).n;
  assert.equal(h, 1, 'la versión anterior queda en el historial');
});

test('invitar por correo antes de que la persona tenga cuenta', async () => {
  let r = await A.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'Beto@Prueba.pe ', role: 'Vestuario y maquillaje', perms: { guion: 'ver', desglose: 'editar', areas: ['ward'], storyboard: 'ver', presupuesto: 'ver' } }] });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.added, [{ email: 'beto@prueba.pe', name: 'beto@prueba.pe', pending: true }]);
  assert.ok(r.json.state.members.some(m => m.pending && m.email === 'beto@prueba.pe'));
  r = await B.post('/api/auth/google', { credential: S.token('beto@prueba.pe', 'Beto') });
  assert.equal(r.status, 200);
  r = await B.get('/api/projects');
  assert.equal(r.json.length, 1);
  assert.equal(r.json[0].mine, false);
  assert.equal(r.json[0].role, 'Vestuario y maquillaje');
});

test('cada quien lee y guarda solo lo suyo', async () => {
  let r = await B.get(`/api/p/${pid}?full=1`);
  assert.equal(r.status, 200);
  assert.equal(r.json.admin, false);
  assert.deepEqual(r.json.read.sort(), ['desglose', 'guion', 'storyboard'].sort(), 'el presupuesto es solo para cargos de producción');
  assert.equal(r.json.sections.presupuesto, null, 'no se envía');
  assert.equal(r.json.members, undefined);
  r = await B.get(`/api/p/${pid}/s/presupuesto`);
  assert.equal(r.status, 403);
  r = await B.put(`/api/p/${pid}/s/guion`, { json: '{"meta":{"title":"hackeado"},"paras":[]}', base: 2 });
  assert.equal(r.status, 403);
  // en el desglose, solo sus áreas: el cambio al reparto se descarta y el del vestuario queda
  const cur = JSON.parse((await B.get(`/api/p/${pid}/s/desglose`)).json.json);
  cur.elements.e1.name = 'MARIA CAMBIADA';
  cur.elements.e2.name = 'Sombrero de paja';
  r = await B.put(`/api/p/${pid}/s/desglose`, { json: JSON.stringify(cur), base: 1 });
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.json, 'devuelve lo que realmente se guardó');
  const saved = JSON.parse((await A.get(`/api/p/${pid}/s/desglose`)).json.json);
  assert.equal(saved.elements.e1.name, 'MARÍA');
  assert.equal(saved.elements.e2.name, 'Sombrero de paja');
});

test('imágenes: storyboard sí; fotos del desglose con los planes pagados', async () => {
  let r = await A.put(`/api/p/${pid}/f`, { k: 'sh1', url: PNG });
  assert.equal(r.status, 200, r.text);
  r = await B.put(`/api/p/${pid}/f`, { k: 'sh2', url: PNG });
  assert.equal(r.status, 403, 'B solo ve el storyboard');
  // si la cuenta vuelve al plan Guion, sus proyectos de producción quedan en solo lectura
  S.S.run("UPDATE users SET plan='free' WHERE email='ana@prueba.pe'");
  r = await A.put(`/api/p/${pid}/f`, { k: 'bd~e2~f1', url: PNG });
  assert.equal(r.status, 403);
  assert.equal(r.json.code, 'read_only');
  S.S.run("UPDATE users SET plan='pro' WHERE email='ana@prueba.pe'");
  r = await A.put(`/api/p/${pid}/f`, { k: 'bd~e2~f1', url: PNG });
  assert.equal(r.status, 200);
  r = await B.put(`/api/p/${pid}/f`, { k: 'bd~e1~f2', url: PNG });
  assert.equal(r.status, 403, 'foto del reparto: no es su área');
  r = await B.put(`/api/p/${pid}/f`, { k: 'bd~e2~f3', url: PNG });
  assert.equal(r.status, 200, 'foto del vestuario: sí');
  // casting («ca~personaje~…») con el desglose y su área de reparto; scouting («lc~…») con el plan de rodaje
  r = await B.put(`/api/p/${pid}/f`, { k: 'ca~e1~c1~f1', url: PNG });
  assert.equal(r.status, 403, 'casting: el reparto no es su área');
  r = await A.put(`/api/p/${pid}/f`, { k: 'ca~e1~c1~f1', url: PNG });
  assert.equal(r.status, 200, r.text);
  r = await B.put(`/api/p/${pid}/f`, { k: 'lc~l1~f1', url: PNG });
  assert.equal(r.status, 403, 'scouting: no edita el plan');
  assert.match(r.json.error || r.text, /scouting/);
  r = await A.put(`/api/p/${pid}/f`, { k: 'lc~l1~f1', url: PNG });
  assert.equal(r.status, 200, r.text);
  r = await B.get(`/api/p/${pid}/frames`);
  assert.ok('ca~e1~c1~f1' in r.json, 'el casting se lee con el desglose');
  assert.ok(!('lc~l1~f1' in r.json), 'el scouting no: B no lee el plan');
  // punto de encuentro («cl~jornada~…») con la hoja de llamado
  r = await B.put(`/api/p/${pid}/f`, { k: 'cl~d1~f1', url: PNG });
  assert.equal(r.status, 403, 'punto de encuentro: no edita la hoja de llamado');
  assert.match(r.json.error || r.text, /hoja de llamado/);
  r = await A.put(`/api/p/${pid}/f`, { k: 'cl~d1~f1', url: PNG });
  assert.equal(r.status, 200, r.text);
  r = await B.get(`/api/p/${pid}/frames`);
  assert.ok(!('cl~d1~f1' in r.json), 'B no lee la hoja de llamado');
  for (const k of ['ca~e1~c1~f1', 'lc~l1~f1', 'cl~d1~f1']) await A.put(`/api/p/${pid}/f`, { k, url: null });
  r = await A.put(`/api/p/${pid}/f`, { k: '../x', url: PNG });
  assert.equal(r.status, 400);
  r = await A.put(`/api/p/${pid}/f`, { k: 'sh3', url: 'data:text/html;base64,PGgxPg==' });
  assert.equal(r.status, 400);
  // modelos 3D importados («m3~…»): solo en su formato (gzip de «FSM1» + encabezado), y solo con esas claves
  const fsm = (h = { v: 1, kind: 'set', parts: [] }) => { const j = Buffer.from(JSON.stringify(h)), b = Buffer.alloc(8 + j.length); b.write('FSM1', 0, 'latin1'); b.writeUInt32LE(j.length, 4); j.copy(b, 8); return 'data:model/x-fsm;base64,' + require('node:zlib').gzipSync(b).toString('base64'); };
  r = await A.put(`/api/p/${pid}/f`, { k: 'm3~s~e1', url: fsm() });
  assert.equal(r.status, 200, r.text);
  r = await A.put(`/api/p/${pid}/f`, { k: 'm3~s~e2', url: 'data:model/x-fsm;base64,' + Buffer.from('no es un modelo').toString('base64') });
  assert.equal(r.status, 400, 'un modelo que no es gzip');
  r = await A.put(`/api/p/${pid}/f`, { k: 'm3~s~e2', url: fsm({ v: 1 }) });
  assert.equal(r.status, 400, 'sin partes');
  r = await A.put(`/api/p/${pid}/f`, { k: 'm3~s~e2', url: PNG });
  assert.equal(r.status, 400, 'una imagen con clave de modelo');
  r = await A.put(`/api/p/${pid}/f`, { k: 'sh9', url: fsm() });
  assert.equal(r.status, 400, 'un modelo con clave de imagen');
  r = await B.post(`/api/p/${pid}/frames/get`, { keys: ['m3~s~e1'] });
  assert.match(r.json.frames['m3~s~e1'].u, /^data:model\/x-fsm;base64,/, 'se lee con el storyboard');
  r = await A.put(`/api/p/${pid}/f`, { k: 'm3~s~e1', url: null });
  assert.equal(r.status, 200);
  r = await B.get(`/api/p/${pid}/frames`);
  assert.deepEqual(Object.keys(r.json).sort(), ['bd~e2~f1', 'bd~e2~f3', 'sh1']);
  r = await B.post(`/api/p/${pid}/frames/get`, { keys: ['sh1', 'bd~e2~f1'] });
  assert.equal(r.json.frames.sh1.u, PNG);
  r = await A.put(`/api/p/${pid}/f`, { k: 'sh1', url: null });
  assert.equal(r.status, 200);
  r = await B.get(`/api/p/${pid}/frames`);
  assert.equal(r.json.sh1, undefined);
});

test('cambios en vivo y acceso retirado', async () => {
  const L = listen(S.base, B.cookie, pid);
  assert.ok(await L.wait(e => e.t === 'hello'));
  const g = JSON.parse((await A.get(`/api/p/${pid}/s/guion`)).json.json);
  g.meta.author = 'Ana Torres';
  let r = await A.put(`/api/p/${pid}/s/guion`, { json: JSON.stringify(g), base: 2, c: 'cA' });
  assert.equal(r.status, 200);
  const ev = await L.wait(e => e.t === 'sec' && e.sec === 'guion');
  assert.ok(ev, 'llega el aviso');
  assert.equal(ev.v, 3); assert.equal(ev.c, 'cA'); assert.equal(ev.by, 'Ana');
  // el presupuesto no se avisa a quien no lo puede leer
  const bud = (await A.get(`/api/p/${pid}/s/presupuesto`)).json;
  r = await A.put(`/api/p/${pid}/s/presupuesto`, { json: bud.json, base: bud.v });
  assert.equal(r.status, 200);
  await new Promise(r => setTimeout(r, 200));
  assert.ok(!L.events.some(e => e.sec === 'presupuesto'));
  // producción quita a Beto: su conexión se cierra y ya no puede leer
  const st = (await A.get(`/api/p/${pid}`)).json;
  const beto = st.members.find(m => m.email === 'beto@prueba.pe');
  r = await A.put(`/api/p/${pid}/team`, { list: [{ id: beto.id, remove: true }] });
  assert.equal(r.status, 200);
  assert.ok(await L.wait(e => e.t === 'revoked'));
  await L.stop();
  r = await B.get(`/api/p/${pid}?full=1`);
  assert.equal(r.status, 403);
});

test('pedir acceso y personas por proyecto: Indie solo tú, Pro 30', async () => {
  let r = await C.post('/api/auth/google', { credential: S.token('caro@prueba.pe', 'Caro') });
  assert.equal(r.status, 200);
  r = await C.post(`/api/p/${pid}/request`, {});
  assert.equal(r.status, 200);
  let st = (await A.get(`/api/p/${pid}`)).json;
  assert.deepEqual(st.requests.map(x => x.email), ['caro@prueba.pe']);
  r = await A.put(`/api/p/${pid}/team`, { list: ['caro@prueba.pe', 'd@x.pe', 'e@x.pe', 'f@x.pe'].map(email => ({ add: true, email, role: 'Dirección', perms: { guion: 'ver' } })) });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.state.requests.length, 0, 'el pedido atendido desaparece');
  // con Indie (solo tú): no se suma nadie y quien ya estaba queda fuera hasta que vuelva Pro
  S.S.run("UPDATE users SET plan='indie' WHERE email='ana@prueba.pe'");
  r = await A.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'g@x.pe', role: 'Dirección', perms: {} }] });
  assert.equal(r.status, 403);
  assert.equal(r.json.code, 'limit_members');
  r = await C.get(`/api/p/${pid}`);
  assert.equal(r.status, 403); assert.equal(r.json.code, 'plan_suspended');
  S.S.run("UPDATE users SET plan='pro' WHERE email='ana@prueba.pe'");
  st = (await A.get(`/api/p/${pid}`)).json;
  assert.equal(st.members.length, 5, 'no se agregó nada (la operación es todo o nada)');
  // Pro: 30 personas contándote a ti (29 invitadas)
  r = await A.put(`/api/p/${pid}/team`, { list: Array.from({ length: 25 }, (_, i) => ({ add: true, email: `p${i}@x.pe`, role: 'Arte', perms: { guion: 'ver' } })) });
  assert.equal(r.status, 200, r.text);
  r = await A.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'p99@x.pe', role: 'Arte', perms: {} }] });
  assert.equal(r.status, 403); assert.equal(r.json.code, 'limit_members'); assert.match(r.json.error, /30/);
  r = await A.put(`/api/p/${pid}/team`, { list: Array.from({ length: 25 }, (_, i) => ({ id: 'inv:' + `p${i}@x.pe`, remove: true })) });
  assert.equal(r.status, 200);
  r = await A.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'no-es-correo', role: 'X', perms: {} }] });
  assert.equal(r.status, 400);
  // Caro sale del proyecto por su cuenta
  r = await C.post(`/api/p/${pid}/leave`, {});
  assert.equal(r.status, 200);
  r = await C.get('/api/projects');
  assert.equal(r.json.length, 0);
});

test('eliminar el proyecto y cerrar sesión', async () => {
  let r = await B.del(`/api/p/${pid}`);
  assert.equal(r.status, 403);
  r = await A.del(`/api/p/${pid}`);
  assert.equal(r.status, 200);
  r = await A.get(`/api/p/${pid}`);
  assert.equal(r.status, 404);
  r = await A.get('/api/me');
  assert.equal(r.json.own, 0, 'el proyecto eliminado ya no cuenta para el límite');
  r = await A.post('/api/auth/logout', {});
  assert.equal(r.status, 200);
  r = await A.get('/api/me');
  assert.equal(r.status, 401);
});

test('las listas del servidor coinciden con las de la app', async () => {
  const fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'share.js'), 'utf8');
  const P = require('../lib/perm');
  const secs = [...src.match(/const SEC_LIST = (\[.*?\]);/)[1].matchAll(/\['(\w+)', '[^']+', '\w+'\]/g)].map(m => m[1]);
  assert.deepEqual(secs, P.SECS);
  // las reglas (qué necesita cada pestaña, quién ve el presupuesto) son las de src/areas.js, y el servidor usa su copia
  const A = require('../areas.js');
  assert.equal(fs.readFileSync(path.join(__dirname, '..', 'areas.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'areas.js'), 'utf8'), 'server/areas.js está desactualizado: node server/make.js');
  assert.equal(P.SEC_DEPS, A.SEC_DEPS); assert.equal(P.PRODUCER_ROLES, A.PRODUCER_ROLES); assert.equal(P.readSet, A.permReadSet);
  assert.equal(SECS.join(), P.SECS.join());
});
