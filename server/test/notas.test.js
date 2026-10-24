'use strict';
/* notas y comentarios del equipo, y actividad (quién cambió qué y cuántos cambios lleva cada persona) */
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, client, listen } = require('./helpers');

let S, A, B, pid;
const sections = () => ({
  guion: JSON.stringify({ meta: { title: 'Notas' }, paras: [] }),
  storyboard: JSON.stringify({ shots: { s1: { id: 's1', sc: 'k1', ord: 1 } }, plans: {}, locPlans: {}, aspect: '16:9', looks: {} }),
  presupuesto: JSON.stringify({ budget: { lines: [{ id: 'l1', name: 'Cámara', amount: 1000 }] } }),
});
const note = (id, by, on, text, more) => ({ id, by, name: '?', ts: Date.now(), on, text, ...(more || {}) });
const ON_SHOT = { t: 'shot', id: 's1', sec: 'storyboard', label: 'Plano 1.1', tab: 'board' };
const ON_LINE = { t: 'line', id: 'l1', sec: 'presupuesto', label: 'Cámara', tab: 'budget' };
const getNotes = async (C) => { const r = (await C.get(`/api/p/${pid}/s/notas`)).json; return { v: r.v, notes: r.json ? JSON.parse(r.json).notes : {} }; };

test.before(async () => {
  S = await start(); A = client(S.base); B = client(S.base);
  await A.post('/api/auth/google', { credential: S.token('ana@prueba.pe', 'Ana') });
  S.S.run("UPDATE users SET plan='pro' WHERE email='ana@prueba.pe'");   // proyecto de producción con equipo
  let r = await A.post('/api/projects', { sections: sections(), c: 'cA' });
  pid = r.json.pid;
  // Beto: ve el storyboard (sin editarlo); no ve el presupuesto
  r = await A.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'beto@prueba.pe', role: 'Arte', perms: { guion: 'ver', storyboard: 'ver' } }] });
  assert.equal(r.status, 200, r.text);
  await B.post('/api/auth/google', { credential: S.token('beto@prueba.pe', 'Beto') });
});
test.after(async () => { await S.stop(); });

test('todo el equipo puede dejar notas, incluso con solo lectura; cada quien ve las de lo que puede ver', async () => {
  // Ana deja una nota en el plano y otra en el presupuesto
  let r = await A.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: { n1: note('n1', 'x', ON_SHOT, '¿Dolly?'), n2: note('n2', 'x', ON_LINE, 'Pedir otra cotización') } }), base: 0, c: 'cA', what: 'dejó una nota en el plano 1.1', ref: 'storyboard|shot|s1' });
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.json, 'el autor lo pone el servidor: devuelve lo guardado');
  let A1 = await getNotes(A);
  assert.equal(A1.notes.n1.by, (await A.get('/api/me')).json.id, 'la nota es de quien la escribió');
  assert.equal(A1.notes.n1.name, 'Ana');
  // Beto solo ve la del plano
  const st = (await B.get(`/api/p/${pid}?full=1`)).json;
  assert.equal(st.read.includes('notas'), false, 'las notas no son una pestaña con permiso');
  const bn = JSON.parse(st.sections.notas.json).notes;
  assert.deepEqual(Object.keys(bn), ['n1']);
  // Beto (solo lectura en el storyboard) responde
  const B1 = await getNotes(B);
  B1.notes.r1 = note('r1', 'x', ON_SHOT, 'Sí, con el de 3 m', { re: 'n1' });
  r = await B.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: B1.notes }), base: B1.v, what: 'respondió en el plano 1.1', ref: 'storyboard|shot|s1' });
  assert.equal(r.status, 200, r.text);
  A1 = await getNotes(A);
  assert.equal(A1.notes.r1.name, 'Beto');
  assert.ok(A1.notes.n2, 'la nota del presupuesto, que Beto no ve, sigue ahí');
});

test('cada quien cambia y borra solo lo suyo (también producción); cualquiera resuelve', async () => {
  const B1 = await getNotes(B);
  B1.notes.n1.text = 'Texto cambiado por Beto';      // no es suya: no cambia
  B1.notes.n1.done = true;                           // resolver: sí
  delete B1.notes.r1;                                // la suya: se borra
  B1.notes.n9 = note('n9', 'x', ON_LINE, 'Nota en lo que no veo');    // en una pestaña que no ve: no entra
  let r = await B.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: B1.notes }), base: B1.v });
  assert.equal(r.status, 200, r.text);
  let A1 = await getNotes(A);
  assert.equal(A1.notes.n1.text, '¿Dolly?');
  assert.equal(A1.notes.n1.done, true);
  assert.equal(A1.notes.n1.doneBy, 'Beto');
  assert.equal(A1.notes.r1, undefined);
  assert.equal(A1.notes.n9, undefined);
  // Beto no puede borrar la de Ana
  const B2 = await getNotes(B);
  delete B2.notes.n1;
  r = await B.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: B2.notes }), base: B2.v });
  assert.equal(r.status, 200);
  assert.ok((await getNotes(A)).notes.n1, 'sigue');
  // Beto escribe otra, clavada donde la soltó; producción (Ana) no puede borrarla: solo su autor
  const B3 = await getNotes(B);
  B3.notes.n3 = note('n3', 'x', { ...ON_SHOT, fx: .25, fy: 1.7, py: 'x' }, 'Nota de Beto');
  r = await B.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: B3.notes }), base: B3.v });
  A1 = await getNotes(A);
  assert.ok(A1.notes.n3);
  assert.equal(A1.notes.n3.on.fx, .25, 'el lugar donde se soltó');
  assert.equal(A1.notes.n3.on.fy, 1, 'dentro de lo anotado');
  assert.equal(A1.notes.n3.on.py, undefined, 'solo números');
  delete A1.notes.n3;
  r = await A.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: A1.notes }), base: A1.v });
  assert.equal(r.status, 200);
  assert.ok((await getNotes(A)).notes.n3, 'producción no borra las notas de otros');
  const B4 = await getNotes(B);
  delete B4.notes.n3;
  r = await B.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: B4.notes }), base: B4.v });
  assert.equal((await getNotes(A)).notes.n3, undefined, 'su autor sí');
});

