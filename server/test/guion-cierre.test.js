'use strict';
/* guion cerrado: el servidor solo acepta cambios del texto en una revisión abierta y de las personas autorizadas */
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, client } = require('./helpers');

let S, A, B, C, pid, uid = {};
const paras = [{ t: 'h', x: 'INT. CASA - DÍA', n: '1', lpg: [[0, '1']] }, { t: 'a', x: 'Ana entra.' }, { t: 'h', x: 'EXT. CALLE - NOCHE', n: '2' }, { t: 'a', x: 'Llueve.' }];
const sec = async c => { const r = await c.get(`/api/p/${pid}/s/guion`); return { v: r.json.v, val: JSON.parse(r.json.json) }; };
const save = async (c, fn) => { const { v, val } = await sec(c); fn(val); return c.put(`/api/p/${pid}/s/guion`, { json: JSON.stringify(val), base: v }); };

test.before(async () => {
  S = await start();
  A = client(S.base); B = client(S.base); C = client(S.base);
  for (const [c, e] of [[A, 'ana@lk.pe'], [B, 'beto@lk.pe'], [C, 'caro@lk.pe']]) {
    const r = await c.post('/api/auth/google', { credential: S.token(e) });
    assert.equal(r.status, 200); uid[e[0]] = r.json.me ? r.json.me.id : (await c.get('/api/me')).json.id;
  }
  const r = await A.post('/api/projects', { sections: { guion: JSON.stringify({ meta: { title: 'Cierre' }, paras }) } });
  assert.equal(r.status, 201, r.text);
  pid = r.json.pid;
  // Beto dirige (el guion solo lo ve); Caro es asistente con permiso de editar el guion
  await A.put(`/api/p/${pid}/team`, { list: [{ add: true, email: 'beto@lk.pe', role: 'Dirección', perms: { guion: 'ver' } }, { add: true, email: 'caro@lk.pe', role: 'Asistencia de dirección', perms: { guion: 'editar' } }] });
  for (const c of [B, C]) assert.equal((await c.get(`/api/p/${pid}`)).status, 200);
  const st = (await A.get(`/api/p/${pid}`)).json;
  for (const m of st.members) { if (m.email === 'beto@lk.pe') uid.b = m.id; if (m.email === 'caro@lk.pe') uid.c = m.id; if (m.owner) uid.a = m.id; }
});
test.after(async () => { await S.stop(); });

test('guion cerrado: quién cierra, quién revisa y quién reabre', async () => {
  // cerrar: solo quien administra o un cargo de producción
  let r = await save(C, g => { g.meta.lock = { on: true, people: [{ id: 'x', mid: uid.c, adm: true }], log: [] }; });
  assert.equal(r.status, 423); assert.equal(r.json.code, 'lock_producer');
  r = await save(A, g => {
    g.meta.lock = { on: true, at: 1, by: 'Ana', people: [{ id: 'pa', name: 'Ana', role: 'Producción', mid: uid.a, adm: true, s: 'a'.repeat(32), h: 'b'.repeat(64) }, { id: 'pb', name: 'Beto', role: 'Dirección', mid: uid.b }], rev: null, revs: [], log: [{ t: 1, who: 'Ana', txt: 'Cerró el guion final' }] };
  });
  assert.equal(r.status, 200, r.text);
  // Caro puede editar el guion, pero no está autorizada: no cambia el texto
  r = await save(C, g => { g.paras[1].x = 'Ana entra corriendo.'; });
  assert.equal(r.status, 423); assert.equal(r.json.code, 'lock_who');
  // los datos del proyecto (título) sí, con su permiso
  r = await save(C, g => { g.meta.title = 'Cierre (v2)'; });
  assert.equal(r.status, 200, r.text);
  // Beto (solo ve el guion) está autorizado: sin revisión abierta, no
  r = await save(B, g => { g.paras[1].x = 'Ana entra despacio.'; });
  assert.equal(r.status, 423); assert.equal(r.json.code, 'lock_rev');
  // con la revisión abierta, sí (aunque su permiso sea «ver»)
  r = await save(B, g => { g.meta.lock.rev = { c: 'azul', at: 2, by: 'Beto', date: '2026-10-18' }; g.meta.lock.log.push({ t: 2, who: 'Beto', txt: 'Abrió la revisión azul' }); g.paras[1].x = 'Ana entra despacio.'; g.paras[1].rv = 'azul'; });
  assert.equal(r.status, 200, r.text);
  // pone su propio código
  r = await save(B, g => { const p = g.meta.lock.people.find(x => x.mid === uid.b); p.s = 'c'.repeat(32); p.h = 'd'.repeat(64); p.at = 3; });
  assert.equal(r.status, 200, r.text);
  // no puede cambiar quién revisa, ni el código de otra persona, ni reabrir, ni borrar el registro
  r = await save(B, g => { g.meta.lock.people = g.meta.lock.people.filter(x => x.mid === uid.b); });
  assert.equal(r.json.code, 'lock_admin');
  r = await save(B, g => { g.meta.lock.people[0].h = 'e'.repeat(64); });
  assert.equal(r.json.code, 'lock_admin');
  r = await save(B, g => { g.meta.lock.on = false; });
  assert.equal(r.json.code, 'lock_admin');
  r = await save(B, g => { g.meta.lock.log = []; });
  assert.equal(r.json.code, 'lock_log');
  // tampoco recortarlo desde lo más viejo (solo se recorta al llegar al tope de 1500 líneas)
  r = await save(B, g => { g.meta.lock.log = g.meta.lock.log.slice(1).concat([{ t: 9, who: 'Ana', txt: 'inventado' }]); });
  assert.equal(r.json.code, 'lock_log');
  // cierra la revisión
  r = await save(B, g => { g.meta.lock.revs.push({ c: 'azul', at: 2, end: 4, by: 'Beto', n: 1, sc: ['1'] }); g.meta.lock.rev = null; g.meta.lock.log.push({ t: 4, who: 'Beto', txt: 'Cerró la revisión azul' }); });
  assert.equal(r.status, 200, r.text);
  r = await save(B, g => { g.paras[3].x = 'Ya no llueve.'; });
  assert.equal(r.json.code, 'lock_rev');
  // las revisiones cerradas no se borran
  r = await save(B, g => { g.meta.lock.revs = g.meta.lock.revs.slice(1); });
  assert.equal(r.json.code, 'lock_log');
  // producción quita a Beto: ya no guarda el guion
  r = await save(A, g => { g.meta.lock.people = g.meta.lock.people.filter(x => x.mid !== uid.b); });
  assert.equal(r.status, 200, r.text);
  r = await save(B, g => { g.meta.title = 'Otro'; });
  assert.equal(r.status, 403);
  // producción reabre: el guion vuelve a la normalidad (Caro edita, Beto no)
  r = await save(A, g => { g.meta.lock.on = false; for (const p of g.paras) delete p.lpg; });
  assert.equal(r.status, 200, r.text);
  r = await save(C, g => { g.paras[3].x = 'Ya no llueve.'; });
  assert.equal(r.status, 200, r.text);
  r = await save(B, g => { g.paras[3].x = 'Sol.'; });
  assert.equal(r.status, 403);
});
