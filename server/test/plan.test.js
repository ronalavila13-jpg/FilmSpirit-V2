'use strict';
/* Bajar de plan: sin vacíos para seguir usando lo de un plan pagado gratis */
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.PRO_MEMBERS = '5';   // en esta prueba, Pro con 5 personas por proyecto (4 invitadas) para ver el corte
const { start, client } = require('./helpers');

const sec = t => ({ guion: JSON.stringify({ meta: { title: t }, paras: [] }) });
let S, A;
test.before(async () => { S = await start(); A = client(S.base); });
test.after(async () => { await S.stop(); });

test('al bajar de plan: los proyectos de más y las personas de más quedan fuera, sin perder nada', async () => {
  await A.post('/api/auth/google', { credential: S.token('pro@prueba.pe', 'Pro') });
  S.S.run("UPDATE users SET plan='studio' WHERE email='pro@prueba.pe'");
  const ids = [];
  for (const t of ['Uno', 'Dos', 'Tres']) { const r = await A.post('/api/projects', { sections: sec(t) }); assert.equal(r.status, 201); assert.equal(r.json.kind, 'prod'); ids.push(r.json.pid); await new Promise(r => setTimeout(r, 5)); }
  // equipo grande en «Tres»
  let r = await A.put(`/api/p/${ids[2]}/team`, { list: ['a', 'b', 'c', 'd', 'e', 'f'].map(x => ({ add: true, email: x + '@x.pe', role: 'Dirección', perms: { guion: 'editar' } })) });
  assert.equal(r.status, 200);
  // los invitados entran (pasan a ser miembros, en orden)
  const C = {};
  for (const x of ['a', 'b', 'c', 'd', 'e', 'f']) { C[x] = client(S.base); await C[x].post('/api/auth/google', { credential: S.token(x + '@x.pe', x) }); await new Promise(r => setTimeout(r, 3)); }
  // Indie: 2 proyectos de producción activos (los más recientes) y solo tú
  S.S.run("UPDATE users SET plan='indie' WHERE email='pro@prueba.pe'");
  r = await A.get(`/api/p/${ids[2]}`); assert.equal(r.json.readonly, '');
  r = await A.get(`/api/p/${ids[1]}`); assert.equal(r.json.readonly, '');
  r = await A.get(`/api/p/${ids[0]}?full=1`); assert.equal(r.json.readonly, 'plan');
  r = await A.put(`/api/p/${ids[0]}/s/guion`, { json: sec('Uno bis').guion, base: 1 });
  assert.equal(r.status, 403, 'un proyecto inactivo no se puede editar');
  r = await A.put(`/api/p/${ids[2]}/s/guion`, { json: sec('Tres bis').guion, base: 1 });
  assert.equal(r.status, 200, 'el activo sí');
  r = await A.post('/api/projects', { sections: sec('Cuatro'), kind: 'prod' });
  assert.equal(r.json.code, 'limit_projects', 'no puede crear más proyectos de producción');
  r = await A.post('/api/projects', { sections: sec('Un guion'), kind: 'guion' });
  assert.equal(r.status, 201, 'guiones sí: sin límite');
  r = await C.a.get(`/api/p/${ids[2]}`); assert.equal(r.status, 403); assert.equal(r.json.code, 'plan_suspended');
  // Pro (5 personas): entran solo las primeras 4 invitadas
  S.S.run("UPDATE users SET plan='pro' WHERE email='pro@prueba.pe'");
  r = await C.a.get(`/api/p/${ids[2]}`); assert.equal(r.status, 200);
  r = await C.d.get(`/api/p/${ids[2]}`); assert.equal(r.status, 200);
  r = await C.e.get(`/api/p/${ids[2]}`); assert.equal(r.status, 403); assert.equal(r.json.code, 'plan_suspended');
  // no se pueden sumar personas, pero sí quitar
  r = await A.put(`/api/p/${ids[2]}/team`, { list: [{ add: true, email: 'g@x.pe', role: 'X', perms: {} }] });
  assert.equal(r.json.code, 'limit_members');
  const st = (await A.get(`/api/p/${ids[2]}`)).json;
  const a = st.members.find(m => m.email === 'a@x.pe');
  r = await A.put(`/api/p/${ids[2]}/team`, { list: [{ id: a.id, remove: true }] });
  assert.equal(r.status, 200, 'quitar personas siempre se puede');
  r = await C.e.get(`/api/p/${ids[2]}`); assert.equal(r.status, 200, 'al liberar un lugar entra la siguiente');
  // de vuelta en Indie: cambiar el proyecto activo, una vez sin esperar, luego cada 30 días
  S.S.run("UPDATE users SET plan='indie' WHERE email='pro@prueba.pe'");
  r = await A.post(`/api/p/${ids[0]}/activate`, {});
  assert.equal(r.status, 200);
  r = await A.get(`/api/p/${ids[0]}`); assert.equal(r.json.readonly, '');
  r = await A.post(`/api/p/${ids[1]}/activate`, {});
  assert.equal(r.status, 403); assert.equal(r.json.code, 'switch_wait');
  // plan Guion: todos los proyectos de producción en solo lectura (se ven y se exportan); los guiones siguen
  S.S.run("UPDATE users SET plan='free' WHERE email='pro@prueba.pe'");
  for (const id of ids) { r = await A.get(`/api/p/${id}`); assert.equal(r.json.readonly, 'plan'); }
  r = await A.post(`/api/p/${ids[0]}/activate`, {});
  assert.equal(r.status, 403);
  r = await A.post('/api/projects', { sections: sec('Otro guion') });
  assert.equal(r.status, 201); assert.equal(r.json.kind, 'guion');
  // y de vuelta en Pro, todo vuelve
  S.S.run("UPDATE users SET plan='pro' WHERE email='pro@prueba.pe'");
  for (const id of ids) { r = await A.get(`/api/p/${id}`); assert.equal(r.json.readonly, ''); }
  r = await A.post('/api/projects', { sections: sec('Cinco') }); assert.equal(r.status, 201); assert.equal(r.json.kind, 'prod');
});
