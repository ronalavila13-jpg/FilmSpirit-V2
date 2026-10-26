/* ============================================================
   Enlaces cortos de Google Maps (lote W · mapa general del scouting)
   maps.app.goo.gl/… y goo.gl/maps/… no traen las coordenadas: el servidor sigue sus redirecciones y devuelve la
   dirección larga (la app saca de ahí la latitud y la longitud). Solo esos hosts, solo https, a lo más 5 saltos y
   solo hacia hosts de Google Maps; tiempo límite corto; lo resuelto se recuerda un día (en memoria).
   ============================================================ */
'use strict';
const MAX_HOPS = 5, HOP_MS = 4000, TOTAL_MS = 9000, CACHE_MAX = 1000, CACHE_MS = 864e5;
const SHORT = u => (u.hostname === 'maps.app.goo.gl' && /^\/[\w-]{2,80}$/.test(u.pathname)) || (u.hostname === 'goo.gl' && /^\/maps\/[\w-]{2,80}$/.test(u.pathname));
// los hosts de Google a los que puede llevar el enlace: google.com, google.com.pe, maps.google.co.uk…
const GOOGLE = h => /^(?:(?:www|maps)\.)?google\.(?:com|[a-z]{2}|com?\.[a-z]{2})$/.test(h);
const isMapsUrl = u => GOOGLE(u.hostname) && (u.hostname.startsWith('maps.') || u.pathname === '/maps' || u.pathname.startsWith('/maps/') || u.pathname === '/');
function parse(s) { try { const u = new URL(String(s || '').trim()); return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') ? u : null; } catch (e) { return null; } }
/* el enlace corto tal como se pide (https, sin #) o null si no es uno de Google Maps */
function shortOf(s) {
  let t = String(s || '').trim();
  if (!t || t.length > 300) return null;
  if (!/^https?:\/\//i.test(t)) t = 'https://' + t;
  t = t.replace(/^http:/i, 'https:');
  const u = parse(t);
  if (!u || !SHORT(u)) return null;
  u.hash = '';
  return u.href;
}

function makeMapas(opts = {}) {
  const cache = new Map();
  const api = { fetch: opts.fetch || ((...a) => fetch(...a)), userAgent: opts.userAgent || 'FilmSpirit (resuelve enlaces cortos de Google Maps)' };
  async function resolve(input) {
    const start = shortOf(input);
    if (!start) { const e = new Error('Ese enlace no es un enlace corto de Google Maps.'); e.code = 'bad_url'; throw e; }
    const hit = cache.get(start);
    if (hit && Date.now() - hit.t < CACHE_MS) return hit.url;
    const t0 = Date.now();
    let cur = start;
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const left = TOTAL_MS - (Date.now() - t0);
      if (left <= 0) break;
      let r;
      try { r = await api.fetch(cur, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(Math.min(HOP_MS, left)), headers: { 'User-Agent': api.userAgent, Accept: 'text/html' } }); }
      catch (e) { const er = new Error('No se pudo leer ese enlace. Inténtalo más tarde.'); er.code = 'resolve_failed'; throw er; }
      try { if (r.body && r.body.cancel) r.body.cancel().catch(() => { }); } catch (e) { }
      const loc = r.status >= 300 && r.status < 400 && r.headers.get('location');
      if (!loc) break;
      let next;
      try { next = parse(new URL(loc, cur).href); } catch (e) { next = null; }
      if (!next) break;
      // Google en Europa pasa por la página de consentimiento: el destino va en «continue»
      if (next.hostname === 'consent.google.com' && next.searchParams.get('continue')) { const c = parse(next.searchParams.get('continue')); if (c) next = c; else break; }
      if (SHORT(next)) { cur = next.href; continue; }
      if (!isMapsUrl(next)) break;
      const url = next.href.slice(0, 4000);
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
      cache.set(start, { url, t: Date.now() });
      return url;
    }
    const e = new Error('Ese enlace no lleva a un lugar de Google Maps.'); e.code = 'no_place'; throw e;
  }
  api.resolve = resolve;
  api.clear = () => cache.clear();
  return api;
}

module.exports = { makeMapas, shortOf };
