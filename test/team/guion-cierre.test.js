'use strict';
/* carpeta compartida del escritorio: guion cerrado
   uso: NODE_PATH=<carpeta con tweetnacl> node --test --test-force-exit test/team/guion-cierre.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Team } = require('../../desktop/team.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-team-lk-'));
const shared = path.join(tmp, 'drive');
const T = who => new Team({ ext: 'fmst', appLabel: 'prueba', seenFile: path.join(tmp, who + '-visto.json') });
const g0 = { meta: { title: 'X' }, paras: [{ t: 'h', x: 'INT. CASA - DÍA', n: '1' }, { t: 'a', x: 'original' }] };

let prodT, betoT, caroT, ids = {};
const login = async (who, id, pw, file) => { const t = T(who); await t.login('p1', file, id, pw); return t; };
const plain = t => JSON.parse(t.S.get('p1').plain.guion);
test.before(async () => {
  prodT = T('prod');
  const r = await prodT.create({ dir: shared, title: 'Película', pid: 'p1', adminName: 'Ana', password: 'contraseña-larga-123', sections: { guion: JSON.stringify(g0) }, frames: {} });
  const info = await prodT.info(r.file);
  await prodT.login('p1', r.file, info.owner, 'contraseña-larga-123');
  ids.a = info.owner;
  const up = await prodT.updateTeam('p1', [{ add: true, name: 'Beto', role: 'Dirección', perms: { guion: 'editar' } }, { add: true, name: 'Caro', role: 'Asistencia de dirección', perms: { guion: 'editar' } }]);
  const S = prodT.S.get('p1');
  ids.b = S.manifest.members.find(m => m.name === 'Beto').id; ids.c = S.manifest.members.find(m => m.name === 'Caro').id;
  betoT = await login('beto', ids.b, up.passwords[ids.b], r.file);
  caroT = await login('caro', ids.c, up.passwords[ids.c], r.file);
});
test.after(() => { for (const t of [prodT, betoT, caroT]) t && t.close('p1'); });

test('guion cerrado en el equipo de escritorio', async () => {
  // producción cierra el guion y autoriza a Beto
  const g = plain(prodT);
  g.meta.lock = { on: true, at: 1, by: 'Ana', people: [{ id: 'pa', name: 'Ana', role: 'Producción', mid: ids.a, adm: true }, { id: 'pb', name: 'Beto', role: 'Dirección', mid: ids.b }], rev: null, revs: [], log: [] };
  await prodT.save('p1', 'guion', JSON.stringify(g));
  for (const t of [betoT, caroT]) await t.readSection(t.S.get('p1'), 'guion');
  // Caro puede editar el guion pero no está autorizada: su propio programa no lo guarda
  const gc = plain(caroT); gc.paras[1].x = 'cambio de Caro';
  await assert.rejects(caroT.save('p1', 'guion', JSON.stringify(gc)), /solo las personas autorizadas/);
  // y si lo escribe saltándose el aviso, el resto del equipo no lo acepta
  await caroT.writeSection(caroT.S.get('p1'), 'guion', JSON.stringify(gc));
  await assert.rejects(prodT.readSection(prodT.S.get('p1'), 'guion'), /sin autorización/);
  // Beto, sin revisión abierta: no
  await betoT.readSection(betoT.S.get('p1'), 'guion').catch(() => { });
  const gb = plain(prodT); gb.paras[1].x = 'cambio de Beto';
  betoT.S.get('p1').plain.guion = JSON.stringify(plain(prodT));
  await assert.rejects(betoT.save('p1', 'guion', JSON.stringify(gb)), /abrir una revisión/);
  // con la revisión abierta, sí: producción lo acepta
  gb.meta.lock.rev = { c: 'azul', at: 2, by: 'Beto', date: '2026-10-18' }; gb.paras[1].rv = 'azul';
  await betoT.save('p1', 'guion', JSON.stringify(gb));
  const back = await prodT.readSection(prodT.S.get('p1'), 'guion');
  assert.equal(JSON.parse(back.json).paras[1].x, 'cambio de Beto');
});
