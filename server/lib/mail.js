/* ============================================================
   Correos del sistema (opcional): copia del libro de reclamaciones, avisos de suscripción, el aviso del fin del mes
   gratis (solo a quien empezó su prueba antes del lote AD: ya no hay prueba gratis) y, cuando quien administra lo
   pide desde el panel, el aviso a la lista de espera de que Studio abrió.
   Usa la API de un servicio de envío; sin configuración, no envía nada.
     MAIL_PROVIDER  resend | brevo
     MAIL_API_KEY   la clave del servicio
     MAIL_FROM      FilmSpirit <hola@tudominio.pe>   (dominio verificado en el servicio)
   Cola (tabla outbox): cada correo se anota en la base antes de enviarse. Si el servicio falla (caído, lento, sin
   cupo), se reintenta solo: al minuto, a los 5, a los 15, a la hora… hasta unos dos días. Antes se intentaba una vez y,
   si fallaba, se perdía (también el aviso del fin del mes gratis, que quedaba marcado como enviado).
   · deliver(): lo intenta en el momento y dice si salió (el libro de reclamaciones lo muestra); si no, queda en cola.
   · queue(): lo deja en cola y vuelve enseguida (bienvenida, aviso del mes gratis, copia a soporte, aviso de Studio).
   Lo enviado se queda sin el texto (que puede llevar datos del libro de reclamaciones) y a los 30 días se borra.
   ============================================================ */
'use strict';

const MIN = 60e3, HOUR = 3600e3;
// espera antes de cada reintento (el último, unas 48 horas después del primer intento)
const BACKOFF = [MIN, 5 * MIN, 15 * MIN, HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, 24 * HOUR];

