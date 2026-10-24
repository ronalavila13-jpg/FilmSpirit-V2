'use strict';
/* carpeta compartida del escritorio: imágenes de cada sección, cambio de cerraduras y guardados casi a la vez
   uso: NODE_PATH=<carpeta con tweetnacl> node --test test/team/imagenes.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Team } = require('../../desktop/team.js');

const W = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-img-'));
const img = 'data:image/png;base64,AAAA';
const PW = 'clave-productor-123';

test('las fotos del punto de encuentro (hoja de llamado) se leen al volver a abrir', async () => {
  const A = new Team({ ext: 'fmst', appLabel: 't', seenFile: path.join(W, 'a.json') });
  const { file } = await A.create({ dir: W + '/P1', title: 'P', pid: 'p1', adminName: 'Prod', password: PW, sections: {}, frames: { sb1: img, 'lc~c1~p1': img, 'cl~d1~p1': img } });
  const info = await A.info(file);
  await A.login('p1', file, info.owner, PW);
  const fr = await A.loadFrames('p1');
  assert.ok('sb1' in fr && 'lc~c1~p1' in fr && 'cl~d1~p1' in fr, Object.keys(fr).join());
  A.close('p1');
});

test('quitar el plan a alguien no deja ilegibles las fotos del scouting', async () => {
  const A = new Team({ ext: 'fmst', appLabel: 't', seenFile: path.join(W, 'b.json') });
  const { file } = await A.create({ dir: W + '/P2', title: 'P', pid: 'p2', adminName: 'Prod', password: PW, sections: {}, frames: { sb1: img, 'lc~c1~p1': img } });
  const info = await A.info(file);
  await A.login('p2', file, info.owner, PW);
  const up = await A.updateTeam('p2', [{ add: true, name: 'Arte', role: 'Dirección de arte', perms: { desglose: 'editar', plan: 'ver' } }]);
  const mid = Object.keys(up.passwords)[0];
  const r2 = await A.updateTeam('p2', [{ id: mid, perms: { desglose: 'editar' } }]);
  assert.deepEqual(r2.rekeyed, ['plan']);
  const A2 = new Team({ ext: 'fmst', appLabel: 't', seenFile: path.join(W, 'b2.json') });
  await A2.login('p2', file, info.owner, PW);
  const fr = await A2.loadFrames('p2');
  assert.ok('lc~c1~p1' in fr, 'el scouting sigue legible');
  assert.ok('sb1' in fr);
  A.close('p2'); A2.close('p2');
});

test('dos personas guardan la misma sección casi a la vez: la segunda no pisa a la primera', async () => {
  const A = new Team({ ext: 'fmst', appLabel: 't', seenFile: path.join(W, 'c.json') });
  const { file } = await A.create({ dir: W + '/P3', title: 'P', pid: 'p3', adminName: 'Prod', password: PW, sections: { plan: JSON.stringify({ schedule: { items: [] } }) }, frames: {} });
  const info = await A.info(file);
  await A.login('p3', file, info.owner, PW);
  const up = await A.updateTeam('p3', [{ add: true, name: 'AD', role: 'Asistencia de dirección', perms: { guion: 'ver', desglose: 'ver', plan: 'editar' } }]);
  const mid = Object.keys(up.passwords)[0];
  const B = new Team({ ext: 'fmst', appLabel: 't', seenFile: path.join(W, 'c2.json') });
  await B.login('p3', file, mid, up.passwords[mid]);
  const sent = [];
  A.send = (ev, pid, d) => sent.push([ev, d]);
  // B guarda primero; A, que todavía no lo leyó, guarda después
  assert.ok((await B.save('p3', 'plan', JSON.stringify({ schedule: { items: [{ k: '1' }] } }))).ver);
  const r = await A.save('p3', 'plan', JSON.stringify({ schedule: { items: [{ k: '2' }] } }));
  assert.equal(r.conflict, true, 'A recibe la versión de B para fusionar');
  assert.ok(sent.some(([ev, d]) => ev === 'team-update' && d.sec === 'plan' && d.json.includes('"k":"1"')));
  // lo de B sigue en la carpeta
  const C = new Team({ ext: 'fmst', appLabel: 't', seenFile: path.join(W, 'c3.json') });
  await C.login('p3', file, info.owner, PW);
  const st = await C.readSection(C.S.get('p3'), 'plan');
  assert.match(st.json, /"k":"1"/);
  A.close('p3'); B.close('p3'); C.close('p3');
});
