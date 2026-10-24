'use strict';
/* revisión de seguridad (octubre 2026): cada prueba corresponde a una falla corregida */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// límites chicos para probar (los planes se leen del entorno al cargar el servidor)
process.env.FREE_STORAGE_MB = '1'; process.env.FREE_ARCHIVED = '2'; process.env.FREE_SCRIPTS = '1';
const { start, client, listen } = require('./helpers');
const { bdFilter } = require('../areas.js');

const guion = (title, extra = '') => JSON.stringify({ meta: { title }, paras: [{ t: 'a', x: 'Texto' + extra }] });

let S, A, B, C;
test.before(async () => {
  S = await start();
  fs.writeFileSync(path.join(S.cfg.publicDir, 'admin.html'), '<h1>panel</h1>');
  A = client(S.base); B = client(S.base); C = client(S.base);
  for (const [c, e] of [[A, 'ana@seg.pe'], [B, 'beto@seg.pe'], [C, 'caro@seg.pe']]) assert.equal((await c.post('/api/auth/google', { credential: S.token(e) })).status, 200);
});
test.after(async () => { await S.stop(); });

test('rutas: las páginas con permiso no se sirven escribiendo la dirección de otra forma', async () => {
  const anon = client(S.base);
  for (const p of ['/admin.html', '/%61dmin.html', '/./admin.html', '/app/%69ndex.html', '/app//index.html', '/app/./index.html']) {
    const r = await anon.get(p);
    assert.ok(r.status === 302 || r.status === 404, `${p} → ${r.status}`);
    assert.ok(!/panel|<h1>app/.test(r.text), `${p} no muestra la página`);
  }
  assert.equal((await anon.get('/%E0%A4%A')).status, 404, 'dirección mal escrita: 404, no error del servidor');
  assert.equal((await A.get('/app/%69ndex.html')).status, 200, 'con sesión, la app sí');
  assert.equal((await A.get('/%61dmin.html')).status, 404, 'sin ser administración, el panel no');
});

test('cuota: las secciones cuentan y los archivados tienen tope', async () => {
  // 1 MB de cuota (FREE_STORAGE_MB=1): un guion de 1,2 MB no entra
  let r = await A.post('/api/projects', { sections: { guion: guion('Grande', 'x'.repeat(1.2 * 1048576)) } });
  assert.equal(r.status, 413, r.text);
  r = await A.post('/api/projects', { sections: { guion: guion('Uno') } });
  assert.equal(r.status, 201, r.text);
  const pid = r.json.pid;
  r = await A.put(`/api/p/${pid}/s/guion`, { json: guion('Uno', 'x'.repeat(1.2 * 1048576)), base: 1 });
  assert.equal(r.status, 413, 'guardar algo que crece más allá de la cuota se rechaza');
  r = await A.put(`/api/p/${pid}/s/guion`, { json: guion('Uno (v2)'), base: 1 });
  assert.equal(r.status, 200, 'algo chico sí');
  // plan Guion: 1 guion activo (FREE_SCRIPTS=1) + 2 archivados (FREE_ARCHIVED=2); el cuarto ya no
  let made = 1;
  for (let i = 0; i < 5; i++) {
    const last = (await A.get('/api/projects')).json.find(x => !x.archived);
    if (last) await A.post(`/api/p/${last.id}/archive`, { archived: true });
    r = await A.post('/api/projects', { sections: { guion: guion('P' + i) } });
    if (r.status !== 201) break;
    made++;
  }
  assert.equal(made, 3);
  assert.equal(r.json.code, 'limit_saved');
});

