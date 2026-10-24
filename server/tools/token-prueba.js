/* ============================================================
   SOLO PARA PRUEBAS: llaves y tokens de Google falsos.
   El servidor de prueba se arranca con GOOGLE_JWKS_FILE=<dir>/jwks.json; así
   acepta tokens firmados con la llave privada de prueba. En producción esa
   variable no existe y solo valen los tokens firmados por Google.
     node tools/token-prueba.js llaves <dir>
     node tools/token-prueba.js token <dir> <correo> [nombre] [aud]
   ============================================================ */
'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function makeKeys(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = publicKey.export({ format: 'jwk' });
  const kid = 'prueba-' + crypto.randomBytes(4).toString('hex');
  fs.writeFileSync(path.join(dir, 'jwks.json'), JSON.stringify({ keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] }));
  fs.writeFileSync(path.join(dir, 'llave.pem'), privateKey.export({ format: 'pem', type: 'pkcs8' }));
  fs.writeFileSync(path.join(dir, 'kid.txt'), kid);
  return { dir, kid };
}
function mint(dir, claims) {
  const key = fs.readFileSync(path.join(dir, 'llave.pem'), 'utf8'), kid = fs.readFileSync(path.join(dir, 'kid.txt'), 'utf8');
  const t = Math.floor(Date.now() / 1000);
  const body = { iss: 'https://accounts.google.com', aud: 'cliente-de-prueba', iat: t, exp: t + 3600, email_verified: true, ...claims };
  if (!body.sub) body.sub = 'sub-' + crypto.createHash('sha1').update(body.email).digest('hex').slice(0, 12);
  const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = enc({ alg: 'RS256', kid, typ: 'JWT' }), pay = enc(body);
  const sig = crypto.sign('RSA-SHA256', Buffer.from(head + '.' + pay), key).toString('base64url');
  return `${head}.${pay}.${sig}`;
}
module.exports = { makeKeys, mint };

if (require.main === module) {
  const [cmd, dir, email, name, aud] = process.argv.slice(2);
  if (cmd === 'llaves') console.log(JSON.stringify(makeKeys(dir)));
  else if (cmd === 'token') console.log(mint(dir, { email, name: name || email.split('@')[0], ...(aud ? { aud } : {}) }));
  else console.log('uso: llaves <dir> | token <dir> <correo> [nombre] [aud]');
}
