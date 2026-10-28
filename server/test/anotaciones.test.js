'use strict';
/* anotaciones a mano del guion rayado (notas «ink»): las ve todo el equipo que ve el guion, cada quien cambia y borra
   solo las suyas, y sus trazos llegan limpios (números enteros, colores y herramientas conocidos, con tope) */
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, client } = require('./helpers');

let S, A, B, pid;
const sections = () => ({ guion: JSON.stringify({ meta: { title: 'Anotar' }, paras: [{ t: 'h', x: 'INT. CASA - DÍA', n: '1' }, { t: 'a', x: 'Ana entra.' }] }) });
const ink = (id, s, more) => ({ id, by: 'x', name: '?', ts: Date.now(), text: 'Anotación a mano', on: { t: 'ink', id: 'ik' + id, sec: 'guion', tab: 'lined', label: 'Guion rayado', p: 1, o: 0, q: 'Ana entra.', s, ...(more || {}) } });
const getNotes = async C => { const r = (await C.get(`/api/p/${pid}/s/notas`)).json; return { v: r.v, notes: r.json ? JSON.parse(r.json).notes : {} }; };

test.before(async () => {
  S = await start(); A = client(S.base); B = client(S.base);
  await A.post('/api/auth/google', { credential: S.token('dir@prueba.pe', 'Dirección') });
  S.S.run("UPDATE users SET plan='pro' WHERE email='dir@prueba.pe'");
  let r = await A.post('/api/projects', { sections: sections(), c: 'cA' });
  pid = r.json.pid;
  r = await A.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'foto@prueba.pe', role: 'Dirección de fotografía', perms: { guion: 'ver' } }] });
  assert.equal(r.status, 200, r.text);
  await B.post('/api/auth/google', { credential: S.token('foto@prueba.pe', 'Foto') });
});
test.after(async () => { await S.stop(); });

test('una anotación llega limpia y la ve quien ve el guion (aunque solo pueda mirarlo)', async () => {
  const s = [
    { k: 'p', c: 'r', w: 2, d: [10.4, 20, 30, 40.6, 55, 60], z: [40, 55.5, 70] },
    { k: 'a', c: 'b', w: 1, d: [0, 0, 300, 100, 150, -80] },
    { k: 't', c: 'k', w: 3, d: [100, 50], tx: 'Más\u0000 luz' },
    { k: 'x', c: 'r', w: 1, d: [1, 2] },                    // herramienta que no existe
    { k: 'p', c: 'morado', w: 9, d: [1, 2, 3] },            // números impares
    { k: 't', c: 'r', w: 1, d: [0, 0], tx: '   ' },         // texto vacío
    { k: 'm', c: 'g', w: 3, d: [0, 'x', 5, 5] },            // un número que no es número
  ];
  let r = await B.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: { i1: ink('i1', s) } }), base: 0, c: 'cB' });
  assert.equal(r.status, 200, r.text);
  const { notes } = await getNotes(A);
  const n = notes.i1;
  assert.ok(n, 'la anotación de quien solo mira el guion se guarda');
  assert.equal(n.name, 'Foto');
  assert.deepEqual(n.on.s, [
    { k: 'p', c: 'r', w: 2, d: [10, 20, 30, 41, 55, 60], z: [40, 56, 70] },
    { k: 'a', c: 'b', w: 1, d: [0, 0, 300, 100, 150, -80] },
    { k: 't', c: 'k', w: 3, d: [100, 50], tx: 'Más luz' },
  ]);
  assert.equal(n.on.p, 1); assert.equal(n.on.q, 'Ana entra.');
});

test('cada quien cambia y borra solo sus anotaciones; sin trazos válidos no entra', async () => {
  const A1 = await getNotes(A);
  A1.notes.i1.on = { ...A1.notes.i1.on, s: [{ k: 'p', c: 'k', w: 1, d: [0, 0, 1, 1] }] };   // no es suya: no cambia
  A1.notes.i2 = ink('i2', [{ k: 'x', d: [1, 2] }]);                                        // nada válido: no entra
  A1.notes.i3 = ink('i3', [{ k: 'm', c: 'o', w: 3, d: [0, 0, 400, 0] }]);
  let r = await A.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: A1.notes }), base: A1.v });
  assert.equal(r.status, 200, r.text);
  let N = (await getNotes(B)).notes;
  assert.equal(N.i1.on.s.length, 3, 'la de Foto sigue igual');
  assert.equal(N.i2, undefined);
  assert.ok(N.i3);
  // Foto borra un trazo de la suya y quiere borrar la de Dirección: solo lo suyo
  const B1 = await getNotes(B);
  B1.notes.i1.on.s = B1.notes.i1.on.s.slice(0, 1);
  delete B1.notes.i3;
  r = await B.put(`/api/p/${pid}/s/notas`, { json: JSON.stringify({ notes: B1.notes }), base: B1.v });
  assert.equal(r.status, 200, r.text);
  N = (await getNotes(A)).notes;
  assert.equal(N.i1.on.s.length, 1, 'quitó un trazo de la suya');
  assert.ok(N.i3, 'la de Dirección no se borra');
});
