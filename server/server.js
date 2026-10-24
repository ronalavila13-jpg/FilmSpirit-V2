/* ============================================================
   FILMSPIRIT · servidor de la web app
   Node 22 sin dependencias: http + node:sqlite + node:crypto.
   Configuración por variables de entorno (en la VPS: /etc/filmspirit/filmspirit.env):
     BASE_URL          https://filmspirit.pe        dirección pública (sin / al final)
     GOOGLE_CLIENT_ID  ….apps.googleusercontent.com  de la consola de Google Cloud
     DATA_DIR          /var/lib/filmspirit          base de datos y respaldos
     PORT, HOST        8080, 127.0.0.1              nginx atiende afuera y pasa aquí
     ADMIN_EMAILS      tu@correo.com                cuentas con el panel de administración
     TRUST_PROXY       1                            leer la IP real que envía nginx
     PEN_{INDIE,PRO,STUDIO}_{MONTH,YEAR}            precios en soles (29/290, 49/490, 129/1290)
     USD_{INDIE,PRO,STUDIO}_{MONTH,YEAR}            precios en dólares fuera del Perú (7.99/79, 14.99/149, 39/390)
     FOUNDER_UNTIL     2027-02-28T23:59:59-05:00     precio de fundador de Pro hasta esa fecha (S/ 39; código FUNDADOR fuera)
     STUDIO_OPEN       1                            Studio a la venta (sin esto, lista de espera)
     MP_ACCESS_TOKEN   APP_USR-…                    Mercado Pago, pagos en el Perú (sin él, quedan apagados)
     MP_WEBHOOK_SECRET …                            clave secreta de los avisos (webhooks) de Mercado Pago
     PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET, PADDLE_CLIENT_TOKEN   Paddle, pagos desde otros países
     PADDLE_PRICE_{INDIE,PRO,STUDIO}_{MONTH,YEAR}    los seis precios de Paddle (pri_…)
     LS_*              Lemon Squeezy, solo si no se usa Paddle
     SUPPORT_EMAIL     hola@tudominio.pe            correo de contacto del pie de página
     BUSINESS_NAME, BUSINESS_RUC, BUSINESS_ADDRESS     datos de la empresa para términos, privacidad y libro de reclamaciones
   ============================================================ */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { HttpError, sendJSON, sendText, redirect, readJSON, rateLimit, setRateHook, SEC_HEADERS } = require('./lib/util');
const { makeSecurity } = require('./lib/seguridad');
const { open } = require('./lib/db');
const temas = require('./lib/temas');
const { makeAuth } = require('./lib/auth');
const { makeApi } = require('./lib/api');
const { makeLive } = require('./lib/live');
const { makeBilling } = require('./lib/billing');
const { makeAdmin } = require('./lib/admin');
const { makeReclamos } = require('./lib/reclamos');
const { makeMail } = require('./lib/mail');
const { parseCookies, cookie, addCookie, rid, normEmail, isEmail } = require('./lib/util');
const { LANGS, countryOf, regionOf, langOf } = require('./lib/geo');