test('equipo: a una cuenta existente le llega una invitación (no queda dentro sin aceptar ni se revela su nombre)', async () => {
  const b = await B.post('/api/projects', { sections: { guion: guion('Película de Beto') } });
  const pid = b.json.pid;
  let r = await B.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'caro@seg.pe', role: 'Dirección', perms: { guion: 'ver' } }] });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.added, [{ email: 'caro@seg.pe', name: 'caro@seg.pe', pending: true }]);
  // Caro la ve como invitación y la puede rechazar
  let list = (await C.get('/api/projects')).json;
  assert.ok(list.some(x => x.id === pid && x.invited), 'aparece como invitación');
  r = await C.post(`/api/p/${pid}/decline`);
  assert.equal(r.status, 200);
  list = (await C.get('/api/projects')).json;
  assert.ok(!list.some(x => x.id === pid), 'rechazada, desaparece');
  assert.equal((await C.get(`/api/p/${pid}`)).status, 403, 'y no tiene acceso');
  // invitada otra vez: abrir el proyecto (el enlace) es aceptar
  await B.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'caro@seg.pe', role: 'Dirección', perms: { guion: 'ver' } }] });
  r = await C.get(`/api/p/${pid}`);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.me.role, 'Dirección');
  // quien pidió entrar sí se agrega directo
  const a = await A.post('/api/projects', { sections: { guion: guion('Otra') } });
  if (a.status === 201) {
    await C.post(`/api/p/${a.json.pid}/request`);
    r = await A.put(`/api/p/${a.json.pid}/team`, { list: [{ add: true, email: 'caro@seg.pe', role: 'Arte', perms: { guion: 'ver' } }] });
    assert.equal(r.json.added[0].pending, false);
  }
});

test('salir: las conexiones en vivo de esa sesión se cierran', async () => {
  const D = client(S.base);
  await D.post('/api/auth/google', { credential: S.token('beto@seg.pe') });
  const pid = (await D.get('/api/projects')).json.find(x => x.mine).id;
  const ev = listen(S.base, D.cookie, pid);
  await new Promise(r => setTimeout(r, 300));
  await D.post('/api/auth/logout');
  await new Promise(r => setTimeout(r, 300));
  assert.ok(ev.events.some(e => e.t === 'revoked'), JSON.stringify(ev.events));
  ev.stop();
});

