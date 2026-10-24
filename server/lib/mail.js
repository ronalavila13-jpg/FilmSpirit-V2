/* ============================================================
   Correos del sistema (opcional): copia del libro de reclamaciones,
   avisos de suscripción y del fin del mes gratis.
   Usa la API de un servicio de envío; sin configuración, no envía nada.
     MAIL_PROVIDER  resend | brevo
     MAIL_API_KEY   la clave del servicio
     MAIL_FROM      FilmSpirit <hola@tudominio.pe>   (dominio verificado en el servicio)
   ============================================================ */
'use strict';

function makeMail(cfg) {
  const prov = (process.env.MAIL_PROVIDER || '').toLowerCase(), key = process.env.MAIL_API_KEY || '', from = process.env.MAIL_FROM || '';
  const ready = !!(prov && key && from);
  const parseFrom = f => { const m = /^(.*)<([^>]+)>$/.exec(f.trim()); return m ? { name: m[1].trim(), email: m[2].trim() } : { name: 'FilmSpirit', email: f.trim() }; };
  async function send({ to, subject, text, replyTo }) {
    if (!ready || !to) return { sent: false };
    try {
      let r;
      if (prov === 'resend') {
        r = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000),
          body: JSON.stringify({ from, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
        });
      } else if (prov === 'brevo') {
        r = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST', headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' }, signal: AbortSignal.timeout(10000),
          body: JSON.stringify({ sender: parseFrom(from), to: [{ email: to }], subject, textContent: text, ...(replyTo ? { replyTo: { email: replyTo } } : {}) }),
        });
      } else return { sent: false };
      if (!r.ok) { console.warn('correo no enviado:', r.status, (await r.text()).slice(0, 200)); return { sent: false }; }
      return { sent: true };
    } catch (e) { console.warn('correo no enviado:', e.message); return { sent: false }; }
  }
  return { send, ready };
}
module.exports = { makeMail };
