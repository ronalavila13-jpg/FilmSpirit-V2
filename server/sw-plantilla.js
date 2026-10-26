/* ============================================================
   FilmSpirit · trabajo sin conexión (service worker de /app/)
   Lo genera «node server/make.js» con la lista de archivos y su versión.
   · La app (página, código, librerías, fuentes y maniquíes) queda guardada en el
     navegador: si no hay internet, se abre desde aquí.
   · Los datos de los proyectos (/api/) no pasan por aquí: la app guarda su propia
     copia en el equipo y envía los cambios al volver la conexión.
   ============================================================ */
'use strict';
const V = '__VERSION__';
const CACHE = 'fs-app-' + V;
const CORE = __CORE__;
const HEAVY = /^\/app\/(lib|fonts|fig)\//;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(CORE.map(async u => {
      try {
        const r = await fetch(u, { cache: 'reload', credentials: 'same-origin', redirect: 'follow' });
        if (r.ok && !r.redirected) await c.put(u, r);
      } catch (er) { /* sin red: se guardará la próxima vez */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('fs-app-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

/* espera la red un tiempo prudente; si no responde, usa la copia guardada */
const timeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then(v => { clearTimeout(t); res(v); }, er => { clearTimeout(t); rej(er); }); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // lo de otros sitios (las teselas del mapa de OpenStreetMap) va directo a la red: no se guarda aquí
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  const nav = req.mode === 'navigate';
  if (nav ? !(url.pathname === '/app' || url.pathname.startsWith('/app/')) : !(url.pathname.startsWith('/app/') || url.pathname === '/favicon.svg')) return;
  const key = nav ? '/app/' : url.pathname;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    // librerías, fuentes y maniquíes: primero la copia (cambian solo con una versión nueva)
    if (HEAVY.test(url.pathname)) { const hit = await c.match(key); if (hit) return hit; }
    try {
      const r = await timeout(fetch(req), nav ? 6000 : 15000);
      if (r.ok && !r.redirected && r.type === 'basic') c.put(key, r.clone()).catch(() => { });
      return r;
    } catch (er) {
      const hit = await c.match(key);
      if (hit) return hit;
      throw er;
    }
  })());
});