test('Mercado Pago: sin clave de avisos no se acepta ningún aviso', async () => {
  const r = await fetch(S.base + '/api/billing/webhook?data.id=123&type=preapproval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 401);
});

test('desglose por áreas: un jefe de área no borra marcas de otra área', () => {
  const base = { elements: { c1: { id: 'c1', cat: 'cast', name: 'ANA' }, p1: { id: 'p1', cat: 'props', name: 'Taza' } }, tags: [{ id: 't1', el: 'c1' }, { id: 't2', el: 'p1' }], scenes: {} };
  const atk = { elements: { c1: { id: 'c1', cat: 'props', name: 'ANA' }, p1: base.elements.p1 }, tags: [{ id: 't2', el: 'p1' }], scenes: {} };
  const out = bdFilter(base, atk, ['props']);
  assert.equal(out.elements.c1.cat, 'cast');
  assert.deepEqual(out.tags.map(t => t.id).sort(), ['t1', 't2']);
  // lo suyo sí puede borrarlo
  const own = bdFilter(base, { ...base, tags: [{ id: 't1', el: 'c1' }] }, ['props']);
  assert.deepEqual(own.tags.map(t => t.id), ['t1']);
});

test('libro de reclamaciones: el campo trampa no guarda ni envía nada', async () => {
  const before = S.S.one('SELECT COUNT(*) n FROM reclamos').n;
  const r = await A.post('/api/reclamos', { web: 'http://spam', nombre: 'x', doc_num: '1', domicilio: 'x', descripcion: 'x', detalle: 'x', pedido: 'x', email: 'a@b.pe' });
  assert.equal(r.status, 201);
  assert.equal(S.S.one('SELECT COUNT(*) n FROM reclamos').n, before);
});

/* pruebas extremas (copia del proyecto, octubre 2026): lo que falló y quedó corregido */
test('extremas: JSON con miles de niveles, áreas heredadas del prototipo e imágenes falsas o gigantes', async () => {
  const D = client(S.base); assert.equal((await D.post('/api/auth/google', { credential: S.token('duena@seg.pe') })).status, 200);
  S.S.run("UPDATE users SET plan='pro' WHERE email='duena@seg.pe'");
  const deep = '['.repeat(5000) + ']'.repeat(5000);
  let r = await D.post('/api/projects', { sections: { guion: guion('Hondo'), desglose: `{"elements":{"e1":{"cat":"cast","name":"A","bomba":${deep}}}}` } });
  assert.equal(r.status, 400); assert.equal(r.json.code, 'bad_section'); assert.match(r.json.error, /niveles/);
  r = await D.post('/api/projects', { sections: { guion: guion('Normal'), desglose: JSON.stringify({ elements: { e1: { cat: 'cast', name: 'Ana' } } }) } });
  assert.equal(r.status, 201, r.text);
  const pid = r.json.pid;
  r = await D.put(`/api/p/${pid}/s/guion`, { json: JSON.stringify({ meta: { title: 'x' }, paras: JSON.parse('['.repeat(70) + ']'.repeat(70)) }), base: 1 });
  assert.equal(r.json.code, 'bad_section', 'también al guardar');
  // un texto con muchos corchetes no cuenta como niveles
  r = await D.put(`/api/p/${pid}/s/guion`, { json: guion('Corchetes', '[[[[{{{{'.repeat(200)), base: 1 });
  assert.equal(r.status, 200, r.text);
  // áreas: solo las de la hoja
  r = await D.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'area@seg.pe', role: 'Arte', perms: { guion: 'ver', desglose: 'editar', areas: ['cast', '__proto__', 'constructor', 'toString', 'hasOwnProperty'] } }] });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(JSON.parse(S.S.one('SELECT perms FROM invites WHERE pid=?', pid).perms).areas, ['cast']);
  assert.equal(({}).polluted, undefined);
  // imágenes: que sean lo que dicen y de un tamaño razonable
  const png = (w, h) => { const b = Buffer.alloc(33); Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').copy(b); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return 'data:image/png;base64,' + b.toString('base64'); };
  r = await D.put(`/api/p/${pid}/f`, { k: 'sh1', url: 'data:image/png;base64,' + Buffer.from('no soy una imagen, solo texto').toString('base64') });
  assert.equal(r.json.code, 'bad_image', 'basura con nombre de PNG');
  r = await D.put(`/api/p/${pid}/f`, { k: 'sh1', url: 'data:image/jpeg;base64,' + Buffer.from(png(10, 10).split(',')[1], 'base64').toString('base64') });
  assert.equal(r.json.code, 'bad_image', 'un PNG que dice ser JPEG');
  r = await D.put(`/api/p/${pid}/f`, { k: 'sh1', url: png(30000, 30000) }); assert.equal(r.json.code, 'bad_image'); assert.match(r.json.error, /megapíxeles/);
  r = await D.put(`/api/p/${pid}/f`, { k: 'sh1', url: png(9000, 9000) }); assert.equal(r.json.code, 'bad_image', '81 MP');
  r = await D.put(`/api/p/${pid}/f`, { k: 'sh1', url: png(1920, 1080) }); assert.equal(r.status, 200, r.text);
  // JPEG con EXIF antes del tamaño, y WebP
  const jpg = Buffer.from('ffd8ffe100104578696600004d4d002a00000008ffc0001108043805a003012200021101031101ffd9', 'hex');
  r = await D.put(`/api/p/${pid}/f`, { k: 'sh2', url: 'data:image/jpeg;base64,' + jpg.toString('base64') }); assert.equal(r.status, 200, r.text);
  const webp = Buffer.alloc(30); webp.write('RIFF', 0, 'latin1'); webp.writeUInt32LE(22, 4); webp.write('WEBPVP8X', 8, 'latin1'); webp.writeUIntLE(1279, 24, 3); webp.writeUIntLE(719, 27, 3);
  r = await D.put(`/api/p/${pid}/f`, { k: 'sh3', url: 'data:image/webp;base64,' + webp.toString('base64') }); assert.equal(r.status, 200, r.text);
});
