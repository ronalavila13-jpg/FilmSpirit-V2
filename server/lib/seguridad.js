/* ============================================================
   Contadores de seguridad para el panel (pestaña «Seguridad»)
   · bloqueos por los límites de frecuencia de la app (429), por tipo de límite
   · inicios de sesión rechazados (token de Google inválido o vencido, cuenta suspendida)
   Se cuentan en memoria y cada hora queda una fila en la bitácora (audit, acción «sec:hora») con lo que hubo, así
   que el resumen de las últimas 24 horas sobrevive a un reinicio
   · avisos de pago con firma falsa, por medio de pago (billing.js llama a sigFail)
   ============================================================ */
'use strict';
const HOUR = 3600e3, DAY = 864e5;
const TOP = 10;   // claves (IP o cuenta) que más chocaron con un límite

function makeSecurity(S) {
  const fresh = () => ({ t0: Date.now(), limits: {}, logins: {}, sigs: {}, keys: new Map() });
  let cur = fresh();
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
  const addKey = k => { if (cur.keys.size < 2000 || cur.keys.has(k)) cur.keys.set(k, (cur.keys.get(k) || 0) + 1); };
  /* key: la clave del límite («auth:1.2.3.4», «w:u123»…); su primera parte es el tipo de límite */
  function limitHit(key) {
    const i = key.indexOf(':');
    bump(cur.limits, i > 0 ? key.slice(0, i) : key);
    addKey(key);
  }
  function loginFail(code, ip) { bump(cur.logins, code || 'otro'); if (ip) addKey('login:' + ip); }
  function sigFail(prov, ip) { bump(cur.sigs, prov); if (ip) addKey('sig:' + ip); }
  const snap = c => ({ from: c.t0, to: Date.now(), limits: { ...c.limits }, logins: { ...c.logins }, sigs: { ...c.sigs },
    top: [...c.keys].sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([k, n]) => [k, n]) });
  const empty = c => !Object.keys(c.limits).length && !Object.keys(c.logins).length && !Object.keys(c.sigs).length;
  function flush() {
    if (!empty(cur)) { try { S.run('INSERT INTO audit(ts,uid,action,detail) VALUES(?,?,?,?)', Date.now(), null, 'sec:hora', JSON.stringify(snap(cur)).slice(0, 4000)); } catch (e) { } }
    cur = fresh();
  }
  const timer = setInterval(flush, HOUR); timer.unref();
  /* las últimas 24 horas: lo anotado en la bitácora más lo de la hora en curso */
  function summary() {
    const since = Date.now() - DAY, limits = {}, logins = {}, sigs = {}, top = new Map(), hours = [];
    const add = d => {
      for (const [k, n] of Object.entries(d.limits || {})) limits[k] = (limits[k] || 0) + n;
      for (const [k, n] of Object.entries(d.logins || {})) logins[k] = (logins[k] || 0) + n;
      for (const [k, n] of Object.entries(d.sigs || {})) sigs[k] = (sigs[k] || 0) + n;
      for (const [k, n] of d.top || []) top.set(k, (top.get(k) || 0) + n);
      const tot = Object.values(d.limits || {}).reduce((a, b) => a + b, 0) + Object.values(d.logins || {}).reduce((a, b) => a + b, 0);
      if (tot) hours.push({ from: d.from, to: d.to, n: tot });
    };
    for (const r of S.all("SELECT detail FROM audit WHERE action='sec:hora' AND ts>? ORDER BY ts", since)) { try { add(JSON.parse(r.detail)); } catch (e) { } }
    if (!empty(cur)) add(snap(cur));
    // las filas «<pago>_bad_signature» de versiones anteriores (antes las anotaba billing.js aparte)
    for (const r of S.all("SELECT action, detail FROM audit WHERE action LIKE '%\\_bad\\_signature' ESCAPE '\\' AND ts>?", since)) {
      let n = 1; try { n = JSON.parse(r.detail).n || 1; } catch (e) { }
      const p = r.action.replace(/_bad_signature$/, ''); sigs[p] = (sigs[p] || 0) + n;
    }
    return { since, limits, logins, sigs, top: [...top].sort((a, b) => b[1] - a[1]).slice(0, TOP), hours };
  }
  return { limitHit, loginFail, sigFail, flush, summary, stop: () => clearInterval(timer) };
}

module.exports = { makeSecurity };