/* textos de la web pública en cinco idiomas (server/i18n/*.json) */
const I18N = Object.fromEntries(LANGS.map(l => { try { return [l, JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n', l + '.json'), 'utf8'))]; } catch (e) { return [l, {}]; } }));
const LANG_NAMES = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', it: 'Italiano' };

function config(over = {}) {
  const e = { ...process.env, ...over };
  // nombres de la versión anterior: ya no se leen (los precios nuevos tienen otros nombres)
  const viejos = ['PRICE_MONTH', 'PRICE_YEAR', 'STUDIO_PRICE_MONTH', 'STUDIO_PRICE_YEAR', 'USD_PRICE_MONTH', 'USD_PRICE_YEAR', 'USD_STUDIO_PRICE_MONTH', 'USD_STUDIO_PRICE_YEAR', 'FREE_MEMBERS'].filter(k => e[k]);
  if (viejos.length) console.warn(`Aviso: ${viejos.join(', ')} ya no se usan. Los precios ahora son PEN_PRO_MONTH, USD_PRO_MONTH… (ver deploy/filmspirit.env.ejemplo).`);
  const baseUrl = String(e.BASE_URL || `http://127.0.0.1:${e.PORT || 8080}`).replace(/\/+$/, '');
  const num = (k, d) => e[k] != null && e[k] !== '' && isFinite(+e[k]) ? +e[k] : d;
  return {
    port: +(e.PORT || 8080), host: e.HOST || '127.0.0.1', baseUrl, origin: new URL(baseUrl).origin,
    dataDir: e.DATA_DIR || path.join(__dirname, 'data'), publicDir: e.PUBLIC_DIR || path.join(__dirname, 'public'),
    googleClientId: e.GOOGLE_CLIENT_ID || '', adminEmails: String(e.ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean),
    trustProxy: e.TRUST_PROXY === '1',
    price: { month: num('PEN_PRO_MONTH', 49), year: num('PEN_PRO_YEAR', 490) }, supportEmail: String(e.SUPPORT_EMAIL || '').trim(),
    // precios de los planes (PLANES-Y-PRECIOS.md): soles con IGV en el Perú (Mercado Pago), dólares fuera (Paddle)
    prices: {
      PEN: { indie: { month: num('PEN_INDIE_MONTH', 29), year: num('PEN_INDIE_YEAR', 290) }, pro: { month: num('PEN_PRO_MONTH', 49), year: num('PEN_PRO_YEAR', 490) }, studio: { month: num('PEN_STUDIO_MONTH', 129), year: num('PEN_STUDIO_YEAR', 1290) } },
      USD: { indie: { month: num('USD_INDIE_MONTH', 7.99), year: num('USD_INDIE_YEAR', 79) }, pro: { month: num('USD_PRO_MONTH', 14.99), year: num('USD_PRO_YEAR', 149) }, studio: { month: num('USD_STUDIO_MONTH', 39), year: num('USD_STUDIO_YEAR', 390) } },
    },
    // precio de fundador de Pro: quien se suscribe antes de la fecha paga ese precio mientras siga suscrito
    founder: { until: Date.parse(e.FOUNDER_UNTIL || '2027-02-28T23:59:59-05:00') || 0, PEN: { month: num('FOUNDER_PEN_MONTH', 39), year: num('FOUNDER_PEN_YEAR', 390) }, pct: num('FOUNDER_USD_PCT', 20), code: String(e.FOUNDER_CODE || 'FUNDADOR').toUpperCase() },
    // Studio abre cuando existan el scouting con mapas y el casting; mientras tanto, lista de espera
    studioOpen: e.STUDIO_OPEN === '1',
    business: { name: String(e.BUSINESS_NAME || '').trim(), ruc: String(e.BUSINESS_RUC || '').trim(), address: String(e.BUSINESS_ADDRESS || '').trim(), legalDate: String(e.LEGAL_DATE || '').trim() },
  };
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const GSI = 'https://accounts.google.com/gsi/';
const csp = () => [
  // 'wasm-unsafe-eval': solo WebAssembly (meshoptimizer aligera los modelos 3D importados); eval de JavaScript, no
  "default-src 'self'", `script-src 'self' 'wasm-unsafe-eval' ${GSI}client`, `style-src 'self' 'unsafe-inline' ${GSI}style`,
  "img-src 'self' data: blob: https://*.googleusercontent.com", "media-src 'self' data: blob:", "font-src 'self' data:",
  `connect-src 'self' data: blob: ${GSI}`, `frame-src ${GSI}`, "worker-src 'self' blob:", "object-src 'none'",
  "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'",
].join('; ');

let proxyWarned = false;
function createServer(over) {
  const cfg = config(over);
  if (process.env.NODE_ENV === 'production' && !cfg.trustProxy) console.warn('Aviso: NODE_ENV=production sin TRUST_PROXY=1. Detrás de nginx, ponlo en /etc/filmspirit/filmspirit.env.');
  // las llaves de prueba permiten entrar como cualquiera: nunca en producción ni con una dirección pública en https
  if (process.env.GOOGLE_JWKS_FILE && (process.env.NODE_ENV === 'production' || /^https:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/.test(String((over && over.BASE_URL) || process.env.BASE_URL || '') + '/')))
    throw new Error('GOOGLE_JWKS_FILE es solo para pruebas: quítalo de la configuración.');
  // con https, el navegador recuerda usar siempre https
  if (/^https:/.test(cfg.baseUrl)) SEC_HEADERS['Strict-Transport-Security'] = 'max-age=31536000';
  const S = open(cfg.dataDir);
  const mail = makeMail(cfg);
  const auth = makeAuth(S, cfg);
  const live = makeLive();
  const api = makeApi(S, auth, live, cfg);
  const sec = makeSecurity(S);
  setRateHook(sec.limitHit);
  const billing = makeBilling(S, auth, api, cfg, mail, sec);
  const reclamos = makeReclamos(S, cfg, mail);
  // bloqueos e inicios rechazados, para la pestaña Seguridad del panel
  const admin = makeAdmin(S, auth, billing, cfg, mail, reclamos, live, sec);
  const soles = n => 'S/ ' + (Number.isInteger(n) ? n : n.toFixed(2));
  const pub = path.resolve(cfg.publicDir);
  // versión de la app publicada (la del service worker que arma make.js): las pestañas abiertas desde antes de
  // actualizar la comparan con la suya y se recargan o avisan (inicio.js)
  const appVersion = () => { try { const m = /const V = '([\w-]+)'/.exec(fs.readFileSync(path.join(pub, 'app', 'sw.js'), 'utf8')); return m ? m[1] : ''; } catch (e) { return ''; } };
  const APP_V = appVersion();
  const CSP = csp();
  const PAD = 'https://*.paddle.com https://cdn.paddle.com';
  const PAY_CSP = [`default-src 'self'`, `script-src 'self' ${PAD}`, `style-src 'self' 'unsafe-inline' ${PAD}`, `img-src 'self' data: ${PAD}`, `font-src 'self' data: ${PAD}`,
    `connect-src 'self' ${PAD}`, `frame-src ${PAD}`, "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self' https://*.paddle.com"].join('; ');
  const htmlCache = new Map();
  /* textos comprimidos una vez y guardados en memoria (brotli o gzip, según el navegador) */
  const zCache = new Map();
  const ZTYPES = /^(text\/|application\/(json|javascript|manifest)|image\/svg)/;
  function packed(req, key, mtime, type, getBody) {
    const ae = String(req.headers['accept-encoding'] || '');
    const enc = /\bbr\b/.test(ae) ? 'br' : /\bgzip\b/.test(ae) ? 'gzip' : '';
    if (!enc || !ZTYPES.test(type)) return null;
    const k = key + '|' + enc, c = zCache.get(k);
    if (c && c.m === mtime) return { enc, body: c.body };
    const raw = Buffer.from(getBody());
    if (raw.length < 1024) return null;
    const body = enc === 'br' ? zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } }) : zlib.gzipSync(raw, { level: 9 });
    zCache.set(k, { m: mtime, body });
    return { enc, body };
  }

  /* páginas HTML: se completan con la configuración pública (id de cliente de Google), los precios de la
     región (soles en el Perú, dólares en el resto del mundo) y los textos en el idioma de quien visita */
  /* testimonio de la portada: solo uno y real, escrito por quien administra el servidor en DATA_DIR/testimonio.json
     ({ "text": "…", "name": "…", "role": "…", "photo": "https://…" }); sin el archivo, la sección no aparece */
  let TESTIMONIO = null;
  try { const t = JSON.parse(fs.readFileSync(path.join(cfg.dataDir, 'testimonio.json'), 'utf8')); if (t && typeof t.text === 'string' && t.text.trim() && t.name) TESTIMONIO = { text: t.text.trim().slice(0, 600), name: String(t.name).slice(0, 80), role: t.role ? String(t.role).slice(0, 120) : '', photo: /^(https:\/\/|\/)[^\s"'<>]+$/.test(t.photo || '') ? t.photo : '' }; } catch (e) { }
  const money = (n, cur, lang) => (cur === 'USD' ? 'US$ ' : 'S/ ') + (Number.isInteger(n) ? n.toLocaleString(lang === 'en' ? 'en-US' : 'es-PE') : n.toFixed(2).replace('.', lang === 'en' ? '.' : ','));
  function page(file, ctx = {}) {
    const lang = LANGS.includes(ctx.lang) ? ctx.lang : 'es', region = ctx.region === 'intl' ? 'intl' : 'pe';
    const fnd = Date.now() < cfg.founder.until;
    const st = fs.statSync(file), key = file + '|' + lang + '|' + region + '|' + (fnd ? 'f' : '');
    const c = htmlCache.get(key);
    if (c && c.m === st.mtimeMs) return c.body;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const PR = cfg.prices, cur = region === 'pe' ? 'PEN' : 'USD';
    const vars = {
      GOOGLE_CLIENT_ID: cfg.googleClientId, BASE_URL: cfg.baseUrl, LANG: lang, REGION: region,
      PADDLE_CLIENT_TOKEN: process.env.PADDLE_CLIENT_TOKEN || '', PADDLE_ENV: process.env.PADDLE_ENV === 'sandbox' ? 'sandbox' : 'production',
      PRECIO_MES: soles(cfg.price.month), PRECIO_MES_NOTA: 'al mes',
      PRECIO_ANUAL: `O ${soles(cfg.price.year)} al año${cfg.price.year < cfg.price.month * 12 ? `: ${Math.round(12 - cfg.price.year / cfg.price.month)} meses de regalo` : ''}.`,
      PE_PRO_M: money(PR.PEN.pro.month, 'PEN', lang), PE_PRO_Y: money(PR.PEN.pro.year, 'PEN', lang), PE_ST_M: money(PR.PEN.studio.month, 'PEN', lang), PE_ST_Y: money(PR.PEN.studio.year, 'PEN', lang),
      US_PRO_M: money(PR.USD.pro.month, 'USD', lang), US_PRO_Y: money(PR.USD.pro.year, 'USD', lang), US_ST_M: money(PR.USD.studio.month, 'USD', lang), US_ST_Y: money(PR.USD.studio.year, 'USD', lang),
      P_FREE: money(0, cur, lang), P_PRO_M: money(PR[cur].pro.month, cur, lang), P_PRO_Y: money(PR[cur].pro.year, cur, lang), P_ST_M: money(PR[cur].studio.month, cur, lang), P_ST_Y: money(PR[cur].studio.year, cur, lang),
      P_IN_M: money(PR[cur].indie.month, cur, lang), P_IN_Y: money(PR[cur].indie.year, cur, lang),
      PE_IN_M: money(PR.PEN.indie.month, 'PEN', lang), PE_IN_Y: money(PR.PEN.indie.year, 'PEN', lang), US_IN_M: money(PR.USD.indie.month, 'USD', lang), US_IN_Y: money(PR.USD.indie.year, 'USD', lang),
      // precio de fundador: Pro en soles con precio propio; fuera del Perú, un código de descuento recurrente
      FOUNDER: fnd ? '1' : '', FOUNDER_PE_M: money(cfg.founder.PEN.month, 'PEN', lang), FOUNDER_PE_Y: money(cfg.founder.PEN.year, 'PEN', lang),
      FOUNDER_PCT: String(cfg.founder.pct), FOUNDER_CODE: cfg.founder.code,
      FOUNDER_HASTA: cfg.founder.until ? new Date(cfg.founder.until).toLocaleDateString(lang === 'en' ? 'en-US' : lang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' }) : '',
      STUDIO_OPEN: cfg.studioOpen ? '1' : '',
      CONTACTO: cfg.supportEmail || '—',
      EMPRESA_PIE: cfg.business.name || 'FilmSpirit',   // el pie de la portada: la razón social, si está configurada
      EMPRESA: cfg.business.name || '[razón social]', RUC: cfg.business.ruc || '[RUC]', DOMICILIO: cfg.business.address || '[domicilio fiscal]',
      FECHA_LEGAL: cfg.business.legalDate || '[fecha]',
    };
    const raw = {
      TESTIMONIO: TESTIMONIO ? `<section class="quote"><div class="wrap"><blockquote><p>${esc(TESTIMONIO.text)}</p><footer>${TESTIMONIO.photo ? `<img src="${esc(TESTIMONIO.photo)}" alt="" width="56" height="56" loading="lazy">` : ''}<div><b>${esc(TESTIMONIO.name || '')}</b>${TESTIMONIO.role ? `<span>${esc(TESTIMONIO.role)}</span>` : ''}</div></footer></blockquote></div></section>` : '',
      HREFLANG: LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${esc(cfg.baseUrl)}/?lang=${l}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${esc(cfg.baseUrl)}/">`,
      LANG_LINKS: LANGS.map(l => `<a href="?lang=${l}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${LANG_NAMES[l]}</a>`).join(''),
    };
    const T = I18N[lang] || {}, E = I18N.es || {};
    // primero los textos (que pueden llevar precios y fechas: __FOUNDER_PE_M__…) y después los valores
    const body = fs.readFileSync(file, 'utf8')
      .replace(/\{\{([th])\.(\w+)\}\}/g, (m, kind, k) => { const v = T[k] != null ? T[k] : E[k]; return v == null ? m : kind === 'h' ? v : esc(v); })
      .replace(/__([A-Z_]+)__/g, (m, k) => k in raw ? raw[k] : k in vars ? esc(vars[k]) : m);
    htmlCache.set(key, { m: st.mtimeMs, body });
    return body;
  }
  /* idioma y región de quien visita (?lang= queda recordado en una cookie) */
  function visitor(req, res) {
    const url = req.fsUrl || new URL(req.url, cfg.baseUrl);
    const g = countryOf(req, ''), lang = langOf(req, url, g.country);
    const q = url.searchParams.get('lang');
    if (q && LANGS.includes(q) && res) addCookie(res, cookie('fs_lang', q, { maxAge: 365 * 86400, httpOnly: false, secure: /^https:/.test(cfg.baseUrl) }));
    return { lang, region: regionOf(g.country) };
  }
  function serveFile(req, res, rel, csp) {
    let file = path.resolve(pub, '.' + rel);
    if (file !== pub && !file.startsWith(pub + path.sep)) return notFound(res);
    let st;
    try { st = fs.statSync(file); if (st.isDirectory()) { file = path.join(file, 'index.html'); st = fs.statSync(file); } }
    catch (e) { return notFound(res); }
    const ext = path.extname(file).toLowerCase(), type = TYPES[ext] || 'application/octet-stream';
    const headers = { ...SEC_HEADERS, 'Content-Type': type };
    headers.Vary = 'Accept-Encoding';
    if (ext === '.html') {
      const v = visitor(req, res), body = page(file, v), z = packed(req, file + '|' + v.lang + '|' + v.region + '|' + (Date.now() < cfg.founder.until ? 'f' : ''), st.mtimeMs, type, () => body);
      headers.Vary = 'Accept-Encoding, Accept-Language, Cookie';
      res.writeHead(200, { ...headers, 'Content-Security-Policy': csp || CSP, 'Cache-Control': 'no-cache', ...(z ? { 'Content-Encoding': z.enc } : {}) });
      return res.end(req.method === 'HEAD' ? undefined : z ? z.body : body);
    }
    const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
    // librerías, fuentes y maniquíes cambian poco; el código de la app se revalida siempre
    headers['Cache-Control'] = /\/(lib|fonts|fig|marca)\//.test(rel) ? 'public, max-age=604800' : /^\/portada\//.test(rel) ? 'public, max-age=86400' : 'no-cache';
    if (rel === '/app/sw.js') headers['Service-Worker-Allowed'] = '/app/';
    headers.ETag = etag;
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
    const z = st.size < 20 * 1048576 ? packed(req, file, st.mtimeMs, type, () => fs.readFileSync(file)) : null;
    if (z) { res.writeHead(200, { ...headers, 'Content-Encoding': z.enc, 'Content-Length': z.body.length }); return res.end(req.method === 'HEAD' ? undefined : z.body); }
    // videos de la portada: por partes (Safari y los teléfonos piden rangos para reproducir)
    headers['Accept-Ranges'] = 'bytes';
    const rg = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
    if (rg && (rg[1] || rg[2])) {
      let a = rg[1] ? +rg[1] : Math.max(0, st.size - +rg[2]), b = rg[1] && rg[2] ? Math.min(+rg[2], st.size - 1) : st.size - 1;
      if (a >= st.size || a > b) { res.writeHead(416, { ...headers, 'Content-Range': `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(file, { start: a, end: b }).pipe(res);
    }
    headers['Content-Length'] = st.size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  }
  function notFound(res) {
    const f = path.join(pub, '404.html');
    if (fs.existsSync(f)) { res.writeHead(404, { ...SEC_HEADERS, 'Content-Type': TYPES['.html'], 'Content-Security-Policy': CSP }); return res.end(page(f, {})); }
    sendText(res, 404, 'No encontrado');
  }

  async function handle(req, res) {
    // detrás de nginx la IP real viene solo en X-Real-IP (la pone nginx): X-Forwarded-For lo puede escribir cualquiera
    req.ip = (cfg.trustProxy && String(req.headers['x-real-ip'] || '').trim()) || req.socket.remoteAddress || '';
    // detrás de nginx sin TRUST_PROXY=1 todos parecen venir de la misma IP y los límites por IP serían de todos
    if (!cfg.trustProxy && !proxyWarned && (req.headers['x-real-ip'] || req.headers['x-forwarded-for'])) { proxyWarned = true; console.warn('Aviso: llegan cabeceras de un proxy (X-Real-IP / X-Forwarded-For) pero falta TRUST_PROXY=1 en la configuración: los límites por IP cuentan a todos como una sola persona.'); }
    const url = new URL(req.url, cfg.baseUrl);
    req.fsUrl = url;
    const p = url.pathname;
    // una sola dirección: quien entra por www (o sin www, si la dirección oficial lo lleva) pasa a la de BASE_URL.
    // Si no, el navegador queda en otro origen: el servidor rechaza el inicio de sesión con Google y la sesión no se comparte
    const host = String(req.headers.host || '').toLowerCase(), canon = url.host.toLowerCase();
    if (host && host !== canon && (host === 'www.' + canon || 'www.' + host === canon)) {
      res.writeHead(req.method === 'GET' || req.method === 'HEAD' ? 301 : 307, { ...SEC_HEADERS, Location: cfg.baseUrl + req.url, 'Cache-Control': 'no-store' });
      return res.end();
    }
    // marca de este navegador (para que el mes gratis no se repita desde el mismo equipo con otra cuenta). Se pone
    // solo al entrar con Google, que es cuando se anota (billing.onLogin): quien solo mira la portada no la recibe
    let dev = parseCookies(req).fs_dev;
    if (!dev || !/^[\w-]{16,40}$/.test(dev)) {
      dev = rid(16);
      if (p === '/api/auth/google') addCookie(res, cookie('fs_dev', dev, { maxAge: 2 * 365 * 86400, secure: /^https:/.test(cfg.baseUrl) }));
    }
    if (p.startsWith('/api/')) {
      if (APP_V) res.setHeader('X-FS-App', APP_V);
      if (p === '/api/auth/google' && req.method === 'POST') {
        auth.checkWrite(req);
        rateLimit('auth:' + req.ip, 30, 600e3);
        const b = await readJSON(req, 16 * 1024);
        let got;
        try { got = await auth.loginGoogle(b.credential); }
        catch (e) { if (e instanceof HttpError) sec.loginFail(e.code, req.ip); throw e; }
        const { u, isNew } = got;
        billing.onLogin(u, req, { isNew, ref: b.ref, dev, tz: typeof b.tz === 'string' ? b.tz.slice(0, 60) : '' });
        auth.startSession(res, u, req);
        return sendJSON(res, 200, { ok: true, me: auth.userJSON(S.one('SELECT * FROM users WHERE id=?', u.id)), isNew });
      }
      if (p === '/api/auth/logout' && req.method === 'POST') {
        auth.checkWrite(req);
        const sh = auth.endSession(req, res);
        if (sh) live.closeWhere(c => c.sh === sh);   // las pestañas en vivo de esa sesión dejan de recibir avisos
        return sendJSON(res, 200, { ok: true });
      }
      // cerrar la sesión en todos los navegadores (por ejemplo, después de usar un equipo ajeno)
      if (p === '/api/auth/logout-all' && req.method === 'POST') {
        auth.checkWrite(req);
        const u = auth.requireUser(req);
        auth.endAll(u.id); auth.endSession(req, res);
        live.closeWhere(c => c.uid === u.id);
        return sendJSON(res, 200, { ok: true });
      }
      if (p === '/api/me' && req.method === 'GET') return sendJSON(res, 200, auth.userJSON(auth.requireUser(req)));
      // eliminar la cuenta: se confirma escribiendo el correo. Cancela las suscripciones y borra los proyectos propios
      if (p === '/api/me/delete' && req.method === 'POST') {
        auth.checkWrite(req);
        const u = auth.requireUser(req);
        rateLimit('del:' + u.id, 5, 3600e3);
        const b = await readJSON(req, 2048);
        if (normEmail(b.confirm) !== u.email) return sendJSON(res, 400, { error: 'Escribe el correo de tu cuenta para confirmar.', code: 'bad_confirm' });
        const own = S.all('SELECT id FROM projects WHERE owner=?', u.id).map(x => x.id);
        await billing.closeAccount(u.id);
        auth.deleteAccount(u);
        for (const pid of own) live.closeAll(pid, { t: 'deleted' });
        live.closeWhere(c => c.uid === u.id);
        auth.endSession(req, res);
        return sendJSON(res, 200, { ok: true, projects: own.length });
      }
      // el idioma del programa de la persona (español o inglés): se recuerda en la cuenta y en la cookie de la portada
      if (p === '/api/me/lang' && req.method === 'PUT') {
        const u = auth.requireUser(req);
        auth.checkWrite(req);
        rateLimit('lang:' + u.id, 30, 600e3);
        const b = await readJSON(req, 256), lang = b && (b.lang === 'en' || b.lang === 'es') ? b.lang : null;
        if (!lang) return sendJSON(res, 400, { error: 'Idioma no válido.', code: 'bad_lang' });
        S.run('UPDATE users SET lang=? WHERE id=?', lang, u.id);
        addCookie(res, cookie('fs_lang', lang, { maxAge: 365 * 86400, httpOnly: false, secure: /^https:/.test(cfg.baseUrl) }));
        return sendJSON(res, 200, { lang });
      }
      // los temas de colores de la persona (lib/temas.js)
      if (p === '/api/me/themes' && (req.method === 'GET' || req.method === 'PUT')) {
        const u = auth.requireUser(req);
        if (req.method === 'GET') return sendJSON(res, 200, { themes: temas.themesOf(u) });
        auth.checkWrite(req);
        rateLimit('themes:' + u.id, 120, 600e3);
        const b = await readJSON(req, 96 * 1024);
        const list = temas.cleanThemes(b && b.themes);
        S.run('UPDATE users SET themes=? WHERE id=?', JSON.stringify(list), u.id);
        return sendJSON(res, 200, { themes: list });
      }
      if (p === '/api/config' && req.method === 'GET') return sendJSON(res, 200, { googleClientId: cfg.googleClientId, supportEmail: cfg.supportEmail || '' });
      // lista de espera de Studio (abre cuando existan el scouting con mapas y el casting): con o sin cuenta
      if (p === '/api/waitlist' && req.method === 'POST') {
        auth.checkWrite(req);
        rateLimit('wl:' + req.ip, 10, 3600e3);
        const b = await readJSON(req, 2048), me = auth.current(req);
        const email = normEmail(me ? me.email : b.email), plan = b.plan === 'studio' ? 'studio' : '';
        if (!plan) return sendJSON(res, 400, { error: 'Plan desconocido.', code: 'bad_plan' });
        if (!isEmail(email)) return sendJSON(res, 400, { error: 'Escribe un correo válido.', code: 'bad_email' });
        // tope diario de correos nuevos (el formulario es público: que no se pueda llenar la lista con correos inventados)
        if (!S.one('SELECT 1 x FROM waitlist WHERE email=? AND plan=?', email, plan) && S.one('SELECT COUNT(*) n FROM waitlist WHERE ts>?', Date.now() - 864e5).n >= Math.max(1, +(process.env.ESPERA_DIA || 500)))
          return sendJSON(res, 429, { error: 'Hoy ya se anotaron muchas personas. Inténtalo mañana.', code: 'rate_limited' });
        const lang = LANGS.includes(b.lang) ? b.lang : 'es', g = countryOf(req, typeof b.tz === 'string' ? b.tz.slice(0, 60) : '');
        S.run('INSERT INTO waitlist(email,plan,uid,lang,country,ts) VALUES(?,?,?,?,?,?) ON CONFLICT(email,plan) DO UPDATE SET uid=COALESCE(excluded.uid, uid)', email, plan, me ? me.id : null, lang, g.country || '', Date.now());
        return sendJSON(res, 200, { ok: true });
      }
      if (await billing.handle(req, res, url, dev)) return;
      if (await admin.handle(req, res, url)) return;
      if (await reclamos.handle(req, res, url)) return;
      if (await api.handle(req, res, url)) return;
      return sendJSON(res, 404, { error: 'No encontrado', code: 'not_found' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Método no permitido');
    if (p === '/healthz') return sendText(res, 200, 'ok');
    // la app pide sesión; sin ella, a la portada para entrar con Google
    if (p === '/app') return redirect(res, '/app/' + url.search);
    const toApp = () => auth.current(req) ? serveFile(req, res, '/app/index.html') : redirect(res, '/entrar?next=' + encodeURIComponent('/app/' + url.search));
    const toAdmin = () => {
      const u = auth.current(req);
      if (!u) return redirect(res, '/entrar?next=' + encodeURIComponent('/admin'));
      if (!admin.isAdmin(u)) return notFound(res);
      // la sesión empezó hace más de 12 horas: se vuelve a entrar con Google
      if (!admin.fresh(req)) return redirect(res, '/entrar?next=' + encodeURIComponent('/admin') + '&reauth=1');
      return serveFile(req, res, '/admin.html');
    };
    if (p === '/app/' || p === '/app/index.html') return toApp();
    if (p === '/entrar') return serveFile(req, res, '/entrar.html');
    // página de pago de Paddle (enlace de pago predeterminado de la cuenta): Paddle.js abre el pago de la transacción
    if (p === '/pagar') return serveFile(req, res, '/pagar.html', PAY_CSP);
    if (p === '/admin' || p === '/admin/') return toAdmin();
    // enlaces de influencers: /r/CODIGO deja el código de descuento guardado para cuando se suscriba
    { const r = /^\/r\/([\w-]{3,40})\/?$/.exec(p); if (r) return redirect(res, '/?ref=' + encodeURIComponent(r[1].toUpperCase())); }
    if (/^\/(privacidad|terminos|reclamaciones|reembolsos)$/.test(p)) return serveFile(req, res, p + '.html');
    // el resto, archivos: se decodifica antes de revisar (antes /%61dmin.html o /app/%69ndex.html se servían sin
    // sesión) y las páginas con permiso se reconocen por el archivo real, escriba como se escriba la dirección
    let dp;
    try { dp = decodeURIComponent(p); } catch (e) { return notFound(res); }
    if (dp.includes('\0') || dp.split(/[\\/]/).includes('..')) return notFound(res);
    const real = path.resolve(pub, '.' + dp);
    if (real === path.join(pub, 'app') || real === path.join(pub, 'app', 'index.html')) return toApp();
    if (real === path.join(pub, 'admin.html')) return toAdmin();
    return serveFile(req, res, dp);
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch(e => {
      if (res.headersSent) { try { res.end(); } catch (e2) { } return; }
      if (e instanceof HttpError) return sendJSON(res, e.status, { error: e.message, code: e.code, ...(e.extra || {}) });
      const ref = crypto.randomBytes(4).toString('hex');
      console.error(`[${ref}] ${req.method} ${req.url}:`, e && e.stack || e);
      sendJSON(res, 500, { error: `Algo falló en el servidor (ref. ${ref}). Inténtalo de nuevo.`, code: 'server_error' });
    });
  });
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 70000;
  server.requestTimeout = 120000;
  server.on('close', () => { sec.flush(); sec.stop(); S.close(); });
  return { server, cfg, S, live, billing, api, sec };
}

if (require.main === module) {
  const { server, cfg, billing } = createServer();
  billing.start();
  if (!cfg.googleClientId) console.warn('Aviso: falta GOOGLE_CLIENT_ID; nadie podrá entrar con Google.');
  server.listen(cfg.port, cfg.host, () => console.log(`FilmSpirit escuchando en http://${cfg.host}:${cfg.port} (${cfg.baseUrl})`));
  const stop = () => { console.log('Cerrando…'); server.close(() => process.exit(0)); server.closeAllConnections(); setTimeout(() => process.exit(0), 4000).unref(); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}

module.exports = { createServer, config };
