/* ============================================================
   Utilidades del servidor: respuestas, cuerpo JSON, cookies, límites de frecuencia
   ============================================================ */
'use strict';
const crypto = require('node:crypto');

class HttpError extends Error {
  constructor(status, msg, code, extra) { super(msg); this.status = status; this.code = code || ''; this.extra = extra || null; }
}
const fail = (status, msg, code, extra) => { throw new HttpError(status, msg, code, extra); };

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
};
function sendJSON(res, status, obj, headers) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { ...SEC_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body), ...(headers || {}) });
  res.end(body);
}
function sendText(res, status, text, type, headers) {
  res.writeHead(status, { ...SEC_HEADERS, 'Content-Type': (type || 'text/plain') + '; charset=utf-8', 'Cache-Control': 'no-store', ...(headers || {}) });
  res.end(text);
}
function redirect(res, to, headers) {
  res.writeHead(302, { ...SEC_HEADERS, Location: to, 'Cache-Control': 'no-store', ...(headers || {}) });
  res.end();
}

/* cuerpo JSON con tope de tamaño */
function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const len = +req.headers['content-length'] || 0;
    if (len > max) { req.resume(); return reject(new HttpError(413, 'El envío es demasiado grande.', 'too_large')); }
    const parts = []; let n = 0, done = false;
    req.on('data', c => {
      if (done) return;
      n += c.length;
      if (n > max) { done = true; req.resume(); reject(new HttpError(413, 'El envío es demasiado grande.', 'too_large')); return; }
      parts.push(c);
    });
    req.on('end', () => { if (!done) { done = true; resolve(Buffer.concat(parts)); } });
    req.on('error', e => { if (!done) { done = true; reject(e); } });
  });
}
async function readJSON(req, max) {
  const buf = await readBody(req, max);
  if (!buf.length) return {};
  try { const v = JSON.parse(buf.toString('utf8')); if (!v || typeof v !== 'object') throw 0; return v; }
  catch (e) { throw new HttpError(400, 'Datos con formato inválido.', 'bad_json'); }
}

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k && !(k in out)) { try { out[k] = decodeURIComponent(v); } catch (e) { out[k] = v; } }
  }
  return out;
}
function cookie(name, value, { maxAge, secure, httpOnly = true, sameSite = 'Lax', path = '/' } = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=${path}; SameSite=${sameSite}`;
  if (maxAge != null) c += `; Max-Age=${Math.floor(maxAge)}`;
  if (httpOnly) c += '; HttpOnly';
  if (secure) c += '; Secure';
  return c;
}

/* agrega una cookie sin pisar las que ya se van a enviar */
function addCookie(res, c) {
  const cur = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', cur ? [].concat(cur, c) : c);
}

/* límite de frecuencia por clave (ventana deslizante sencilla). Las ventanas duran a lo más una hora.
   La tabla tiene tope (RL_MAX claves): con miles de IP distintas crecía sin límite entre una limpieza y la siguiente.
   Al llegar al tope se quitan las que ya no limitan (pasó su propia ventana) y, si sigue llena, las más viejas */
const RL = new Map(), RL_MAX = 100000;
let rlHook = null;   // aviso de cada bloqueo (seguridad.js: los cuenta para el panel)
const setRateHook = f => { rlHook = f; };
const noteLimit = key => { if (rlHook) { try { rlHook(key); } catch (er) { } } };
function rlTrim(now) {
  for (const [k, e] of RL) if (now - e.t > e.w) RL.delete(k);
  if (RL.size < RL_MAX) return;
  let drop = RL.size - Math.floor(RL_MAX * 0.9);
  for (const k of RL.keys()) { if (drop-- <= 0) break; RL.delete(k); }
}
/* cost: cuánto suma esta vez (1 por solicitud; las lecturas pesadas suman sus bytes) */
function rateLimit(key, max, windowMs, cost = 1) {
  const now = Date.now();
  let e = RL.get(key);
  if (!e || now - e.t > windowMs) {
    if (!e && RL.size >= RL_MAX) rlTrim(now);
    e = { t: now, n: 0, w: windowMs }; RL.delete(key); RL.set(key, e);
  }
  e.n += cost;
  if (e.n > max) { noteLimit(key); fail(429, 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.', 'rate_limited'); }
}
setInterval(() => { const now = Date.now(); for (const [k, e] of RL) if (now - e.t > e.w) RL.delete(k); }, 600e3).unref();

const rid = (n = 16) => crypto.randomBytes(n).toString('base64url');
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const now = () => Date.now();
const normEmail = e => String(e || '').trim().toLowerCase();
// solo la dirección (sin «Nombre <correo>», comas, comillas ni punto y coma): antes pasaban formas como «x<ana@dominio>»
// que el servicio de correo podía entregar al mismo buzón con otro texto
const isEmail = e => /^[^\s@<>",;:()\[\]\\]{1,64}@[^\s@<>",;:()\[\]\\]{1,190}\.[^\s@<>",;:()\[\]\\]{2,}$/.test(e) && e.length <= 254;
/* el buzón de un correo, para contar envíos: sin «+etiqueta» y sin puntos en la parte de antes de la @ */
const mailbox = e => { const s = String(e || '').toLowerCase(), i = s.lastIndexOf('@'); return i < 0 ? s : s.slice(0, i).replace(/\+.*$/, '').replace(/\./g, '') + s.slice(i); };

module.exports = { HttpError, fail, SEC_HEADERS, sendJSON, sendText, redirect, readBody, readJSON, parseCookies, cookie, addCookie, rateLimit, setRateHook, noteLimit, RL, RL_MAX, rid, sha256, now, normEmail, isEmail, mailbox };
