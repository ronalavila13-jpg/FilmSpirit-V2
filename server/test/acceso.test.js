'use strict';
/* lote AD · acceso: la etapa Guion (Historia y Guion) la ven el cargo «Guion», producción y quien administra. A los demás
   no se les envía el material de Historia (build) ni las notas de esa pestaña, y lo que guardan no la borra ni la pisa.
   Y el ejemplo sin cuenta: la página de la app se abre sin sesión con ?ejemplo=1; todo lo demás sigue pidiendo sesión */
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, client, listen } = require('./helpers');

let S, A, G, B, J, pid;
const BUILD = { arg: { logline: 'Una proyeccionista salva su cine', storyline: '', sinopsis: 'Ana quiere una última función.', argumento: '' }, cards: { k1: { id: 'k1', h: 'Tarjeta secreta', syn: 'Lo que pasa después' } }, acts: ['I', 'II', 'III'] };
const GUION = { meta: { title: 'La función', author: 'Ana' }, paras: [{ t: 'h', x: 'INT. CINE - NOCHE' }, { t: 'a', x: 'Ana enciende el proyector.' }], build: BUILD };
const sections = () => ({
  guion: JSON.stringify(GUION),
  desglose: JSON.stringify({ elements: {}, tags: [], scenes: {} }),
  presupuesto: JSON.stringify({ budget: { lines: [{ id: 'l1', name: 'Cámara', amount: 1000 }] } }),
});
const ON_HIST = { t: 'tab', id: 'build', sec: 'guion', label: 'Pestaña Historia', tab: 'build' };
const ON_LINED = { t: 'scene', id: '1', sec: 'guion', label: 'Escena 1', tab: 'lined' };
const note = (id, on, text) => ({ id, by: 'x', name: '?', ts: Date.now(), on, text });
const guionOf = async c => { const r = await c.get(`/api/p/${pid}/s/guion`); assert.equal(r.status, 200, r.text); return { v: r.json.v, val: JSON.parse(r.json.json) }; };

test.before(async () => {
  S = await start();
  A = client(S.base); G = client(S.base); B = client(S.base); J = client(S.base);
  for (const [c, e, n] of [[A, 'ana@acc.pe', 'Ana'], [G, 'gabi@acc.pe', 'Gabi'], [B, 'beto@acc.pe', 'Beto'], [J, 'jefa@acc.pe', 'Jefa']]) {
    const r = await c.post('/api/auth/google', { credential: S.token(e, n) });
    assert.equal(r.status, 200, r.text);
  }
  S.S.run("UPDATE users SET plan='pro' WHERE email='ana@acc.pe'");   // proyecto de producción con equipo
  let r = await A.post('/api/projects', { sections: sections(), kind: 'prod', c: 'cA' });
  assert.equal(r.status, 201, r.text);
  pid = r.json.pid;
  // Gabi escribe (cargo Guion), Beto dirige (puede editar los datos del proyecto, que viajan con el guion) y Jefa es
  // jefatura de producción (cargo de producción)
  r = await A.put(`/api/p/${pid}/team`, { list: [
    { add: true, email: 'gabi@acc.pe', role: 'Guion', perms: { guion: 'editar', desglose: 'ver' } },
    { add: true, email: 'beto@acc.pe', role: 'Dirección', perms: { guion: 'editar', desglose: 'editar' } },
    { add: true, email: 'jefa@acc.pe', role: 'Jefatura de producción', perms: { guion: 'ver', presupuesto: 'editar', plan: 'editar' } },
  ] });
  assert.equal(r.status, 200, r.text);
  for (const c of [G, B, J]) assert.equal((await c.get(`/api/p/${pid}`)).status, 200);   // aceptan la invitación
});
test.after(async () => { await S.stop(); });

test('el ejemplo sin cuenta: la app se abre con ?ejemplo=1; lo demás sigue pidiendo sesión', async () => {
  const anon = client(S.base);
  let r = await anon.get('/app/?ejemplo=1');
  assert.equal(r.status, 200, 'la página de la app, sin sesión');
  assert.match(r.text, /app/);
  r = await anon.get('/app?ejemplo=1');
  assert.equal(r.status, 302); assert.equal(r.headers.get('location'), '/app/?ejemplo=1');
  for (const p of ['/app/', '/app/?ejemplo=0', '/app/?ejemplo', '/app/index.html']) {
    r = await anon.get(p);
    assert.equal(r.status, 302, p); assert.match(r.headers.get('location'), /^\/entrar\?next=/, p);
  }
  // nada que lea o guarde datos funciona sin sesión
  for (const [m, p, b] of [['GET', '/api/me'], ['GET', '/api/projects'], ['POST', '/api/projects', { sections: sections() }], ['GET', `/api/p/${pid}?full=1`], ['GET', `/api/p/${pid}/s/guion`], ['PUT', `/api/p/${pid}/s/guion`, { json: '{}', base: 1 }], ['GET', '/api/billing']]) {
    r = await anon.req(m, p, b);
    assert.equal(r.status, 401, m + ' ' + p);
  }
  // con sesión, ?ejemplo=1 también abre la app (la app abre el ejemplo)
  r = await A.get('/app/?ejemplo=1');
  assert.equal(r.status, 200);
});

