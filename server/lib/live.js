/* ============================================================
   Cambios en vivo (Server-Sent Events)
   Cada pestaña del navegador abre /api/p/<id>/events y recibe avisos
   pequeños: «la sección X va en la versión N», «cambió una imagen»,
   «cambió el equipo». El contenido se pide aparte, con sus permisos.
   Presencia: quién tiene abierto el proyecto y en qué pestaña está
   ({ t: 'who', list }), a todas las conexiones del proyecto.
   ============================================================ */
'use strict';
const { SEC_HEADERS } = require('./util');

function makeLive() {
  const hub = new Map();     // pid -> Set(conexión)
  const send = (c, obj) => { try { c.res.write(`data: ${JSON.stringify(obj)}\n\n`); } catch (e) { } };
  /* presencia: una entrada por pestaña del navegador (client), la más reciente si hay dos con el mismo id */
  const TAB_RE = /^[a-z]{2,12}$/;
  const who = pid => {
    const m = new Map();
    for (const c of hub.get(pid) || []) { const k = c.client || c.uid; const o = m.get(k); if (!o || c.at > o.at) m.set(k, c); }
    return [...m.values()].map(c => ({ c: c.client || '', uid: c.uid, name: c.name || '', pic: c.pic || '', tab: c.tab || '', ...(c.away ? { away: 1 } : {}) }));
  };
  const whoT = new Map();   // pid -> temporizador (varios cambios seguidos salen en un solo aviso)
  function whoSoon(pid) {
    if (whoT.has(pid)) return;
    whoT.set(pid, setTimeout(() => { whoT.delete(pid); const list = who(pid); for (const c of hub.get(pid) || []) send(c, { t: 'who', list }); }, 250));
  }
  function open(req, res, pid, info, hello) {
    res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 3000\n\n');
    const c = { res, pid, ...info, tab: TAB_RE.test(info.tab || '') ? info.tab : '', at: Date.now() };
    if (!hub.has(pid)) hub.set(pid, new Set());
    hub.get(pid).add(c);
    send(c, { ...hello, who: who(pid) });
    whoSoon(pid);
    let gone = false;
    const bye = () => { if (gone) return; gone = true; const s = hub.get(pid); if (s) { s.delete(c); if (!s.size) hub.delete(pid); else whoSoon(pid); } };
    req.on('close', bye); res.on('error', bye);
    return c;
  }
  function broadcast(pid, obj, filter) {
    for (const c of hub.get(pid) || []) if (!filter || filter(c)) send(c, obj);
  }
  /* el equipo cambió: cada conexión se vuelve a evaluar; quien perdió el acceso queda fuera */
  function teamChanged(pid, evaluate) {
    for (const c of [...(hub.get(pid) || [])]) {
      const info = evaluate(c);
      if (!info) { send(c, { t: 'revoked' }); try { c.res.end(); } catch (e) { } hub.get(pid) && hub.get(pid).delete(c); continue; }
      Object.assign(c, info);
      send(c, { t: 'team' });
    }
  }
  function closeAll(pid, obj) {
    for (const c of [...(hub.get(pid) || [])]) { send(c, obj); try { c.res.end(); } catch (e) { } }
    hub.delete(pid);
  }
  /* cierra las conexiones que cumplen la condición (sesión cerrada, cuenta suspendida) */
  function closeWhere(fn) {
    for (const [pid, s] of hub) for (const c of [...s]) if (fn(c)) { send(c, { t: 'revoked' }); try { c.res.end(); } catch (e) { } s.delete(c); if (!s.size) hub.delete(pid); }
  }
  /* la pestaña del programa en que está cada quien (la avisa el navegador al cambiar de pestaña) y si la tiene
     a la vista o en segundo plano hace rato («away») */
  function here(pid, uid, client, tab, away) {
    if (!TAB_RE.test(tab || '')) return false;
    let hit = false;
    for (const c of hub.get(pid) || []) if (c.uid === uid && c.client === client && (c.tab !== tab || !!c.away !== !!away)) { c.tab = tab; c.away = !!away; c.at = Date.now(); hit = true; }
    if (hit) whoSoon(pid);
    return hit;
  }
  const count = uid => { let n = 0; for (const s of hub.values()) for (const c of s) if (c.uid === uid) n++; return n; };
  // latido: mantiene la conexión abierta a través de nginx y de las redes móviles
  setInterval(() => { for (const s of hub.values()) for (const c of s) { try { c.res.write(': ·\n\n'); } catch (e) { } } }, 25000).unref();
  return { open, broadcast, teamChanged, closeAll, closeWhere, here, who, count, size: () => [...hub.values()].reduce((n, s) => n + s.size, 0) };
}

module.exports = { makeLive };
