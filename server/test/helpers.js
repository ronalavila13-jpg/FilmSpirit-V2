'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeKeys, mint } = require('../tools/token-prueba');

async function start(extra = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-srv-'));
  const keys = makeKeys(path.join(tmp, 'keys'));
  process.env.GOOGLE_JWKS_FILE = path.join(keys.dir, 'jwks.json');
  const { createServer } = require('../server');
  const pub = path.join(tmp, 'public');
  fs.mkdirSync(path.join(pub, 'app'), { recursive: true });
  fs.writeFileSync(path.join(pub, 'index.html'), '<h1>portada __GOOGLE_CLIENT_ID__</h1>');
  fs.writeFileSync(path.join(pub, 'entrar.html'), '<h1>entrar</h1>');
  fs.writeFileSync(path.join(pub, 'app', 'index.html'), '<h1>app</h1>');
  fs.writeFileSync(path.join(pub, 'app', 'app.js'), 'console.log(1)');
  const s = createServer({ DATA_DIR: path.join(tmp, 'data'), PUBLIC_DIR: pub, GOOGLE_CLIENT_ID: 'cliente-de-prueba', BASE_URL: 'http://127.0.0.1:1', ...extra });
  await new Promise(r => s.server.listen(0, '127.0.0.1', r));
  const port = s.server.address().port;
  s.cfg.baseUrl = `http://127.0.0.1:${port}`; s.cfg.origin = s.cfg.baseUrl;
  const base = s.cfg.baseUrl;
  const stop = () => new Promise(r => { s.server.closeAllConnections(); s.server.close(r); });
  return { ...s, base, keys, tmp, stop, token: (email, name, more) => mint(keys.dir, { email, name: name || email.split('@')[0], ...(more || {}) }) };
}

/* un navegador mínimo: guarda la cookie de sesión y envía la cabecera X-FS */
function client(base, jar0) {
  const jar = { ...(jar0 || {}) };
  const cookieStr = () => Object.entries(jar).filter(([, v]) => v).map(([k, v]) => k + '=' + v).join('; ');
  async function req(method, p, body, headers = {}) {
    const h = { ...headers };
    if (cookieStr()) h.Cookie = cookieStr();
    if (method !== 'GET' && !('X-FS' in h)) h['X-FS'] = '1';
    if (body !== undefined) h['Content-Type'] = 'application/json';
    const r = await fetch(base + p, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    for (const sc of r.headers.getSetCookie()) { const m = /^([\w-]+)=([^;]*)/.exec(sc); if (m) jar[m[1]] = m[2]; }
    const txt = await r.text();
    let json = null; try { json = JSON.parse(txt); } catch (e) { }
    return { status: r.status, json, text: txt, headers: r.headers };
  }
  return {
    req, jar, get cookie() { return jar.fs_s ? 'fs_s=' + jar.fs_s : ''; },
    get: p => req('GET', p), post: (p, b) => req('POST', p, b ?? {}), put: (p, b) => req('PUT', p, b ?? {}), del: p => req('DELETE', p, {}),
  };
}

/* escucha los eventos en vivo de un proyecto */
function listen(base, cookie, pid) {
  const events = [];
  const ac = new AbortController();
  const done = (async () => {
    try {
      const r = await fetch(`${base}/api/p/${pid}/events?c=prueba`, { headers: { Cookie: cookie }, signal: ac.signal });
      events.status = r.status;
      const rd = r.body.getReader(); let buf = '';
      for (; ;) {
        const { value, done } = await rd.read();
        if (done) break;
        buf += Buffer.from(value).toString('utf8');
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          const d = chunk.split('\n').filter(l => l.startsWith('data: ')).map(l => l.slice(6)).join('\n');
          if (d) events.push(JSON.parse(d));
        }
      }
    } catch (e) { }
    events.closed = true;
  })();
  const wait = async (pred, ms = 3000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { const e = events.find(pred); if (e) return e; await new Promise(r => setTimeout(r, 20)); }
    return null;
  };
  return { events, wait, stop: () => { ac.abort(); return done; } };
}

module.exports = { start, client, listen };