test('Historia y Guion: solo el cargo Guion, producción y quien administra reciben la Historia', async () => {
  for (const [c, see, who] of [[A, true, 'quien administra'], [G, true, 'cargo Guion'], [J, true, 'jefatura de producción'], [B, false, 'dirección']]) {
    const st = (await c.get(`/api/p/${pid}?full=1`)).json;
    const g = JSON.parse(st.sections.guion.json);
    assert.equal(g.meta.title, 'La función', who);
    assert.equal(g.paras.length, 2, who + ': el texto del guion llega a todos (se lee en el Guion rayado)');
    assert.equal('build' in g, see, who + (see ? ' recibe' : ' no recibe') + ' la Historia');
    const one = await guionOf(c);
    assert.equal('build' in one.val, see, who + ' (sección sola)');
  }
  // lo que el navegador ya tiene: el largo es el de lo que recibe (sin la Historia)
  const v = (await B.get(`/api/p/${pid}`)).json.vers.guion;
  const mine = (await B.get(`/api/p/${pid}/s/guion`)).json.json;
  const st = (await B.get(`/api/p/${pid}?full=1&have=guion.${v}`)).json;
  assert.equal(st.sections.guion.same, 1);
  assert.equal(st.sections.guion.n, Buffer.byteLength(mine), 'el largo coincide con su copia (sin Historia)');
  const stA = (await A.get(`/api/p/${pid}?full=1&have=guion.${v}`)).json;
  assert.ok(stA.sections.guion.n > st.sections.guion.n, 'quien ve la Historia, con su largo completo');
});

test('lo que guarda quien no ve la Historia no la borra ni la pisa', async () => {
  // Beto cambia los datos del proyecto (sin Historia en lo que manda)
  let { v, val } = await guionOf(B);
  val.meta.title = 'La última función';
  let r = await B.put(`/api/p/${pid}/s/guion`, { json: JSON.stringify(val), base: v, c: 'cB' });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.json, undefined, 'se guardó tal cual lo que mandó (lo de Historia no es asunto suyo)');
  let full = (await guionOf(A)).val;
  assert.equal(full.meta.title, 'La última función');
  assert.deepEqual(full.build, BUILD, 'la Historia sigue intacta');
  // si manda una Historia, no cuenta
  ({ v, val } = await guionOf(B));
  val.build = { arg: { logline: 'pisada' } };
  r = await B.put(`/api/p/${pid}/s/guion`, { json: JSON.stringify(val), base: v, c: 'cB' });
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.json, 'devuelve lo que de verdad se guardó');
  assert.equal('build' in JSON.parse(r.json.json), false, 'y sin la Historia');
  full = (await guionOf(A)).val;
  assert.deepEqual(full.build, BUILD);
  // conflicto: la versión vigente le llega sin la Historia
  r = await B.put(`/api/p/${pid}/s/guion`, { json: JSON.stringify(val), base: 1, c: 'cB' });
  assert.equal(r.status, 409);
  assert.equal('build' in JSON.parse(r.json.json), false);
  // quien sí la ve la cambia normalmente
  ({ v, val } = await guionOf(G));
  val.build.arg.logline = 'Una proyeccionista se despide de su cine';
  r = await G.put(`/api/p/${pid}/s/guion`, { json: JSON.stringify(val), base: v, c: 'cG' });
  assert.equal(r.status, 200, r.text);
  assert.equal((await guionOf(A)).val.build.arg.logline, 'Una proyeccionista se despide de su cine');
  // y borrarla (quien la ve) sí la borra
  ({ v, val } = await guionOf(A));
  const keep = val.build; delete val.build;
  r = await A.put(`/api/p/${pid}/s/guion`, { json: JSON.stringify(val), base: v, c: 'cA' });
  assert.equal(r.status, 200, r.text);
  assert.equal('build' in (await guionOf(G)).val, false);
  ({ v, val } = await guionOf(A)); val.build = keep;
  r = await A.put(`/api/p/${pid}/s/guion`, { json: JSON.stringify(val), base: v, c: 'cA' });
  assert.equal(r.status, 200, r.text);
});

