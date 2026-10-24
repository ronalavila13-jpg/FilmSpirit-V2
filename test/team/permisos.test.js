'use strict';
/* escritorio: las llaves de cada sección siguen las mismas reglas que el servidor (src/areas.js)
   uso: NODE_PATH=<carpeta con tweetnacl> node --test test/team/permisos.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Team } = require('../../desktop/team.js');

const W = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-perm-'));
const PW = 'clave-productor-123';
const budget = JSON.stringify({ budget: { currency: 'S/', lines: [{ id: 'b1', name: 'Cámara', qty: 1, mult: 1, rate: 5000 }] } });

test('el presupuesto: la llave solo para producción, y se cambia si alguien deja de serlo', async () => {
  const A = new Team({ ext: 'fmst', appLabel: 't', seenFile: path.join(W, 'a.json') });
  const { file } = await A.create({ dir: W + '/P1', title: 'P', pid: 'p1', adminName: 'Prod', password: PW, sections: { presupuesto: budget, plan: '{}' }, frames: {} });
  const info = await A.info(file);
  await A.login('p1', file, info.owner, PW);
  const up = await A.updateTeam('p1', [
    { add: true, name: 'Arte', role: 'Dirección de arte', perms: { plan: 'ver', presupuesto: 'editar' } },
    { add: true, name: 'Jefa', role: 'Jefatura de producción', perms: { plan: 'ver', presupuesto: 'editar' } },
  ]);
  const [arte, jefa] = Object.keys(up.passwords);
  const B = new Team({ ext: 'fmst', appLabel: 't', seenFile: path.join(W, 'b.json') });
  const sb = await B.login('p1', file, arte, up.passwords[arte]);
  assert.ok(!B.S.get('p1').keys.presupuesto, 'Dirección de arte no recibe la llave del presupuesto');
  await assert.rejects(B.save('p1', 'presupuesto', budget), 'ni puede guardarlo');
  B.close('p1');
  const C = new Team({ ext: 'fmst', appLabel: 't', seenFile: path.join(W, 'c.json') });
  await C.login('p1', file, jefa, up.passwords[jefa]);
  assert.ok(C.S.get('p1').keys.presupuesto, 'Jefatura de producción sí');
  C.close('p1');
  // deja de ser de producción: la llave del presupuesto cambia
  const r = await A.updateTeam('p1', [{ id: jefa, role: 'Dirección' }]);
  assert.ok(r.rekeyed.includes('presupuesto'), 'se cambió la cerradura: ' + r.rekeyed.join(','));
  const C2 = new Team({ ext: 'fmst', appLabel: 't', seenFile: path.join(W, 'c2.json') });
  await C2.login('p1', file, jefa, up.passwords[jefa]);
  assert.ok(!C2.S.get('p1').keys.presupuesto);
  C2.close('p1'); A.close('p1');
});

test('una firma de alguien sin cargo de producción en el presupuesto no se acepta', async () => {
  const A = new Team({ ext: 'fmst', appLabel: 't', seenFile: path.join(W, 'd.json') });
  const { file } = await A.create({ dir: W + '/P2', title: 'P', pid: 'p2', adminName: 'Prod', password: PW, sections: {}, frames: {} });
  const info = await A.info(file);
  await A.login('p2', file, info.owner, PW);
  const S = A.S.get('p2');
  const m = { owner: 'o', members: [{ id: 'o', role: 'Producción' }, { id: 'x', role: 'Dirección de arte', perms: { presupuesto: 'editar' } }, { id: 'y', role: 'Producción', perms: { presupuesto: 'editar' } }] };
  assert.equal(A.canWrite(m, 'x', 'presupuesto'), null);
  assert.ok(A.canWrite(m, 'y', 'presupuesto'));
  assert.ok(A.canWrite(m, 'o', 'presupuesto'), 'quien creó el proyecto, sí');
  assert.equal(A.canWrite(m, 'z', 'presupuesto'), null, 'quien no está en el equipo no firma');
  A.close('p2');
});
