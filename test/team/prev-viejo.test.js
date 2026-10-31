'use strict';
/* carpeta compartida del escritorio: un cambio que dice partir de una versión vieja (auditoría run-1, punto 1)
   uso: NODE_PATH=<carpeta con tweetnacl> node --test --test-force-exit test/team/prev-viejo.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Team } = require('../../desktop/team.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-team-pv-'));
const shared = path.join(tmp, 'drive');
const T = who => new Team({ ext: 'fmst', appLabel: 'prueba', seenFile: path.join(tmp, who + '-visto.json') });
const g0 = { meta: { title: 'X' }, paras: [{ t: 'h', x: 'INT. CASA - DÍA', n: '1' }, { t: 'a', x: 'original' }] };
const bd0 = { elements: {}, tags: [], scenes: { 1: { desc: 'sala' } } };
const PW = 'contraseña-larga-123';

let prodT, betoT, caroT, luciaT, file, ids = {}, id0;
const S = t => t.S.get('p1');
const plain = (t, s) => JSON.parse(S(t).plain[s]);
const wait = ms => new Promise(r => setTimeout(r, ms));
test.before(async () => {
  prodT = T('prod');
  const r = await prodT.create({ dir: shared, title: 'Película', pid: 'p1', adminName: 'Ana', password: PW, sections: { guion: JSON.stringify(g0), desglose: JSON.stringify(bd0) }, frames: {} });
  file = r.file;
  ids.a = (await prodT.info(file)).owner;
  await prodT.login('p1', file, ids.a, PW);
  const up = await prodT.updateTeam('p1', [
    { add: true, name: 'Beto', role: 'Dirección', perms: { guion: 'editar' } },
    { add: true, name: 'Caro', role: 'Asistencia de dirección', perms: { guion: 'editar' } },
    { add: true, name: 'Lucía', role: 'Arte', perms: { desglose: 'editar', areas: ['props'] } },
  ]);
  for (const n of ['Beto', 'Caro', 'Lucía']) ids[n] = S(prodT).manifest.members.find(m => m.name === n).id;
  const login = async (who, n) => { const t = T(who); await t.login('p1', file, ids[n], up.passwords[ids[n]]); return t; };
  betoT = await login('beto', 'Beto'); caroT = await login('caro', 'Caro'); luciaT = await login('lucia', 'Lucía');
  id0 = S(prodT).envh.guion;
  // sin la revisión cada 2 s del productor: su reparación automática reescribiría la carpeta en medio de las pruebas
  clearInterval(S(prodT).timer);
});
test.after(() => { for (const t of [prodT, betoT, caroT, luciaT]) t && t.close('p1'); });

test('quien no vio una versión del productor acepta igual el cambio bueno que parte de ella', async () => {
  // producción cierra el guion y abre una revisión para Beto; Caro no lo lee
  const g = plain(prodT, 'guion');
  g.meta.lock = { on: true, at: 1, by: 'Ana', people: [{ id: 'pa', name: 'Ana', role: 'Producción', mid: ids.a, adm: true }, { id: 'pb', name: 'Beto', role: 'Dirección', mid: ids.Beto }], rev: { c: 'azul', at: 2, by: 'Ana', date: '2026-10-30' }, revs: [], log: [] };
  await prodT.save('p1', 'guion', JSON.stringify(g));
  await betoT.readSection(S(betoT), 'guion');
  const gb = plain(betoT, 'guion'); gb.paras[1].x = 'cambio de Beto'; gb.paras[1].rv = 'azul';
  await betoT.save('p1', 'guion', JSON.stringify(gb));
  // Caro tenía la versión sin cerrar: el cambio de Beto parte de la del productor, que es más nueva
  const r = await caroT.readSection(S(caroT), 'guion');
  assert.equal(JSON.parse(r.json).paras[1].x, 'cambio de Beto');
  assert.equal(JSON.parse(r.json).meta.lock.on, true);
  await prodT.readSection(S(prodT), 'guion');
});

test('guion cerrado: un cambio firmado como si partiera de la versión sin cerrar no se acepta', async () => {
  // Caro (edita el guion, no está autorizada) fabrica una versión cuyo «prev» es la de antes del cierre
  const C = S(caroT), bad = JSON.parse(JSON.stringify(g0));
  bad.paras[1].x = 'reescrito por Caro';
  C.envh.guion = id0;
  await caroT.writeSection(C, 'guion', JSON.stringify(bad));
  await assert.rejects(prodT.readSection(S(prodT), 'guion'), /sin autorización/);
  assert.equal(plain(prodT, 'guion').meta.lock.on, true, 'el guion sigue cerrado');
  // tampoco al volver a entrar (sin versiones aceptadas en memoria: se parte de la última que vio)
  await wait(600);
  const again = T('prod'), warns = [];
  again.send = (ch, pid, msg) => { if (ch === 'team-warn') warns.push(msg); };
  const st = await again.login('p1', file, ids.a, PW);
  assert.equal(st.sections.guion, null);
  assert.ok(warns.some(w => /sin autorización/.test(w)), warns.join(' | '));
  again.close('p1');
  // el productor repara la sección (como en poll) para lo que sigue
  await prodT.writeSection(S(prodT), 'guion', S(prodT).plain.guion);
});

test('jefe de área: partir de una versión vieja no deshace lo que otra área cambió después', async () => {
  const P = S(prodT), L = S(luciaT), idB0 = P.envh.desglose;
  const d = plain(prodT, 'desglose'); d.scenes[1].desc = 'sala grande';
  await prodT.save('p1', 'desglose', JSON.stringify(d));
  // Lucía agrega algo de su área sobre la versión de antes (y con eso devuelve el decorado a «sala»)
  const bad = JSON.parse(JSON.stringify(bd0)); bad.elements.e1 = { cat: 'props', name: 'silla' };
  L.envh.desglose = idB0;
  await luciaT.writeSection(L, 'desglose', JSON.stringify(bad));
  await assert.rejects(prodT.readSection(P, 'desglose'), /no le corresponden/);
  assert.equal(plain(prodT, 'desglose').scenes[1].desc, 'sala grande');
  // partiendo de la versión actual, su cambio pasa
  L.envh.desglose = P.envh.desglose; L.plain.desglose = P.plain.desglose;
  const ok = plain(luciaT, 'desglose'); ok.elements.e1 = { cat: 'props', name: 'silla' };
  await luciaT.writeSection(L, 'desglose', JSON.stringify(ok));
  const r = await prodT.readSection(P, 'desglose');
  assert.equal(JSON.parse(r.json).elements.e1.name, 'silla');
  assert.equal(JSON.parse(r.json).scenes[1].desc, 'sala grande');
});
