'use strict';
/* carpeta compartida del escritorio: sobres de llaves viejos, saltos de versión e imágenes restauradas (lote T)
   uso: NODE_PATH=<carpeta con tweetnacl> node --test --test-force-exit test/team/cadena.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Team } = require('../../desktop/team.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-team-ch-'));
const shared = path.join(tmp, 'drive');
const T = who => new Team({ ext: 'fmst', appLabel: 'prueba', seenFile: path.join(tmp, who + '-visto.json') });
const bd0 = { elements: {}, tags: [], scenes: { 1: { desc: 'sala' } } };
const P1 = 'p1';

let prodT, arteT, contT, file, ids = {}, pws = {};
const S = t => t.S.get(P1);
const plainBd = t => JSON.parse(S(t).plain.desglose);
const wait = ms => new Promise(r => setTimeout(r, ms));
test.before(async () => {
  prodT = T('prod');
  const r = await prodT.create({ dir: shared, title: 'Película', pid: P1, adminName: 'Ana', password: 'contraseña-larga-123', sections: { desglose: JSON.stringify(bd0), presupuesto: '{"total":"v1"}' }, frames: {} });
  file = r.file;
  const info = await prodT.info(file);
  await prodT.login(P1, file, info.owner, 'contraseña-larga-123');
  ids.a = info.owner;
  const up = await prodT.updateTeam(P1, [
    { add: true, name: 'Lucía', role: 'Arte', perms: { desglose: 'editar', areas: ['props'] } },
    { add: true, name: 'Carlos', role: 'Producción ejecutiva', perms: { presupuesto: 'editar' } },
  ]);
  ids.l = S(prodT).manifest.members.find(m => m.name === 'Lucía').id; ids.c = S(prodT).manifest.members.find(m => m.name === 'Carlos').id;
  pws = up.passwords;
  arteT = T('arte'); await arteT.login(P1, file, ids.l, pws[ids.l]);
  contT = T('cont'); await contT.login(P1, file, ids.c, pws[ids.c]);
});
test.after(() => { for (const t of [prodT, arteT, contT]) t && t.close(P1); });

test('un sobre de llaves viejo no deshace el cambio de cerraduras', async () => {
  const eq = path.join(shared, 'equipo');
  const oldProd = fs.readFileSync(path.join(eq, ids.a + '.llaves'), 'utf8');
  const oldKey = Buffer.from(S(contT).keys.presupuesto);
  // Carlos deja de ser de producción: pierde el presupuesto y se cambia la cerradura
  const r = await prodT.updateTeam(P1, [{ id: ids.c, role: 'Montaje' }]);
  assert.ok(r.rekeyed.includes('presupuesto'));
  const newKey = Buffer.from(S(prodT).keys.presupuesto);
  // Carlos (que sigue teniendo la carpeta) vuelve a poner el sobre viejo del productor, con un número alto afuera
  const g = JSON.parse(oldProd); g.rev = 999;
  fs.writeFileSync(path.join(eq, ids.a + '.llaves'), JSON.stringify(g));
  await assert.rejects(prodT.openGrant(S(prodT)), /no llegan/);
  await prodT.poll(S(prodT));
  assert.ok(Buffer.from(S(prodT).keys.presupuesto).equals(newKey), 'el productor conserva la llave nueva');
  // y aunque alguien le meta la llave vieja en memoria, no cifra con ella
  const P = S(prodT), keep = P.keys.presupuesto, kg = P.keyGens.presupuesto;
  P.keys.presupuesto = oldKey; P.keyGens.presupuesto = kg - 1;
  await assert.rejects(prodT.writeSection(P, 'presupuesto', '{"total":"v2"}'), /no están al día/);
  P.keys.presupuesto = keep; P.keyGens.presupuesto = kg;
  // al entrar de nuevo, el sobre viejo tampoco sirve
  await assert.rejects(T('prod2').login(P1, file, ids.a, 'contraseña-larga-123'), /no llegan/);
  // el productor vuelve a escribir su sobre (cualquier cambio del equipo lo hace) y todo sigue
  await prodT.updateTeam(P1, []);
  await prodT.poll(S(prodT));
  assert.ok(Buffer.from(S(prodT).keys.presupuesto).equals(newKey));
});

test('jefe de área: un cambio fuera de sus áreas no pasa saltándose versiones', async () => {
  // Lucía recibe el manifiesto y las llaves nuevas del cambio anterior
  await arteT.poll(S(arteT)); await arteT.poll(S(arteT));
  assert.equal(S(arteT).manifest.rev, S(prodT).manifest.rev);
  // Lucía guarda bien (su área) y el productor lo acepta
  const ok1 = plainBd(arteT); ok1.elements.e1 = { cat: 'props', name: 'silla' };
  await arteT.save(P1, 'desglose', JSON.stringify(ok1));
  const r1 = await prodT.readSection(S(prodT), 'desglose');
  assert.equal(JSON.parse(r1.json).elements.e1.name, 'silla');
  // ahora fabrica una versión que cambia el decorado (no es su área) y salta 50 números
  const bad = plainBd(arteT); bad.scenes[1].desc = 'HACKEADO';
  const A = S(arteT); A.vers.desglose += 50;
  await arteT.writeSection(A, 'desglose', JSON.stringify(bad));
  await assert.rejects(prodT.readSection(S(prodT), 'desglose'), /no le corresponden/);
  // y sin decir de qué versión parte
  delete A.envh.desglose; A.vers.desglose += 50;
  await arteT.writeSection(A, 'desglose', JSON.stringify(bad));
  await assert.rejects(prodT.readSection(S(prodT), 'desglose'), e => e.code === 'unverified');
  // tampoco al volver a entrar en la computadora del productor (lo último que vio queda anotado)
  await wait(600);
  const again = T('prod');
  const st = await again.login(P1, file, ids.a, 'contraseña-larga-123');
  assert.equal(st.sections.desglose, null);
  again.close(P1);
});

test('jefe de área: sus cambios buenos pasan aunque el productor se haya perdido varias versiones', async () => {
  // Lucía vuelve a partir de la última versión buena
  const A = S(arteT), P = S(prodT);
  A.envh.desglose = P.envh.desglose; A.plain.desglose = P.plain.desglose;
  for (let i = 2; i <= 6; i++) {
    const v = JSON.parse(A.plain.desglose); v.elements['e' + i] = { cat: 'props', name: 'objeto ' + i };
    await arteT.writeSection(A, 'desglose', JSON.stringify(v));
  }
  const r = await prodT.readSection(P, 'desglose');
  assert.equal(Object.keys(JSON.parse(r.json).elements).length, 6);
  // una versión del medio con un cambio ajeno también se detecta
  const v = JSON.parse(A.plain.desglose); v.scenes[1].desc = 'otra cosa';
  await arteT.writeSection(A, 'desglose', JSON.stringify(v));
  const v2 = JSON.parse(A.plain.desglose); v2.elements.e7 = { cat: 'props', name: 'lámpara' };
  await arteT.writeSection(A, 'desglose', JSON.stringify(v2));
  await assert.rejects(prodT.readSection(P, 'desglose'), /no le corresponden/);
});

test('imágenes: no se pueden cambiar de archivo ni devolver una anterior', async () => {
  const P = S(prodT);
  await prodT.saveFrame(P1, 'bd~1', 'data:image/png;base64,AAAA');
  const f1 = prodT.frameFile(P, 'bd~1');
  const old = fs.readFileSync(f1, 'utf8');
  await wait(5);
  await prodT.saveFrame(P1, 'bd~1', 'data:image/png;base64,BBBB');
  await prodT.saveFrame(P1, 'bd~2', 'data:image/png;base64,CCCC');
  const L = S(arteT);
  const now = await arteT.readFrame(L, f1, fs.readFileSync(f1, 'utf8'));
  assert.equal(now.u, 'data:image/png;base64,BBBB');
  await assert.rejects(arteT.readFrame(L, f1, old), /anterior/);
  await assert.rejects(arteT.readFrame(L, prodT.frameFile(P, 'bd~2'), old), /no le corresponde/);
});

test('un proyecto compartido con la versión anterior se sigue abriendo y el productor actualiza los sobres', async () => {
  const nacl = require('tweetnacl');
  const P = S(prodT), eq = path.join(shared, 'equipo'), f = path.join(eq, ids.a + '.llaves');
  // sobre como lo escribía la versión anterior (sin revisión ni persona dentro)
  const nonce = nacl.randomBytes(24), keys = Object.fromEntries(Object.entries(P.keys).map(([k, v]) => [k, Buffer.from(v).toString('base64')]));
  const msg = Buffer.from(JSON.stringify({ pid: P1, keys, gens: P.manifest.gens }));
  const me = P.manifest.members.find(m => m.id === ids.a);
  fs.writeFileSync(f, JSON.stringify({ rev: P.manifest.rev, nonce: Buffer.from(nonce).toString('base64'), box: Buffer.from(nacl.box(new Uint8Array(msg), nonce, new Uint8Array(Buffer.from(me.box, 'base64')), P.boxSK)).toString('base64') }));
  const again = T('prod-legacy');
  await again.login(P1, file, ids.a, 'contraseña-larga-123');
  const o = JSON.parse(Buffer.from(nacl.box.open(new Uint8Array(Buffer.from(JSON.parse(fs.readFileSync(f, 'utf8')).box, 'base64')), new Uint8Array(Buffer.from(JSON.parse(fs.readFileSync(f, 'utf8')).nonce, 'base64')), new Uint8Array(Buffer.from(P.adminBox, 'base64')), P.boxSK)).toString());
  assert.equal(o.mid, ids.a, 'el sobre quedó en el formato nuevo');
  again.close(P1);
});
