/* ============================================================
   Entrar con Google: verifica el «ID token» que entrega el botón de Google
   (Google Identity Services) con las llaves públicas de Google (JWKS).
   Sin librerías: node:crypto verifica la firma RS256.
   Para las pruebas, GOOGLE_JWKS_FILE apunta a llaves locales de prueba.
   ============================================================ */
'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');

const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
let cache = { keys: null, exp: 0 };

let lastForce = 0;
async function loadKeys(force) {
  if (process.env.GOOGLE_JWKS_FILE) return JSON.parse(fs.readFileSync(process.env.GOOGLE_JWKS_FILE, 'utf8')).keys;
  // una llave desconocida obliga a releer las de Google, pero como mucho una vez por minuto (no se puede usar para saturar)
  if (force && cache.keys && Date.now() - lastForce < 60e3) return cache.keys;
  if (force) lastForce = Date.now();
  if (!force && cache.keys && Date.now() < cache.exp) return cache.keys;
  const r = await fetch(JWKS_URL, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('No se pudieron leer las llaves de Google (' + r.status + ')');
  const j = await r.json();
  const m = /max-age=(\d+)/.exec(r.headers.get('cache-control') || '');
  cache = { keys: j.keys || [], exp: Date.now() + Math.min(+(m && m[1]) || 3600, 86400) * 1000 };
  return cache.keys;
}
const part = s => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

/* devuelve { sub, email, name, picture } o lanza un error con un mensaje para la persona */
async function verifyIdToken(token, clientId) {
  if (typeof token !== 'string' || token.length > 4096) throw new Error('Token inválido');
  const bits = token.split('.');
  if (bits.length !== 3) throw new Error('Token inválido');
  let head, body;
  try { head = part(bits[0]); body = part(bits[1]); } catch (e) { throw new Error('Token inválido'); }
  if (head.alg !== 'RS256' || !head.kid) throw new Error('Token inválido');
  let keys = await loadKeys(false), jwk = keys.find(k => k.kid === head.kid);
  if (!jwk) { keys = await loadKeys(true); jwk = keys.find(k => k.kid === head.kid); }
  if (!jwk) throw new Error('Llave desconocida');
  const key = crypto.createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' });
  const ok = crypto.verify('RSA-SHA256', Buffer.from(bits[0] + '.' + bits[1]), key, Buffer.from(bits[2], 'base64url'));
  if (!ok) throw new Error('Firma inválida');
  const t = Date.now() / 1000;
  if (!ISSUERS.has(body.iss)) throw new Error('Emisor inválido');
  const aud = Array.isArray(body.aud) ? body.aud : [body.aud];
  if (!clientId || !aud.includes(clientId)) throw new Error('Token de otra aplicación');
  if (!(body.exp > t - 30)) throw new Error('Token vencido');
  if (body.iat && body.iat > t + 300) throw new Error('Token del futuro');
  if (!body.sub || !body.email) throw new Error('Token sin correo');
  if (body.email_verified !== true && body.email_verified !== 'true') throw new Error('Tu correo de Google no está verificado');
  const pic = String(body.picture || '');
  return {
    sub: String(body.sub).slice(0, 255), email: String(body.email).toLowerCase(),
    name: String(body.name || body.given_name || '').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').trim().slice(0, 120),
    picture: /^https:\/\/[^\s"'<>]+$/.test(pic) && pic.length <= 500 ? pic : '',
  };
}

module.exports = { verifyIdToken };
