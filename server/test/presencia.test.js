'use strict';
/* presencia: quién tiene abierto el proyecto y en qué pestaña (canal en vivo, lib/live.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { makeLive } = require('../lib/live');
const { start, client } = require('./helpers');

// una conexión de mentira: guarda lo que el servidor le escribe
function fake() {
  const req = new EventEmitter(), res = new EventEmitter();
  res.out = [];
  res.writeHead = () => { };
  res.write = s => { const m = /^data: (.*)\n\n$/s.exec(s); if (m) res.out.push(JSON.parse(m[1])); return true; };
  res.end = () => { };
  return { req, res };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const lastWho = res => [...res.out].reverse().find(m => m.t === 'who');

test('al entrar, el saludo trae quién está; los demás reciben la lista con la pestaña de cada uno', async () => {
  const live = makeLive();
  const a = fake(), b = fake();
  live.open(a.req, a.res, 'p1', { uid: 'u1', client: 'ca', name: 'Ana', pic: '', tab: 'plan', read: new Set() }, { t: 'hello', vers: {} });
  assert.equal(a.res.out[0].t, 'hello');
  assert.deepEqual(a.res.out[0].who.map(w => [w.name, w.tab]), [['Ana', 'plan']]);
  live.open(b.req, b.res, 'p1', { uid: 'u2', client: 'cb', name: 'Beto', pic: '', tab: 'lined', read: new Set() }, { t: 'hello', vers: {} });
  await wait(320);
  const w = lastWho(a.res);
  assert.ok(w, 'Ana se entera de que entró Beto');
  assert.deepEqual(w.list.map(x => [x.name, x.tab]).sort(), [['Ana', 'plan'], ['Beto', 'lined']]);
});

test('cambiar de pestaña avisa a todos (solo con una pestaña válida y de la misma persona)', async () => {
  const live = makeLive();
  const a = fake(), b = fake();
  live.open(a.req, a.res, 'p2', { uid: 'u1', client: 'ca', name: 'Ana', tab: 'plan', read: new Set() }, { t: 'hello' });
  live.open(b.req, b.res, 'p2', { uid: 'u2', client: 'cb', name: 'Beto', tab: 'call', read: new Set() }, { t: 'hello' });
  await wait(320);
  assert.equal(live.here('p2', 'u2', 'cb', 'budget'), true);
  assert.equal(live.here('p2', 'u1', 'cb', 'cal'), false, 'otra persona no puede mover la ventana de Beto');
  assert.equal(live.here('p2', 'u2', 'cb', '<img>'), false, 'una pestaña que no es una pestaña no entra');
  await wait(320);
  assert.equal(lastWho(a.res).list.find(x => x.name === 'Beto').tab, 'budget');
});

test('en segundo plano: «away» se avisa y vuelve al estar a la vista', async () => {
  const live = makeLive();
  const a = fake(), b = fake();
  live.open(a.req, a.res, 'p4', { uid: 'u1', client: 'ca', name: 'Ana', tab: 'plan', read: new Set() }, { t: 'hello' });
  live.open(b.req, b.res, 'p4', { uid: 'u2', client: 'cb', name: 'Beto', tab: 'call', read: new Set() }, { t: 'hello' });
  await wait(320);
  assert.equal(live.here('p4', 'u2', 'cb', 'call', true), true, 'misma pestaña, ahora en segundo plano');
  await wait(320);
  assert.equal(lastWho(a.res).list.find(x => x.name === 'Beto').away, 1);
  assert.equal(live.here('p4', 'u2', 'cb', 'call', false), true);
  await wait(320);
  assert.equal(lastWho(a.res).list.find(x => x.name === 'Beto').away, undefined);
  assert.equal(live.here('p4', 'u2', 'cb', 'call', false), false, 'sin cambios no se avisa');
});

test('al cerrar la conexión, sale de la lista', async () => {
  const live = makeLive();
  const a = fake(), b = fake();
  live.open(a.req, a.res, 'p3', { uid: 'u1', client: 'ca', name: 'Ana', tab: 'plan', read: new Set() }, { t: 'hello' });
  live.open(b.req, b.res, 'p3', { uid: 'u2', client: 'cb', name: 'Beto', tab: 'call', read: new Set() }, { t: 'hello' });
  await wait(320);
  b.req.emit('close');
  await wait(320);
  assert.deepEqual(lastWho(a.res).list.map(x => x.name), ['Ana']);
  assert.deepEqual(live.who('p3').map(x => x.name), ['Ana']);
});

/* escucha los eventos en vivo como lo hace el navegador: con su id de ventana y su pestaña */
function sse(base, cookie, pid, c, tab) {
  const ev = [], ac = new AbortController();
  const done = (async () => {
    try {
      const r = await fetch(`${base}/api/p/${pid}/events?c=${c}&tab=${tab}`, { headers: { Cookie: cookie }, signal: ac.signal });
      const rd = r.body.getReader(); let buf = '';
      for (; ;) {
        const { value, done } = await rd.read(); if (done) break;
        buf += Buffer.from(value).toString('utf8'); let i;
        while ((i = buf.indexOf('\n\n')) >= 0) { const d = buf.slice(0, i).split('\n').filter(l => l.startsWith('data: ')).map(l => l.slice(6)).join('\n'); buf = buf.slice(i + 2); if (d) ev.push(JSON.parse(d)); }
      }
    } catch (e) { }
  })();
  const until = async (pred, ms = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const e = [...ev].reverse().find(pred); if (e) return e; await wait(20); } return null; };
  return { ev, until, stop: () => { ac.abort(); return done; } };
}