function makeMail(cfg, S, opts = {}) {
  const prov = (process.env.MAIL_PROVIDER || '').toLowerCase(), key = process.env.MAIL_API_KEY || '', from = process.env.MAIL_FROM || '';
  const ready = opts.ready != null ? !!opts.ready : !!(prov && key && from);
  const parseFrom = f => { const m = /^(.*)<([^>]+)>$/.exec(f.trim()); return m ? { name: m[1].trim(), email: m[2].trim() } : { name: 'FilmSpirit', email: f.trim() }; };
  /* un envío: { sent } o { sent: false, permanent } (permanent: el servicio lo rechazó por el correo en sí, reintentar
     no sirve: dirección inválida, remitente sin verificar…) */
  async function sendNow({ to, subject, text, replyTo, key: idem }) {
    if (!ready || !to) return { sent: false, permanent: true };
    try {
      let r;
      if (prov === 'resend') {
        r = await fetch('https://api.resend.com/emails', {
          // la misma clave en cada reintento: si Resend ya lo había recibido (y la respuesta no llegó), no lo manda dos veces
          method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', ...(idem ? { 'Idempotency-Key': idem } : {}) }, signal: AbortSignal.timeout(10000),
          body: JSON.stringify({ from, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
        });
      } else if (prov === 'brevo') {
        r = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST', headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' }, signal: AbortSignal.timeout(10000),
          body: JSON.stringify({ sender: parseFrom(from), to: [{ email: to }], subject, textContent: text, ...(replyTo ? { replyTo: { email: replyTo } } : {}) }),
        });
      } else return { sent: false, permanent: true };
      if (!r.ok) {
        const why = `${r.status} ${(await r.text().catch(() => '')).slice(0, 200)}`;
        console.warn('correo no enviado:', why);
        // 4xx: el correo en sí no sirve (dirección, remitente); 401/403 (clave o cuenta del servicio) y 408/429 se reintentan
        return { sent: false, permanent: r.status >= 400 && r.status < 500 && ![401, 403, 408, 409, 429].includes(r.status), err: why };
      }
      return { sent: true };
    } catch (e) { console.warn('correo no enviado:', e.message); return { sent: false, permanent: false, err: e.message }; }
  }
  // para las pruebas: otro «servicio de envío»
  const transport = opts.transport || sendNow;

  // sin base de datos (scripts sueltos): como antes, un solo intento
  if (!S) return { send: m => transport(m), deliver: async m => ({ ...(await transport(m)), queued: false }), queue: m => { transport(m).catch(() => { }); return { queued: false }; }, ready, start() { }, stop() { }, idle: async () => { }, forget() { }, flush: async () => 0 };

  const now = () => Date.now();
  const busy = new Set();   // los que se están enviando (deliver y la vuelta de la cola no mandan el mismo dos veces)
  const inflight = new Set();
  function add(m, next) {
    const id = S.run('INSERT INTO outbox(kind,to_addr,subject,body,reply_to,next,created) VALUES(?,?,?,?,?,?,?)',
      String(m.kind || '').slice(0, 40), String(m.to).slice(0, 320), String(m.subject || '').slice(0, 300), String(m.text || ''), m.replyTo ? String(m.replyTo).slice(0, 320) : null, next, now()).lastInsertRowid;
    return Number(id);
  }
  function attempt(row) {
    const p = attempt1(row);
    inflight.add(p); p.finally(() => inflight.delete(p)).catch(() => { });
    return p;
  }
  async function attempt1(row) {
    busy.add(row.id);
    try {
      const r = await Promise.resolve().then(() => transport({ to: row.to_addr, subject: row.subject, text: row.body, replyTo: row.reply_to || undefined, key: `fs-outbox-${row.id}-${row.created}` }))
        .catch(e => ({ sent: false, permanent: false, err: e && e.message }));
      const t = now(), tries = row.tries + 1;
      if (r.sent) { S.run("UPDATE outbox SET sent=?, tries=?, body='', err=NULL WHERE id=?", t, tries, row.id); return true; }
      if (r.permanent || tries > BACKOFF.length) {
        S.run("UPDATE outbox SET dead=?, tries=?, body='', err=? WHERE id=?", t, tries, String(r.err || 'rechazado').slice(0, 300), row.id);
        // en la bitácora sin la dirección (se queda en outbox, que se borra a los 30 días o al eliminar la cuenta)
        try { S.run('INSERT INTO audit(ts,uid,action,detail) VALUES(?,?,?,?)', t, null, 'mail_failed', JSON.stringify({ id: row.id, kind: row.kind, subject: row.subject, err: String(r.err || '').slice(0, 200) })); } catch (e) { }
        return false;
      }
      S.run('UPDATE outbox SET tries=?, next=?, err=? WHERE id=?', tries, t + BACKOFF[tries - 1], String(r.err || '').slice(0, 300), row.id);
      return false;
    } finally { busy.delete(row.id); }
  }
  /* lo que toca reintentar (una vuelta; la llama el reloj cada minuto) */
  let running = null;
  function flush() {
    if (running) return running;
    running = (async () => {
      let n = 0;
      for (const row of S.all('SELECT * FROM outbox WHERE sent IS NULL AND dead IS NULL AND next<=? ORDER BY next LIMIT 25', now())) {
        if (busy.has(row.id)) continue;
        if (await attempt(row)) n++;
      }
      S.run('DELETE FROM outbox WHERE (sent IS NOT NULL OR dead IS NOT NULL) AND created<?', now() - 30 * 24 * HOUR);
      return n;
    })().finally(() => { running = null; });
    return running;
  }
  /* se intenta ahora; si no sale, queda en cola. { sent, queued } */
  async function deliver(m) {
    if (!ready || !m || !m.to) return { sent: false, queued: false };
    const id = add(m, now() + BACKOFF[0]);
    const ok = await attempt(S.one('SELECT * FROM outbox WHERE id=?', id));
    return { sent: ok, queued: !ok && !!S.one('SELECT 1 x FROM outbox WHERE id=? AND dead IS NULL', id) };
  }
  /* a la cola y se envía en segundo plano (no hace esperar a nadie) */
  function queue(m) {
    if (!ready || !m || !m.to) return { queued: false };
    add(m, now());
    setImmediate(() => flush().catch(e => console.warn('cola de correos:', e.message)));
    return { queued: true };
  }
  let timer = null;
  const start = () => { if (!timer) { timer = setInterval(() => flush().catch(e => console.warn('cola de correos:', e.message)), MIN); timer.unref(); } };
  const stop = () => { clearInterval(timer); timer = null; };
  /* al apagar: se espera lo que se está enviando (si la base se cierra en medio, lo enviado no queda anotado) */
  const idle = () => Promise.all([running, ...[...inflight]].filter(Boolean).map(p => p.catch(() => { })));
  /* cuenta eliminada: sus correos pendientes no se envían y no queda su dirección */
  const forget = email => { if (email) S.run('DELETE FROM outbox WHERE to_addr=?', String(email)); };
  // send() queda por compatibilidad: un intento con cola (igual que deliver)
  return { send: deliver, deliver, queue, flush, ready, start, stop, idle, forget };
}
module.exports = { makeMail, BACKOFF };