test('actividad: quién cambió qué, avisos en vivo y cambios por persona', async () => {
  const L = listen(S.base, B.cookie, pid);
  assert.ok(await L.wait(e => e.t === 'hello' && e.vers && e.vers.notas > 0), 'el saludo trae la versión de las notas');
  const sb = (await A.get(`/api/p/${pid}/s/storyboard`)).json;
  const d = JSON.parse(sb.json); d.shots.s1.size = 'PG';
  let r = await A.put(`/api/p/${pid}/s/storyboard`, { json: JSON.stringify(d), base: sb.v, c: 'cA', what: 'cambió el plano 1.1', ref: 'storyboard|shot|s1' });
  assert.equal(r.status, 200, r.text);
  const ev = await L.wait(e => e.t === 'sec' && e.sec === 'storyboard');
  assert.equal(ev.what, 'cambió el plano 1.1');
  assert.equal(ev.ref, 'storyboard|shot|s1');
  assert.equal(ev.by, 'Ana');
  // seguir cambiando lo mismo enseguida no suma otro cambio
  d.shots.s1.size = 'PM';
  r = await A.put(`/api/p/${pid}/s/storyboard`, { json: JSON.stringify(d), base: r.json.v, what: 'cambió el plano 1.1', ref: 'storyboard|shot|s1' });
  // el presupuesto: Beto no recibe el aviso ni lo ve en la actividad
  const bud = (await A.get(`/api/p/${pid}/s/presupuesto`)).json;
  r = await A.put(`/api/p/${pid}/s/presupuesto`, { json: bud.json, base: bud.v, what: 'cambió «Cámara» en el presupuesto', ref: 'presupuesto|line|l1' });
  await new Promise(r => setTimeout(r, 200));
  assert.ok(!L.events.some(e => e.sec === 'presupuesto'));
  await L.stop();
  const a = (await A.get(`/api/p/${pid}/activity`)).json;
  const b = (await B.get(`/api/p/${pid}/activity`)).json;
  assert.ok(a.items.some(x => x.sec === 'presupuesto'));
  assert.ok(!b.items.some(x => x.sec === 'presupuesto' || x.ref.startsWith('presupuesto')), 'cada quien ve la actividad de lo que puede ver');
  const sbAct = a.items.filter(x => x.sec === 'storyboard');
  assert.equal(sbAct.length, 1, 'los guardados seguidos de lo mismo se juntan');
  assert.equal(sbAct[0].n, 2);
  const ana = a.counts.find(c => c.name === 'Ana'), beto = a.counts.find(c => c.name === 'Beto');
  assert.equal(ana.n, 2, 'Ana: plano y presupuesto');
  assert.equal(ana.c, 1, 'Ana: su nota (intentar borrar la de Beto no cambia nada), aparte de los cambios');
  assert.ok(beto.c >= 2 && beto.n === 0, 'Beto: solo notas');
});

test('notas al margen del guion rayado: el punto del texto y la fecha se guardan; solo su autor las mueve', async () => {
  const ON_TXT = { t: 'txt', id: 'tx1', sec: 'guion', tab: 'lined', label: 'Escena 1', p: 4, o: 12, q: 'la puerta', d: '2026-10-19', u: 1, zz: 'fuera' };
  let N = await getNotes(B);
  N.notes.m1 = note('m1', 'x', ON_TXT, 'Cambia «puerta» por «ventana» en la toma 3');
  let r = await B.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: N.notes }), base: N.v });
  assert.equal(r.status, 200, r.text);
  let A1 = await getNotes(A);
  const on = A1.notes.m1.on;
  assert.deepEqual([on.p, on.o, on.q, on.d, on.u], [4, 12, 'la puerta', '2026-10-19', 1], 'el punto, el texto que había ahí y la fecha');
  assert.equal(on.zz, undefined, 'nada más');
  // Ana no puede moverla (no es suya)
  A1.notes.m1.on = { ...on, p: 9, d: '2026-01-01' };
  r = await A.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: A1.notes }), base: A1.v });
  assert.equal(r.status, 200);
  assert.equal((await getNotes(A)).notes.m1.on.p, 4);
  // Beto sí: otra letra y otra fecha; la fecha mal escrita no entra, y no puede pegarla a otra cosa
  N = await getNotes(B);
  N.notes.m1.on = { ...N.notes.m1.on, p: 7, o: 3, q: 'Entra', d: '2026-10-20' };
  r = await B.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: N.notes }), base: N.v });
  assert.equal(r.status, 200, r.text);
  let m = (await getNotes(A)).notes.m1.on;
  assert.deepEqual([m.p, m.o, m.q, m.d], [7, 3, 'Entra', '2026-10-20']);
  N = await getNotes(B);
  N.notes.m1.on = { ...N.notes.m1.on, d: 'mañana', id: 'otra' };
  r = await B.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: N.notes }), base: N.v });
  m = (await getNotes(A)).notes.m1.on;
  assert.equal(m.id, 'tx1', 'sigue pegada a lo mismo');
  assert.equal(m.d, '2026-10-20');
});
