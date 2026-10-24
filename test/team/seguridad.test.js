'use strict';
/* carpeta compartida del escritorio: revisión de seguridad (octubre 2026)
   uso: NODE_PATH=<carpeta con tweetnacl> node --test test/team/seguridad.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const nacl = require('tweetnacl');
const { Team } = require('../../desktop/team.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-team-'));
const shared = path.join(tmp, 'drive');
const T = who => new Team({ ext: 'fmst', appLabel: 'prueba', seenFile: path.join(tmp, who + '-visto.json') });
const secs = { guion: JSON.stringify({ meta: { title: 'X' }, paras: [{ t: 'a', x: 'original' }] }), hoja: '{}' };

let prod, prodT, file, memId, memPw, memT;
test.before(async () => {
  prodT = T('prod');
  const r = await prodT.create({ dir: shared, title: 'Película', pid: 'p1', adminName: 'Ana', password: 'contraseña-larga-123', sections: secs, frames: {} });
  file = r.file;
  const info = await prodT.info(file);
  prod = await prodT.login('p1', file, info.owner, 'contraseña-larga-123');
  const up = await prodT.updateTeam('p1', [{ add: true, name: 'Beto', role: 'Script', perms: { hoja: 'editar' } }]);
  memId = Object.keys(up.passwords)[0]; memPw = up.passwords[memId];
  memT = T('beto');
  await memT.login('p1', file, memId, memPw);
});
test.after(() => { for (const t of [prodT, memT]) t && t.close('p1'); });

test('un archivo firmado para la hoja de script no reemplaza el guion', async () => {
  const S = memT.S.get('p1');
  assert.ok(S.keys.guion, 'Beto lee el guion (todos lo leen)');
  // Beto cifra un guion falso con la llave del guion pero lo firma como «hoja» (sección que sí edita)
  const o = { sec: 'hoja', gen: S.manifest.gens.guion, ver: 99, by: S.me.id, ts: Date.now() };
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', S.keys.guion, iv);
  const ct = Buffer.concat([c.update(zlib.deflateRawSync(Buffer.from(JSON.stringify({ meta: { title: 'X' }, paras: [{ t: 'a', x: 'HACKEADO' }] })))), c.final()]);
  Object.assign(o, { iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') });
  o.sig = Buffer.from(nacl.sign.detached(Buffer.from(memT.sigText(S.manifest.id, o)), S.signSK)).toString('base64');
  const txt = JSON.stringify(o);
  const P = prodT.S.get('p1');
  await assert.rejects(prodT.readSection(P, 'guion', txt), /otra sección/);
});

test('una versión anterior de una sección no se acepta', async () => {
  const P = prodT.S.get('p1');
  const f = prodT.secFile(P, 'guion');
  const old = fs.readFileSync(f, 'utf8');
  await prodT.save('p1', 'guion', JSON.stringify({ meta: { title: 'X' }, paras: [{ t: 'a', x: 'v2' }] }));
  const B = memT.S.get('p1');
  await memT.readSection(B, 'guion');
  await assert.rejects(memT.readSection(B, 'guion', old), /anterior/);
});

test('un manifiesto viejo restaurado en la carpeta no se acepta al entrar', async () => {
  const oldManifest = fs.readFileSync(file, 'utf8');
  await prodT.updateTeam('p1', [{ id: memId, role: 'Script y continuidad' }]);   // nueva revisión
  await new Promise(r => setTimeout(r, 500));                                      // se anota lo visto
  fs.writeFileSync(file, oldManifest);                                            // alguien restaura el viejo
  const again = T('prod');                                                         // mismo equipo (mismo archivo de lo visto)
  await assert.rejects(again.login('p1', file, prod.me.id, 'contraseña-larga-123'), /copia anterior/);
});

test('contraseñas: las nuevas usan scrypt 2^17 y las anteriores se siguen abriendo', async () => {
  const w = JSON.parse(fs.readFileSync(path.join(shared, 'equipo', memId + '.id'), 'utf8'));
  assert.equal(w.kdf.N, 131072);
});

test('una contraseña cifrada con los parámetros anteriores (2^15) se abre y se vuelve a cifrar con 2^17', async () => {
  const f = path.join(shared, 'equipo', memId + '.id');
  const w = JSON.parse(fs.readFileSync(f, 'utf8'));
  const dec = (key, o) => { const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(o.iv, 'base64')); d.setAuthTag(Buffer.from(o.tag, 'base64')); return Buffer.concat([d.update(Buffer.from(o.ct, 'base64')), d.final()]); };
  const k17 = crypto.scryptSync(memPw.normalize('NFC'), Buffer.from(w.kdf.salt, 'base64'), 32, { N: 131072, r: 8, p: 1, maxmem: 300 * 1048576 });
  const secrets = dec(k17, w);
  // se vuelve a escribir como lo hacía la versión anterior
  const salt = crypto.randomBytes(16), k15 = crypto.scryptSync(memPw.normalize('NFC'), salt, 32, { N: 32768, r: 8, p: 1, maxmem: 96 * 1048576 });
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', k15, iv), ct = Buffer.concat([c.update(secrets), c.final()]);
  fs.writeFileSync(f, JSON.stringify({ id: memId, v: 1, kdf: { salt: salt.toString('base64'), N: 32768, r: 8, p: 1 }, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') }));
  const t2 = T('beto2');
  await t2.login('p1', file, memId, memPw);
  await new Promise(r => setTimeout(r, 1500));
  assert.equal(JSON.parse(fs.readFileSync(f, 'utf8')).kdf.N, 131072, 'quedó cifrada con los parámetros nuevos');
  t2.close('p1');
});
