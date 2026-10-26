/* ============================================================
   LIBRO DE RECLAMACIONES VIRTUAL (Código de Protección y Defensa del Consumidor, Perú)
   Cada hoja recibe un número correlativo (LR-2026-00001), queda guardada y se
   envía una copia al correo de la persona (si el correo del sistema está configurado).
   Producción la responde desde el panel de administración.
   ============================================================ */
'use strict';
const { fail, sendJSON, readJSON, rateLimit, now, isEmail, normEmail, mailbox } = require('./util');

const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, n);

/* copias por correo: el formulario es público, así que el servidor no envía más de 2 copias al día a un mismo correo
   ni más de RECLAMOS_CORREOS_DIA en total (100 por defecto). La hoja se guarda siempre y la copia se muestra en
   pantalla; así nadie puede usar el libro para mandar correos a terceros con el dominio de FilmSpirit */
const DAY = 864e5;
function makeReclamos(S, cfg, mail) {
  const maxDay = Math.max(0, +(process.env.RECLAMOS_CORREOS_DIA || 100));
  const sentLog = [];   // [ts, correo]
  // la copia a soporte también tiene tope (200 al día): pasado eso, las hojas siguen en el panel pero no llenan el correo
  const supDay = Math.max(0, +(process.env.RECLAMOS_SOPORTE_DIA || 200)), supLog = [];
  function canSupport() {
    const t = now();
    while (supLog.length && t - supLog[0] > DAY) supLog.shift();
    if (supLog.length >= supDay) return false;
    supLog.push(t); return true;
  }
  function canMail(to) {
    const t = now();
    while (sentLog.length && t - sentLog[0][0] > DAY) sentLog.shift();
    // se cuenta por buzón: ana+1@… y a.na@… son el mismo (antes cada variante tenía sus propias 2 copias)
    const box = mailbox(to);
    if (sentLog.length >= maxDay || sentLog.filter(x => x[1] === box).length >= 2) return false;
    sentLog.push([t, box]); return true;
  }
  function text(r, d) {
    const B = cfg.business;
    return [
      `LIBRO DE RECLAMACIONES · HOJA ${r.code}`, `Fecha: ${new Date(r.ts).toLocaleString('es-PE', { timeZone: 'America/Lima' })}`, '',
      `Proveedor: ${B.name || '—'} · RUC ${B.ruc || '—'} · ${B.address || '—'}`, '',
      '1. Consumidor reclamante', `Nombre: ${d.nombre}`, `Documento: ${d.doc_tipo} ${d.doc_num}`, `Domicilio: ${d.domicilio}`, `Teléfono: ${d.telefono || '—'}`, `Correo: ${d.email}`,
      d.menor ? `Padre, madre o apoderado: ${d.apoderado}` : '', '',
      '2. Bien contratado', `Tipo: ${d.bien}`, `Monto reclamado: ${d.monto ? 'S/ ' + d.monto : '—'}`, `Descripción: ${d.descripcion}`, '',
      `3. ${r.tipo === 'queja' ? 'Queja' : 'Reclamo'}`, `Detalle: ${d.detalle}`, `Pedido: ${d.pedido}`, '',
      'La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.',
      'El proveedor debe responder en un plazo no mayor a quince (15) días hábiles.',
    ].filter(x => x !== '').join('\n');
  }
  async function handle(req, res, url) {
    if (url.pathname !== '/api/reclamos' || req.method !== 'POST') return false;
    if (req.headers['x-fs'] !== '1') fail(403, 'Solicitud rechazada.', 'csrf');
    rateLimit('lr:' + req.ip, 8, 3600e3);
    const b = await readJSON(req, 32 * 1024);
    // campo trampa (invisible para las personas): si viene lleno, es un programa; se responde como si nada
    if (b.web) return sendJSON(res, 201, { code: 'LR-0', ts: now(), copy: '', emailed: false }), true;
    const d = {
      nombre: clean(b.nombre, 160), doc_tipo: ['DNI', 'CE', 'Pasaporte', 'RUC'].includes(b.doc_tipo) ? b.doc_tipo : 'DNI', doc_num: clean(b.doc_num, 20),
      domicilio: clean(b.domicilio, 300), telefono: clean(b.telefono, 30), email: normEmail(b.email), menor: !!b.menor, apoderado: clean(b.apoderado, 160),
      bien: b.bien === 'producto' ? 'Producto' : 'Servicio', monto: clean(b.monto, 20).replace(/[^\d.,]/g, ''), descripcion: clean(b.descripcion, 1000),
      detalle: clean(b.detalle, 4000), pedido: clean(b.pedido, 2000),
    };
    const tipo = b.tipo === 'queja' ? 'queja' : 'reclamo';
    const miss = [['nombre', 'tu nombre'], ['doc_num', 'tu número de documento'], ['domicilio', 'tu domicilio'], ['descripcion', 'el bien contratado'], ['detalle', 'el detalle'], ['pedido', 'tu pedido']].find(([k]) => !d[k]);
    if (miss) fail(400, `Falta ${miss[1]}.`, 'missing');
    if (!isEmail(d.email)) fail(400, 'Escribe un correo válido para enviarte la copia.', 'bad_email');
    if (d.menor && !d.apoderado) fail(400, 'Escribe el nombre del padre, madre o apoderado.', 'missing');
    const ts = now(), year = new Date(ts).getFullYear();
    const r = S.tx(() => {
      const ins = S.run('INSERT INTO reclamos(ts,tipo,data) VALUES(?,?,?)', ts, tipo, JSON.stringify(d));
      const n = Number(ins.lastInsertRowid);
      const code = `LR-${year}-${String(n).padStart(5, '0')}`;
      S.run('UPDATE reclamos SET code=? WHERE n=?', code, n);
      return { n, code, ts, tipo };
    });
    const body = text(r, d);
    // la copia: se intenta en el momento; si el servicio de correo falla, queda en cola y se reintenta (lib/mail.js)
    const sent = canMail(d.email) ? await mail.deliver({ kind: 'reclamo', to: d.email, subject: `Libro de reclamaciones · hoja ${r.code}`, text: body, replyTo: cfg.supportEmail || undefined }) : { sent: false, queued: false };
    if (cfg.supportEmail && canSupport()) mail.queue({ kind: 'reclamo-soporte', to: cfg.supportEmail, subject: `Nuevo ${tipo} ${r.code}`, text: body });
    sendJSON(res, 201, { code: r.code, ts: r.ts, copy: body, emailed: sent.sent, queued: !!sent.queued });
    return true;
  }
  return { handle, text };
}
module.exports = { makeReclamos };