test('las notas de la pestaña Historia: solo para quien la ve (también sus avisos y la actividad)', async () => {
  const LB = listen(S.base, B.cookie, pid), LG = listen(S.base, G.cookie, pid);
  await LB.wait(e => e.t === 'hello'); await LG.wait(e => e.t === 'hello');
  let r = await A.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: { h1: note('h1', ON_HIST, 'El final del segundo acto no convence') } }), base: 0, c: 'cA', what: 'dejó una nota en Pestaña Historia', ref: 'guion|tab|build' });
  assert.equal(r.status, 200, r.text);
  assert.ok(await LG.wait(e => e.t === 'sec' && e.sec === 'notas' && e.ref === 'guion|tab|build'), 'Gabi recibe el aviso');
  r = await A.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: { ...JSON.parse((await A.get(`/api/p/${pid}/s/notas`)).json.json).notes, l1: note('l1', ON_LINED, 'Esta escena es larga') } }), base: 1, c: 'cA', what: 'dejó una nota en Escena 1', ref: 'guion|scene|1' });
  assert.equal(r.status, 200, r.text);
  assert.ok(await LB.wait(e => e.t === 'sec' && e.sec === 'notas' && e.ref === 'guion|scene|1'), 'Beto recibe el aviso de la nota del guion rayado');
  assert.equal(LB.events.some(e => e.t === 'sec' && e.ref === 'guion|tab|build'), false, 'pero no el de la nota de Historia');
  await LB.stop(); await LG.stop();
  // lo que ve cada uno
  const seen = async c => Object.keys(JSON.parse((await c.get(`/api/p/${pid}/s/notas`)).json.json).notes).sort();
  assert.deepEqual(await seen(G), ['h1', 'l1']);
  assert.deepEqual(await seen(B), ['l1']);
  assert.deepEqual(Object.keys(JSON.parse((await B.get(`/api/p/${pid}?full=1`)).json.sections.notas.json).notes), ['l1']);
  // Beto responde y agrega una nota suya en Historia (no la ve: no se guarda); la de Ana sigue
  const cur = await B.get(`/api/p/${pid}/s/notas`);
  const mine = JSON.parse(cur.json.json).notes;
  mine.r1 = { id: 'r1', on: ON_LINED, text: 'Se puede partir en dos', re: 'l1', ts: Date.now() };
  mine.h2 = note('h2', ON_HIST, 'Nota colada');
  r = await B.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: mine }), base: cur.json.v, c: 'cB' });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(await seen(A), ['h1', 'l1', 'r1'], 'la nota de Historia de Ana sigue; la colada no entra');
  // la actividad
  const act = async c => (await c.get(`/api/p/${pid}/activity`)).json.items.map(x => x.ref);
  assert.ok((await act(G)).includes('guion|tab|build'));
  assert.ok(!(await act(B)).includes('guion|tab|build'), 'Beto no ve en la actividad la nota de Historia');
  assert.ok((await act(B)).includes('guion|scene|1'));
});

test('el presupuesto sigue siendo solo de producción', async () => {
  const st = (await B.get(`/api/p/${pid}?full=1`)).json;
  assert.equal(st.read.includes('presupuesto'), false);
  assert.equal(st.sections.presupuesto, null);
  assert.equal((await B.get(`/api/p/${pid}/s/presupuesto`)).status, 403);
  assert.ok((await J.get(`/api/p/${pid}?full=1`)).json.read.includes('presupuesto'), 'jefatura de producción sí');
});

test('al cambiar de cargo cambia lo que recibe; en un guion (coescritura) todos reciben la Historia', async () => {
  const st = (await A.get(`/api/p/${pid}`)).json, beto = st.members.find(m => m.email === 'beto@acc.pe');
  let r = await A.put(`/api/p/${pid}/team`, { list: [{ id: beto.id, role: 'Guion' }] });
  assert.equal(r.status, 200, r.text);
  assert.equal('build' in (await guionOf(B)).val, true, 'ahora escribe: recibe la Historia');
  r = await A.put(`/api/p/${pid}/team`, { list: [{ id: beto.id, role: 'Dirección' }] });
  assert.equal('build' in (await guionOf(B)).val, false);
  // un guion del plan gratis, coescrito con alguien de otro cargo
  const F = client(S.base), C = client(S.base);
  await F.post('/api/auth/google', { credential: S.token('fer@acc.pe', 'Fer') });
  await C.post('/api/auth/google', { credential: S.token('coco@acc.pe', 'Coco') });
  r = await F.post('/api/projects', { sections: { guion: JSON.stringify(GUION) } });
  assert.equal(r.status, 201, r.text); assert.equal(r.json.kind, 'guion');
  const gp = r.json.pid;
  r = await F.put(`/api/p/${gp}/team`, { list: [{ add: true, email: 'coco@acc.pe', role: 'Dirección', perms: { guion: 'editar' } }] });
  assert.equal(r.status, 200, r.text);
  const g = JSON.parse((await C.get(`/api/p/${gp}/s/guion`)).json.json);
  assert.deepEqual(g.build, BUILD, 'en un guion se coescribe todo, también la Historia');
});