test('en vivo: cada uno ve quién más está y en qué pestaña; quien no es del equipo no puede avisar', async () => {
  const S = await start();
  try {
    const A = client(S.base), B = client(S.base), C = client(S.base);
    await A.post('/api/auth/google', { credential: S.token('ana@prueba.pe', 'Ana') });
    await B.post('/api/auth/google', { credential: S.token('beto@prueba.pe', 'Beto') });
    await C.post('/api/auth/google', { credential: S.token('ciro@prueba.pe', 'Ciro') });
    let r = await A.post('/api/projects', { sections: { guion: JSON.stringify({ meta: { title: 'Faro' }, paras: [{ t: 'scene', x: 'INT. CASA - DÍA' }] }) }, c: 'cA' });
    assert.equal(r.status, 201, r.text);
    const pid = r.json.pid;
    r = await A.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'beto@prueba.pe', role: 'Guion', perms: { guion: 'editar' } }] });
    assert.equal(r.status, 200, r.text);
    assert.equal((await B.get(`/api/p/${pid}`)).status, 200);
    const LA = sse(S.base, A.cookie, pid, 'cA', 'script');
    const hello = await LA.until(e => e.t === 'hello');
    assert.deepEqual(hello.who.map(w => [w.name, w.tab]), [['Ana', 'script']]);
    const LB = sse(S.base, B.cookie, pid, 'cB', 'lined');
    let w = await LA.until(e => e.t === 'who' && e.list.some(x => x.name === 'Beto'));
    assert.ok(w, 'Ana ve que entró Beto');
    assert.equal(w.list.find(x => x.name === 'Beto').tab, 'lined');
    r = await B.post(`/api/p/${pid}/here`, { c: 'cB', tab: 'build' });
    assert.equal(r.status, 200, r.text);
    w = await LA.until(e => e.t === 'who' && e.list.some(x => x.name === 'Beto' && x.tab === 'build'));
    assert.ok(w, 'Ana ve que Beto pasó a Construcción');
    r = await C.post(`/api/p/${pid}/here`, { c: 'cC', tab: 'script' });
    assert.equal(r.status, 403, 'sin acceso al proyecto no se puede avisar nada');
    await LB.stop();
    w = await LA.until(e => e.t === 'who' && !e.list.some(x => x.name === 'Beto'));
    assert.ok(w, 'al cerrar, Beto sale de la lista');
    await LA.stop();
  } finally { await S.stop(); }
});
