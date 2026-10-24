/* ============================================================
   SUSCRIPCIONES (Indie, Pro y Studio) Y CÓDIGOS DE DESCUENTO
   Dos medios de pago, según el país de quien paga:
   · Perú → Mercado Pago, en soles. Suscripciones sin plan asociado («preapproval»):
       1. la app pide /api/billing/checkout → se crea la suscripción en estado «pending»
          y la persona va al enlace de Mercado Pago (init_point);
       2. al autorizarla, Mercado Pago avisa por webhook; el servidor NUNCA cree en el
          aviso: vuelve a leer la suscripción y los pagos con su token;
       3. el plan dura hasta la próxima fecha de cobro + 3 días de gracia.
     Primer mes gratis: uno por cuenta, por navegador y por pagador de Mercado Pago.
   · Resto del mundo → Paddle, en dólares (si está configurado; si no, Lemon Squeezy). Paddle: el servidor crea
     una transacción con el precio del plan y la persona paga en la página /pagar (Paddle.js), que es el «enlace
     de pago predeterminado» de la cuenta de Paddle. Paddle avisa por webhook firmado («Paddle-Signature») y el
     servidor vuelve a leer la suscripción. Paddle cobra los impuestos de cada país y emite los comprobantes.
   · Lemon Squeezy (alternativa), en dólares. La app crea un «checkout» con la
     variante del plan (Pro o Studio, mensual o anual) y los datos de la cuenta; Lemon
     Squeezy avisa por webhook firmado y el servidor vuelve a leer la suscripción.
     Lemon Squeezy cobra los impuestos de cada país y emite los comprobantes.
   Subir de Pro a Studio: se contrata Studio y, al activarse, la suscripción anterior se cancela.
   Códigos de descuento (influencers): % de descuento por N cobros, días extra de prueba,
   usos máximos y vencimiento. Uno por cuenta. En Mercado Pago los aplica el servidor; en
   Lemon Squeezy se envían a su página de pago (hay que crear el mismo código allí).
   Configuración: MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, LS_API_KEY, LS_STORE_ID, LS_WEBHOOK_SECRET,
   LS_VARIANT_PRO_MONTH, LS_VARIANT_PRO_YEAR, LS_VARIANT_STUDIO_MONTH, LS_VARIANT_STUDIO_YEAR y los precios.
   ============================================================ */
'use strict';
const crypto = require('node:crypto');
const { fail, sendJSON, readJSON, readBody, rateLimit, rid, now, isEmail, normEmail } = require('./util');
const { planOf, PLANS, TIER, PLAN_NAME, isPaidPlan } = require('./perm');
const { countryOf, regionOf } = require('./geo');

const DAY = 864e5, GRACE = 3 * DAY, FOREVER = 253402300799000;
const CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,39}$/;
const money = (n, cur) => (cur === 'USD' ? 'US$ ' : 'S/ ') + (+n).toFixed(2);

function makeBilling(S, auth, api, cfg, mail, sec) {
  const MP = {
    token: process.env.MP_ACCESS_TOKEN || '', base: (process.env.MP_API_BASE || 'https://api.mercadopago.com').replace(/\/+$/, ''),
    secret: process.env.MP_WEBHOOK_SECRET || '', trialMode: process.env.MP_TRIAL_MODE === 'start_date' ? 'start_date' : 'free_trial',
  };
  const LS = {
    key: process.env.LS_API_KEY || '', store: process.env.LS_STORE_ID || '', secret: process.env.LS_WEBHOOK_SECRET || '',
    base: (process.env.LS_API_BASE || 'https://api.lemonsqueezy.com').replace(/\/+$/, ''), test: process.env.LS_TEST_MODE === '1',
    variants: {
      pro: { month: process.env.LS_VARIANT_PRO_MONTH || '', year: process.env.LS_VARIANT_PRO_YEAR || '' },
      studio: { month: process.env.LS_VARIANT_STUDIO_MONTH || '', year: process.env.LS_VARIANT_STUDIO_YEAR || '' },
    },
    trialDays: +(process.env.LS_TRIAL_DAYS || 0),
  };
  LS.variants.indie = { month: process.env.LS_VARIANT_INDIE_MONTH || '', year: process.env.LS_VARIANT_INDIE_YEAR || '' };
  const pe = k => process.env[k] || '';
  const PD = {
    key: pe('PADDLE_API_KEY'), secret: pe('PADDLE_WEBHOOK_SECRET'), client: pe('PADDLE_CLIENT_TOKEN'), sandbox: pe('PADDLE_ENV') === 'sandbox',
    base: (pe('PADDLE_API_BASE') || (pe('PADDLE_ENV') === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com')).replace(/\/+$/, ''),
    // los seis precios de Paddle (pri_…) y, si se quiere el mes gratis de Pro fuera del Perú, los de Pro con 30 días de prueba
    prices: Object.fromEntries(['indie', 'pro', 'studio'].map(p => [p, { month: pe(`PADDLE_PRICE_${p.toUpperCase()}_MONTH`), year: pe(`PADDLE_PRICE_${p.toUpperCase()}_YEAR`) }])),
    trial: { month: pe('PADDLE_PRICE_PRO_MONTH_TRIAL'), year: pe('PADDLE_PRICE_PRO_YEAR_TRIAL') },
    founder: pe('PADDLE_DISCOUNT_FUNDADOR'),     // dsc_… del código FUNDADOR (20 % recurrente)
  };
  const PRICES = cfg.prices, FOUNDER = cfg.founder || { until: 0, PEN: {} };
  const PRICE = PRICES.PEN.pro;             // compatibilidad: precio de Pro en soles
  const mpOn = () => !!MP.token && PRICES.PEN.pro.month > 0;
  const pdOn = () => !!(PD.key && PD.prices.pro.month);
  const lsOn = () => !!(LS.key && LS.store && LS.variants.pro.month);
  const intlProv = () => pdOn() ? 'paddle' : lsOn() ? 'ls' : '';
  const enabled = () => mpOn() || pdOn() || lsOn();
  const founderNow = () => now() < (FOUNDER.until || 0);
  const SELL = ['indie', 'pro', 'studio'];
  const sellable = plan => plan !== 'studio' || !!cfg.studioOpen;
  const lsVariant = (plan, cycle) => (LS.variants[plan] || {})[cycle] || '';
  const planOfVariant = v => { for (const [p, x] of Object.entries(LS.variants)) for (const c of ['month', 'year']) if (x[c] && String(x[c]) === String(v)) return { plan: p, cycle: c }; return null; };
  // avisos con firma falsa: se cuentan con los demás contadores de seguridad (una fila por hora en la bitácora)
  const badSig = (prov, req) => sec.sigFail(prov, req.ip);
  const audit = (uid, action, detail) => { try { S.run('INSERT INTO audit(ts,uid,action,detail) VALUES(?,?,?,?)', now(), uid || null, action, detail ? JSON.stringify(detail).slice(0, 2000) : null); } catch (e) { } };
  const userById = id => S.one('SELECT * FROM users WHERE id=?', id);

  async function call(base, headers, method, path, body, who) {
    const r = await fetch(base + path, { method, signal: AbortSignal.timeout(15000), headers, body: body ? JSON.stringify(body) : undefined });
    const txt = await r.text();
    let j = null; try { j = JSON.parse(txt); } catch (e) { }
    if (!r.ok) {
      const msg = (j && (j.message || j.error || (j.errors && j.errors[0] && (j.errors[0].detail || j.errors[0].title)))) || txt.slice(0, 200);
      const e = new Error(`${who} ${method} ${path}: ${r.status} ${msg}`); e.status = r.status; throw e;
    }
    return j;
  }
  const paddle = (method, path, body) => call(PD.base, { Authorization: 'Bearer ' + PD.key, 'Content-Type': 'application/json', 'Paddle-Version': '1' }, method, path, body, 'Paddle');
  const mp = (method, path, body) => call(MP.base, { Authorization: 'Bearer ' + MP.token, 'Content-Type': 'application/json', ...(method === 'POST' ? { 'X-Idempotency-Key': crypto.randomUUID() } : {}) }, method, path, body, 'Mercado Pago');
  const ls = (method, path, body) => call(LS.base, { Authorization: 'Bearer ' + LS.key, Accept: 'application/vnd.api+json', 'Content-Type': 'application/vnd.api+json' }, method, path, body, 'Lemon Squeezy');

  /* ---------- al entrar: navegador usado, país y código de influencer con el que llegó ---------- */
  function onLogin(u, req, { isNew, ref, dev, tz }) {
    if (dev) S.run('INSERT OR IGNORE INTO devices(dev,uid,ts) VALUES(?,?,?)', dev, u.id, now());
    if (isNew) S.run('UPDATE users SET signup_ip=? WHERE id=?', req.ip || '', u.id);
    const g = countryOf(req, tz || '');
    if (g.country) S.run('UPDATE users SET country=? WHERE id=?', g.country, u.id);
    // el código queda guardado para el pago (también en cuentas que ya existían y aún no usaron uno)
    const code = String(ref || '').trim().toUpperCase();
    if (!CODE_RE.test(code) || u.promo === code || S.one('SELECT 1 x FROM redemptions WHERE uid=?', u.id)) return;
    const promo = S.one("SELECT * FROM codes WHERE code=? AND kind='promo' AND active=1", code);
    if (promo) { S.run('UPDATE users SET promo=? WHERE id=?', code, u.id); audit(u.id, 'promo_link', { code, isNew }); }
  }

  /* ---------- precio con código ---------- */
  function trialAvailable(u, dev) {
    if (u.trial_used) return false;
    if (S.one('SELECT 1 x FROM subs WHERE uid=? AND trial>0 AND status<>?', u.id, 'pending')) return false;
    // el mismo dispositivo ya usó el mes gratis con otra cuenta
    if (dev && S.one('SELECT 1 x FROM devices d JOIN users x ON x.id=d.uid WHERE d.dev=? AND d.uid<>? AND x.trial_used=1', dev, u.id)) return false;
    return true;
  }
  function quote(u, cycle, codeIn, dev, opts = {}) {
    const plan = opts.plan || 'pro', region = opts.region === 'intl' ? 'intl' : 'pe';
    if (!SELL.includes(plan)) fail(400, 'Elige Indie, Pro o Studio.', 'bad_plan');
    if (!sellable(plan)) fail(403, 'Studio abre muy pronto. Únete a la lista de espera y te avisamos.', 'studio_waitlist');
    if (cycle !== 'month' && cycle !== 'year') fail(400, 'Elige el pago mensual o anual.', 'bad_cycle');
    const currency = region === 'pe' ? 'PEN' : 'USD', list = PRICES[currency][plan][cycle];
    const prov = region === 'pe' ? 'mp' : intlProv() || 'paddle';
    // precio de fundador de Pro: en soles, el precio rebajado; fuera del Perú, el código FUNDADOR (20 %) en Paddle
    const founder = plan === 'pro' && founderNow() && (region === 'pe' ? FOUNDER.PEN[cycle] > 0 : prov === 'paddle');
    const base = founder && region === 'pe' ? FOUNDER.PEN[cycle] : list;
    // el mes gratis es de Pro: en el Perú con Mercado Pago; fuera, con el precio de prueba de Paddle (o los días de Lemon Squeezy)
    const trialDays = plan !== 'pro' ? 0 : region === 'pe' ? (trialAvailable(u, dev) ? 30 : 0)
      : prov === 'paddle' ? (PD.trial[cycle] && trialAvailable(u, dev) ? 30 : 0) : LS.trialDays;
    const out = {
      plan, cycle, region, provider: prov, currency, base, list, amount: base, pct: 0, cycles: 0,
      trialDays, code: null, label: '', atCheckout: false, founder: !!founder,
    };
    if (founder && region === 'intl') { out.pct = FOUNDER.pct; out.amount = Math.round(list * (100 - FOUNDER.pct)) / 100; out.code = FOUNDER.code; out.label = 'Precio de fundador'; }
    const code = String(codeIn || '').trim().toUpperCase();
    // con el precio de fundador no se suma otro código (queda el de fundador, que es el mejor)
    if (!code || founder) return out;
    if (!CODE_RE.test(code)) fail(400, 'Ese código no existe.', 'bad_code');
    const c = S.one("SELECT * FROM codes WHERE code=? AND kind='promo'", code);
    if (!c) fail(400, 'Ese código no existe.', 'bad_code');
    if (!c.active) fail(400, 'Ese código ya no está activo.', 'code_off');
    if (c.expires && c.expires < now()) fail(400, 'Ese código venció.', 'code_expired');
    if (c.max_uses != null && c.uses >= c.max_uses) fail(400, 'Ese código ya se usó todas las veces posibles.', 'code_used');
    const used = S.one('SELECT code FROM redemptions WHERE uid=?', u.id);
    if (used && used.code !== code) fail(400, 'Tu cuenta ya usó un código de descuento.', 'code_one');
    if (used) fail(400, 'Ya usaste este código.', 'code_one');
    out.code = code; out.label = c.label;
    // fuera del Perú el descuento lo aplica el medio de pago en su página (hay que crear el mismo código allí)
    if (region === 'intl') { out.atCheckout = true; return out; }
    out.pct = Math.max(0, Math.min(100, c.pct));
    out.cycles = cycle === 'year' && c.cycles > 0 ? 1 : c.cycles;   // en el pago anual, el descuento vale para el primer año
    out.amount = Math.round(base * (100 - out.pct)) / 100;
    if (out.trialDays && c.trial_days) out.trialDays += c.trial_days;
    if (out.amount <= 0) fail(400, 'Ese código no se puede usar en una suscripción.', 'bad_code');
    return out;
  }

  /* ---------- suscribirse ---------- */
  const activeSub = uid => S.one("SELECT * FROM subs WHERE uid=? AND status IN ('authorized','paused') ORDER BY created DESC LIMIT 1", uid);
  async function checkout(u, b, dev) {
    const region = b.region === 'intl' ? 'intl' : 'pe', plan = SELL.includes(b.plan) ? b.plan : 'pro';
    if (region === 'pe' && !mpOn()) fail(503, 'Los pagos con Mercado Pago aún no están habilitados. Vuelve pronto.', 'billing_off');
    if (region === 'intl' && !intlProv()) fail(503, 'Los pagos internacionales aún no están habilitados. Vuelve pronto.', 'billing_off');
    const cur = activeSub(u.id);
    if (cur && TIER[cur.plan || 'pro'] >= TIER[plan]) fail(409, `Ya tienes una suscripción a FilmSpirit ${PLAN_NAME[cur.plan || 'pro']}.`, 'has_sub');
    const q = quote(u, b.cycle, b.code || u.promo, dev, { plan, region });
    // en Paddle el cliente es siempre el correo de la cuenta: un correo escrito a mano podía apuntar al cliente de Paddle
    // de otra persona (y abrir su portal de pagos). En Mercado Pago y Lemon Squeezy el correo del pago puede ser otro
    const payer = region === 'intl' && q.provider === 'paddle' ? normEmail(u.email) : normEmail(b.email || u.email);
    if (!isEmail(payer)) fail(400, region === 'pe' ? 'Escribe el correo de tu cuenta de Mercado Pago.' : 'Escribe un correo válido.', 'bad_email');
    const sid = 's' + rid(10);
    if (region === 'intl' && q.provider === 'paddle') return paddleCheckout(u, q, sid, payer);
    if (region === 'intl') {
      const variant = lsVariant(plan, q.cycle);
      if (!variant) fail(503, `FilmSpirit ${PLAN_NAME[plan]} ${q.cycle === 'year' ? 'anual' : 'mensual'} aún no está disponible para pagos internacionales.`, 'billing_off');
      const r = await ls('POST', '/v1/checkouts', {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: { email: payer, name: u.name || undefined, custom: { uid: u.id, sid }, ...(q.code ? { discount_code: q.code } : {}) },
            product_options: { redirect_url: `${cfg.baseUrl}/app/?pago=${sid}`, enabled_variants: [+variant] },
            checkout_options: { embed: false },
            test_mode: LS.test,
          },
          relationships: { store: { data: { type: 'stores', id: String(LS.store) } }, variant: { data: { type: 'variants', id: String(variant) } } },
        },
      });
      S.run(`INSERT INTO subs(id,uid,provider,ext_id,plan,cycle,base_amount,amount,currency,status,code,disc_cycles,trial,created,updated)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, sid, u.id, 'ls', null, plan, q.cycle, q.base, q.base, 'USD', 'pending', q.code, 0, 0, now(), now());
      audit(u.id, 'checkout', { sid, provider: 'ls', plan, cycle: q.cycle, code: q.code });
      return { url: r.data.attributes.url, sid };
    }
    const ar = { frequency: q.cycle === 'year' ? 12 : 1, frequency_type: 'months', transaction_amount: q.amount, currency_id: 'PEN' };
    if (q.trialDays > 0) {
      if (MP.trialMode === 'start_date') ar.start_date = new Date(now() + q.trialDays * DAY).toISOString();
      else ar.free_trial = { frequency: q.trialDays, frequency_type: 'days' };
    }
    const pre = await mp('POST', '/preapproval', {
      reason: `FilmSpirit ${PLAN_NAME[plan]} ${q.cycle === 'year' ? 'anual' : 'mensual'}${q.founder ? ' · precio de fundador' : ''}${q.code ? ' · código ' + q.code : ''}`,
      external_reference: sid, payer_email: payer, back_url: `${cfg.baseUrl}/app/?pago=${sid}`, status: 'pending', auto_recurring: ar,
    });
    S.run(`INSERT INTO subs(id,uid,provider,ext_id,plan,cycle,base_amount,amount,currency,status,code,disc_cycles,trial,created,updated)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, sid, u.id, 'mp', pre.id, plan, q.cycle, q.base, q.amount, 'PEN', 'pending', q.code, q.cycles, q.trialDays, now(), now());
    audit(u.id, 'checkout', { sid, pre: pre.id, plan, cycle: q.cycle, amount: q.amount, code: q.code, trial: q.trialDays });
    return { url: pre.init_point || pre.sandbox_init_point, sid };
  }

  /* al activarse una suscripción, las demás de la cuenta ya no sirven: las pendientes se descartan
     y las activas (por ejemplo Pro, al pasar a Studio) se cancelan en su medio de pago */
  /* una suscripción que nunca se activó: pendiente, o descartada aquí (por otra que se activó, o sin completar a los 7
     días). Si después se paga igual, se activa con las mismas comprobaciones del primer pago (mes gratis por pagador,
     prueba usada, código) */
  const fresh = s => s.status === 'pending' || (s.status === 'cancelled' && (s.note === 'descartada' || s.note === 'sin completar'));
  /* descartar un pago que quedó a medias: también en el medio de pago, para que ya no se pueda completar */
  async function dropPending(s, note) {
    S.run("UPDATE subs SET status='cancelled', note=?, updated=? WHERE id=?", note, now(), s.id);
    try {
      if (s.provider === 'mp' && s.ext_id && mpOn()) await mp('PUT', '/preapproval/' + encodeURIComponent(s.ext_id), { status: 'cancelled' });
      else if (s.provider === 'paddle' && /^pdt:/.test(s.ext_id || '') && pdOn()) await paddle('PATCH', '/transactions/' + encodeURIComponent(pdId(s.ext_id)), { status: 'canceled' });
    } catch (e) { audit(s.uid, 'drop_pending_error', { sid: s.id, e: e.message }); }
  }
  async function retireOthers(sub) {
    for (const o of S.all("SELECT * FROM subs WHERE uid=? AND status='pending' AND id<>?", sub.uid, sub.id)) await dropPending(o, 'descartada');
    for (const o of S.all("SELECT * FROM subs WHERE uid=? AND status IN ('authorized','paused') AND id<>?", sub.uid, sub.id)) {
      try {
        if (o.provider === 'ls') { await ls('DELETE', '/v1/subscriptions/' + encodeURIComponent(String(o.ext_id).replace(/^ls:/, ''))); }
        else if (o.provider === 'paddle') { if (/^pd:/.test(o.ext_id || '')) await paddle('POST', `/subscriptions/${encodeURIComponent(pdId(o.ext_id))}/cancel`, { effective_from: 'immediately' }); }
        else if (o.ext_id) await mp('PUT', '/preapproval/' + encodeURIComponent(o.ext_id), { status: 'cancelled' });
        S.run("UPDATE subs SET status='cancelled', note=?, updated=? WHERE id=?", 'cambio de plan', now(), o.id);
        audit(o.uid, 'sub_replaced', { old: o.id, by: sub.id });
      } catch (e) { audit(o.uid, 'sub_replace_error', { old: o.id, e: e.message }); }
    }
  }
  function welcome(sub, note) {
    const u = userById(sub.uid), name = PLAN_NAME[sub.plan || 'pro'];
    mail.send({ to: u.email, subject: `Tu FilmSpirit ${name} está activo`, text: `Hola ${u.name}:\n\nTu suscripción a FilmSpirit ${name} quedó activa${sub.trial ? (note ? '. Este medio de pago ya usó el mes gratis, así que el plan se activa con el primer cobro' : ` y el primer cobro será en ${sub.trial} días`) : ''}.\n\nPuedes ver o cancelar tu suscripción desde el botón de tu cuenta en la app.\n\nFilmSpirit` });
  }

  /* ---------- Mercado Pago: lo que dice Mercado Pago manda (estado, próximo cobro, pagador) ---------- */
  async function syncPre(extId) {
    const pre = await mp('GET', '/preapproval/' + encodeURIComponent(extId));
    let sub = S.one('SELECT * FROM subs WHERE ext_id=?', pre.id) || (pre.external_reference && S.one('SELECT * FROM subs WHERE id=?', pre.external_reference));
    if (!sub) { audit(null, 'mp_unknown', { pre: pre.id, ref: pre.external_reference }); return null; }
    const status = ['pending', 'authorized', 'paused', 'cancelled'].includes(pre.status) ? pre.status : sub.status;
    const next = pre.next_payment_date ? Date.parse(pre.next_payment_date) || null : null;
    const payer = pre.payer_id != null ? String(pre.payer_id) : sub.payer_id;
    const first = fresh(sub) && (status === 'authorized' || status === 'paused');
    let note = first ? null : sub.note;
    if (first && sub.note) S.run('UPDATE subs SET note=NULL WHERE id=?', sub.id);
    S.tx(() => {
      S.run('UPDATE subs SET ext_id=?, status=?, next_payment=COALESCE(?, next_payment), payer_id=?, updated=? WHERE id=?', pre.id, status, next, payer, now(), sub.id);
      if (first) {
        // el mes gratis es uno por pagador de Mercado Pago: si ya lo usó otra cuenta, el plan empieza con el primer cobro
        if (sub.trial && payer && S.one("SELECT 1 x FROM subs WHERE payer_id=? AND uid<>? AND trial>0 AND status<>'pending'", payer, sub.uid)) {
          note = 'mes gratis repetido'; S.run('UPDATE subs SET note=? WHERE id=?', note, sub.id);
        }
        if (sub.trial) S.run('UPDATE users SET trial_used=1 WHERE id=?', sub.uid);
        if (sub.code) {
          S.run('INSERT OR IGNORE INTO redemptions(code,uid,sid,ts) VALUES(?,?,?,?)', sub.code, sub.uid, sub.id, now());
          S.run('UPDATE codes SET uses=uses+1 WHERE code=?', sub.code);
        }
      }
    });
    if (first) { await retireOthers(sub); audit(sub.uid, 'sub_authorized', { sid: sub.id, payer, note }); welcome(sub, note); }
    entitlement(sub.uid);
    return S.one('SELECT * FROM subs WHERE id=?', sub.id);
  }
  async function syncPayment(id) {
    const ap = await mp('GET', '/authorized_payments/' + encodeURIComponent(id));
    const sub = ap.preapproval_id && S.one('SELECT * FROM subs WHERE ext_id=?', ap.preapproval_id);
    const ok = !!(ap.payment && ap.payment.status === 'approved');
    // devoluciones y contracargos quedan registrados (el panel los muestra)
    if (sub && ap.payment && /refunded|charged_back|cancelled/.test(ap.payment.status || '')) {
      S.run('INSERT INTO payments(ext_id,sid,uid,amount,status,ts,currency) VALUES(?,?,?,?,?,?,?) ON CONFLICT(ext_id) DO UPDATE SET status=excluded.status', String(ap.id), sub.id, sub.uid, +ap.transaction_amount || sub.amount, ap.payment.status, now(), 'PEN');
      audit(sub.uid, 'payment_' + ap.payment.status, { sid: sub.id, id: ap.id });
    }
    if (sub && ok && !S.one('SELECT 1 x FROM payments WHERE ext_id=?', String(ap.id))) {
      S.run('INSERT INTO payments(ext_id,sid,uid,amount,status,ts,currency) VALUES(?,?,?,?,?,?,?)', String(ap.id), sub.id, sub.uid, +ap.transaction_amount || sub.amount, 'approved', now(), 'PEN');
      S.run("UPDATE subs SET paid_cycles=paid_cycles+1, note=CASE WHEN note='mes gratis repetido' THEN NULL ELSE note END WHERE id=?", sub.id);
      // fin del descuento: vuelve al precio completo
      const s2 = S.one('SELECT * FROM subs WHERE id=?', sub.id);
      if (s2.disc_cycles > 0 && s2.paid_cycles >= s2.disc_cycles && s2.amount !== s2.base_amount) {
        try {
          await mp('PUT', '/preapproval/' + encodeURIComponent(s2.ext_id), { auto_recurring: { transaction_amount: s2.base_amount, currency_id: 'PEN' } });
          S.run('UPDATE subs SET amount=base_amount WHERE id=?', s2.id);
          audit(s2.uid, 'disc_end', { sid: s2.id });
        } catch (e) { audit(s2.uid, 'disc_end_error', { sid: s2.id, e: e.message }); }
      }
      audit(sub.uid, 'payment', { sid: sub.id, id: ap.id, amount: ap.transaction_amount });
    }
    if (sub) await syncPre(sub.ext_id);
    return sub;
  }

  /* ---------- Lemon Squeezy: se vuelve a leer la suscripción ---------- */
  const lsId = ext => String(ext || '').replace(/^ls:/, '');
  async function syncLs(id, hint = {}) {
    const j = await ls('GET', '/v1/subscriptions/' + encodeURIComponent(id));
    const d = j && j.data, a = d && d.attributes;
    if (!a) return null;
    let sub = S.one('SELECT * FROM subs WHERE ext_id=?', 'ls:' + d.id);
    if (!sub && hint.sid) {
      sub = S.one("SELECT * FROM subs WHERE id=? AND provider='ls'", String(hint.sid));
      // igual que en Paddle: el sid (lo arma quien compra) solo une la suscripción a un pago que aún no tiene otra
      if (sub && !fresh(sub)) { audit(sub.uid, 'ls_rebind_denied', { id: d.id, sid: sub.id, had: sub.ext_id }); return null; }
    }
    if (!sub) { audit(null, 'ls_unknown', { id: d.id, sid: hint.sid || null }); return null; }
    if (hint.uid && hint.uid !== sub.uid) { audit(null, 'ls_mismatch', { id: d.id, sid: sub.id }); return null; }
    const t = x => x ? Date.parse(x) || null : null;
    const st = String(a.status || '');
    let status, next;
    if (st === 'active' || st === 'on_trial' || st === 'past_due') { status = 'authorized'; next = t(a.renews_at) || t(a.trial_ends_at); }
    else if (st === 'paused') { status = 'paused'; next = t(a.renews_at) || now(); }
    else if (st === 'cancelled') { status = 'cancelled'; next = t(a.ends_at) || now(); }        // sigue hasta el fin del periodo pagado
    else { status = 'cancelled'; next = Math.min(t(a.ends_at) || now(), now()); }             // expired, unpaid: termina ya
    const vp = planOfVariant(a.variant_id);
    // una suscripción a otro producto de la tienda no activa ningún plan de FilmSpirit
    if (!vp) { audit(sub.uid, 'ls_unknown_variant', { id: d.id, variant: a.variant_id, sid: sub.id }); return null; }
    const first = fresh(sub) && (status === 'authorized' || status === 'paused');
    if (first && sub.note) S.run('UPDATE subs SET note=NULL WHERE id=?', sub.id);
    S.run('UPDATE subs SET ext_id=?, status=?, next_payment=?, payer_id=?, portal=?, plan=?, cycle=?, updated=? WHERE id=?',
      'ls:' + d.id, status, next, a.customer_id != null ? String(a.customer_id) : sub.payer_id, (a.urls && a.urls.customer_portal) || sub.portal,
      vp ? vp.plan : sub.plan, vp ? vp.cycle : sub.cycle, now(), sub.id);
    if (first) {
      if (st === 'on_trial') S.run('UPDATE subs SET trial=? WHERE id=?', Math.max(1, Math.round(((t(a.trial_ends_at) || now()) - now()) / DAY)), sub.id);
      await retireOthers(sub); audit(sub.uid, 'sub_authorized', { sid: sub.id, provider: 'ls' }); welcome(S.one('SELECT * FROM subs WHERE id=?', sub.id));
    }
    entitlement(sub.uid);
    return S.one('SELECT * FROM subs WHERE id=?', sub.id);
  }
  async function lsInvoice(d, ev, custom) {
    const a = d.attributes || {}, sid = String(a.subscription_id || '');
    const sub = S.one('SELECT * FROM subs WHERE ext_id=?', 'ls:' + sid) || (custom.sid && S.one("SELECT * FROM subs WHERE id=? AND provider='ls'", String(custom.sid)));
    if (!sub) { if (sid) await syncLs(sid, custom); return; }
    const key = 'ls:inv:' + d.id, amount = (+a.total || 0) / 100;
    if (/refund/.test(ev) || a.refunded) {
      S.run('INSERT INTO payments(ext_id,sid,uid,amount,status,ts,currency) VALUES(?,?,?,?,?,?,?) ON CONFLICT(ext_id) DO UPDATE SET status=excluded.status', key, sub.id, sub.uid, amount, 'refunded', now(), 'USD');
      audit(sub.uid, 'payment_refunded', { sid: sub.id, id: d.id });
    } else if (a.status === 'paid' && !S.one('SELECT 1 x FROM payments WHERE ext_id=?', key)) {
      S.run('INSERT INTO payments(ext_id,sid,uid,amount,status,ts,currency) VALUES(?,?,?,?,?,?,?)', key, sub.id, sub.uid, amount, 'approved', now(), 'USD');
      S.run('UPDATE subs SET paid_cycles=paid_cycles+1 WHERE id=?', sub.id);
      audit(sub.uid, 'payment', { sid: sub.id, id: d.id, amount, currency: 'USD' });
    }
    if (sid) await syncLs(sid, custom);
  }
  async function syncAny(sub) { return sub.provider === 'ls' ? syncLs(lsId(sub.ext_id)) : sub.provider === 'paddle' ? syncPaddleSub(sub) : syncPre(sub.ext_id); }

  /* ---------- Paddle: transacción → página /pagar → suscripción; lo que dice Paddle manda ---------- */
  const pdId = ext => String(ext || '').replace(/^pd[t]?:/, '');
  const planOfPrice = id => {
    for (const [p, x] of Object.entries(PD.prices)) for (const c of ['month', 'year']) if (x[c] && x[c] === id) return { plan: p, cycle: c };
    for (const c of ['month', 'year']) if (PD.trial[c] && PD.trial[c] === id) return { plan: 'pro', cycle: c, trial: true };
    return null;
  };
  /* ¿ese cliente de Paddle lo usa también otra cuenta? (de antes de fijar el correo de la cuenta) */
  const paddleShared = (ctm, uid) => !!S.one("SELECT 1 x FROM subs WHERE provider='paddle' AND payer_id=? AND uid<>? LIMIT 1", ctm, uid);
  async function paddleCustomer(email, name) {
    try { const r = await paddle('POST', '/customers', { email, ...(name ? { name: String(name).slice(0, 120) } : {}) }); return r.data.id; }
    catch (e) {
      // ya existe: Paddle dice cuál es en el mensaje («…conflicts with customer of id ctm_…»)
      const m = /ctm_[a-z0-9]+/i.exec(e.message || '');
      if (e.status === 409 && m) return m[0];
      const r = await paddle('GET', '/customers?email=' + encodeURIComponent(email));
      if (r && r.data && r.data[0]) return r.data[0].id;
      throw e;
    }
  }
  async function paddleCheckout(u, q, sid, payer) {
    const price = q.trialDays && PD.trial[q.cycle] ? PD.trial[q.cycle] : PD.prices[q.plan][q.cycle];
    if (!price) fail(503, `FilmSpirit ${PLAN_NAME[q.plan]} ${q.cycle === 'year' ? 'anual' : 'mensual'} aún no está disponible para pagos internacionales.`, 'billing_off');
    // un solo cliente de Paddle por cuenta: el de sus pagos anteriores, si ya tiene uno
    const prev = S.one("SELECT payer_id FROM subs WHERE uid=? AND provider='paddle' AND payer_id LIKE 'ctm_%' ORDER BY created DESC LIMIT 1", u.id);
    const ctm = prev && !paddleShared(prev.payer_id, u.id) ? prev.payer_id : await paddleCustomer(payer, u.name);
    const body = { items: [{ price_id: price, quantity: 1 }], customer_id: ctm, collection_mode: 'automatic', custom_data: { uid: u.id, sid } };
    if (q.founder && PD.founder) body.discount_id = PD.founder;
    const r = await paddle('POST', '/transactions', body);
    const txn = r.data.id;
    S.run(`INSERT INTO subs(id,uid,provider,ext_id,plan,cycle,base_amount,amount,currency,status,code,disc_cycles,trial,payer_id,created,updated)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, sid, u.id, 'paddle', 'pdt:' + txn, q.plan, q.cycle, q.list || q.base, q.amount, 'USD', 'pending', q.code, 0, q.trialDays, ctm, now(), now());
    audit(u.id, 'checkout', { sid, provider: 'paddle', txn, plan: q.plan, cycle: q.cycle, code: q.code, trial: q.trialDays });
    // el enlace de pago predeterminado de la cuenta es /pagar en esta web; si Paddle no lo trae, se arma igual
    const link = (r.data.checkout && r.data.checkout.url) || `${cfg.baseUrl}/pagar?_ptxn=${encodeURIComponent(txn)}`;
    return { url: link + (link.includes('?') ? '&' : '?') + 'sid=' + encodeURIComponent(sid), sid };
  }
  /* la suscripción de Paddle (sub_…): estado, próximo cobro, plan y fin del periodo pagado */
  async function syncPaddle(subId, hint = {}) {
    if (!/^sub_[a-z0-9]{1,60}$/i.test(String(subId))) return null;
    const j = await paddle('GET', '/subscriptions/' + encodeURIComponent(subId));
    const d = j && j.data; if (!d) return null;
    const cd = d.custom_data || {};
    let sub = S.one('SELECT * FROM subs WHERE ext_id=?', 'pd:' + d.id);
    const sid = hint.sid || cd.sid;
    if (!sub && sid) {
      sub = S.one("SELECT * FROM subs WHERE id=? AND provider='paddle'", String(sid));
      // el sid lo puede escribir quien paga (Paddle.js): solo une la suscripción a un pago que todavía no tiene otra.
      // Antes, una segunda suscripción con el mismo sid se pegaba a un pago ya usado o rechazado y se activaba sin las
      // comprobaciones del primer pago (por ejemplo, el precio con prueba en una cuenta que ya la usó)
      if (sub && !fresh(sub)) { audit(sub.uid, 'paddle_rebind_denied', { id: d.id, sid: sub.id, had: sub.ext_id }); return null; }
    }
    if (!sub) { audit(null, 'paddle_unknown', { id: d.id, sid: sid || null }); return null; }
    const uid = hint.uid || cd.uid;
    if (uid && uid !== sub.uid) { audit(null, 'paddle_mismatch', { id: d.id, sid: sub.id }); return null; }
    const pr = planOfPrice(d.items && d.items[0] && d.items[0].price && d.items[0].price.id);
    if (!pr) { audit(sub.uid, 'paddle_unknown_price', { id: d.id, sid: sub.id }); return null; }
    const t = x => x ? Date.parse(x) || null : null, st = String(d.status || '');
    const periodEnd = t(d.current_billing_period && d.current_billing_period.ends_at);
    let status, next;
    if (st === 'active' || st === 'trialing' || st === 'past_due') {
      status = 'authorized'; next = t(d.next_billed_at) || periodEnd;
      // cancelada al fin del periodo: sigue hasta esa fecha
      if (d.scheduled_change && d.scheduled_change.action === 'cancel') { status = 'cancelled'; next = t(d.scheduled_change.effective_at) || periodEnd || now(); }
    } else if (st === 'paused') { status = 'paused'; next = t(d.paused_at) || now(); }
    else { status = 'cancelled'; next = Math.min(t(d.canceled_at) || now(), now()); }
    const first = fresh(sub) && (status === 'authorized' || status === 'paused');
    // el precio con prueba solo vale si el servidor ofreció la prueba en ese pago (Paddle.js deja armar otro con el mismo
    // sid): si no, se cancela al instante y no se activa. Se revisa siempre, no solo la primera vez
    if (pr.trial && !(sub.trial > 0)) {
      try { await paddle('POST', `/subscriptions/${encodeURIComponent(d.id)}/cancel`, { effective_from: 'immediately' }); } catch (e) { }
      S.run("UPDATE subs SET ext_id=?, status='cancelled', note='prueba no ofrecida', updated=? WHERE id=?", 'pd:' + d.id, now(), sub.id);
      audit(sub.uid, 'paddle_trial_denied', { id: d.id, sid: sub.id });
      return null;
    }
    if (first && sub.note) S.run('UPDATE subs SET note=NULL WHERE id=?', sub.id);
    S.run('UPDATE subs SET ext_id=?, status=?, next_payment=?, payer_id=?, portal=?, plan=?, cycle=?, updated=? WHERE id=?',
      'pd:' + d.id, status, next, d.customer_id || sub.payer_id, 'paddle', pr.plan, pr.cycle, now(), sub.id);
    if (first) {
      if (st === 'trialing') { S.run('UPDATE subs SET trial=? WHERE id=?', Math.max(1, Math.round(((t(d.next_billed_at) || now()) - now()) / DAY)), sub.id); S.run('UPDATE users SET trial_used=1 WHERE id=?', sub.uid); }
      if (sub.code && sub.code !== FOUNDER.code) { S.run('INSERT OR IGNORE INTO redemptions(code,uid,sid,ts) VALUES(?,?,?,?)', sub.code, sub.uid, sub.id, now()); S.run('UPDATE codes SET uses=uses+1 WHERE code=?', sub.code); }
      await retireOthers(sub); audit(sub.uid, 'sub_authorized', { sid: sub.id, provider: 'paddle' }); welcome(S.one('SELECT * FROM subs WHERE id=?', sub.id));
    }
    entitlement(sub.uid);
    return S.one('SELECT * FROM subs WHERE id=?', sub.id);
  }
  async function syncPaddleSub(sub) {
    if (/^pd:/.test(sub.ext_id || '')) return syncPaddle(pdId(sub.ext_id));
    if (/^pdt:/.test(sub.ext_id || '')) {
      const r = await paddle('GET', '/transactions/' + encodeURIComponent(pdId(sub.ext_id)));
      const sid = r && r.data && r.data.subscription_id;
      if (sid) return syncPaddle(sid, { sid: sub.id, uid: sub.uid });
    }
    return null;
  }
  async function paddleTxn(d, ev) {
    // pagos y devoluciones de una suscripción (la transacción trae su suscripción)
    const subId = d.subscription_id || (d.transaction && d.transaction.subscription_id);
    const cd = d.custom_data || {};
    if (/^adjustment\./.test(ev)) {
      if (d.action === 'refund' || d.action === 'chargeback') {
        const key = 'pd:txn:' + String(d.transaction_id || ''), sub = subId && S.one('SELECT * FROM subs WHERE ext_id=?', 'pd:' + subId);
        if (sub) { S.run('INSERT INTO payments(ext_id,sid,uid,amount,status,ts,currency) VALUES(?,?,?,?,?,?,?) ON CONFLICT(ext_id) DO UPDATE SET status=excluded.status', key, sub.id, sub.uid, 0, d.action === 'refund' ? 'refunded' : 'charged_back', now(), 'USD'); audit(sub.uid, 'payment_' + d.action, { sid: sub.id }); }
      }
      return;
    }
    if (!subId) return;
    await syncPaddle(subId, { sid: cd.sid, uid: cd.uid });
    const sub = S.one('SELECT * FROM subs WHERE ext_id=?', 'pd:' + subId);
    if (sub && (d.status === 'completed' || d.status === 'paid') && /^txn_/.test(String(d.id || ''))) {
      const key = 'pd:txn:' + d.id, tot = d.details && d.details.totals ? +d.details.totals.grand_total || +d.details.totals.total || 0 : 0;
      if (tot > 0 && !S.one('SELECT 1 x FROM payments WHERE ext_id=?', key)) {
        S.run('INSERT INTO payments(ext_id,sid,uid,amount,status,ts,currency) VALUES(?,?,?,?,?,?,?)', key, sub.id, sub.uid, tot / 100, 'approved', now(), String(d.currency_code || 'USD').slice(0, 3));
        S.run('UPDATE subs SET paid_cycles=paid_cycles+1 WHERE id=?', sub.id);
        audit(sub.uid, 'payment', { sid: sub.id, id: d.id, amount: tot / 100, currency: d.currency_code || 'USD' });
      }
    }
  }
  /* al eliminar la cuenta: todas sus suscripciones se cancelan ya en su medio de pago (sin esto, seguirían cobrando).
     Si un medio de pago no responde, la cuenta no se elimina todavía */
  async function closeAccount(uid) {
    const bad = [];
    for (const s of S.all("SELECT * FROM subs WHERE uid=? AND status IN ('authorized','paused','pending','cancelled')", uid)) {
      if (s.status === 'cancelled' && !(s.next_payment > now())) continue;
      try {
        if (s.provider === 'ls') { if (/^ls:/.test(s.ext_id || '') && lsOn()) await ls('DELETE', '/v1/subscriptions/' + encodeURIComponent(lsId(s.ext_id))); }
        else if (s.provider === 'paddle') {
          if (/^pd:/.test(s.ext_id || '') && pdOn()) { try { await paddle('POST', `/subscriptions/${encodeURIComponent(pdId(s.ext_id))}/cancel`, { effective_from: 'immediately' }); } catch (e) { if (e.status !== 400 && e.status !== 404) throw e; } }
          else if (/^pdt:/.test(s.ext_id || '') && pdOn()) { try { await paddle('PATCH', '/transactions/' + encodeURIComponent(pdId(s.ext_id)), { status: 'canceled' }); } catch (e) { } }
        } else if (s.ext_id && mpOn()) await mp('PUT', '/preapproval/' + encodeURIComponent(s.ext_id), { status: 'cancelled' });
        S.run("UPDATE subs SET status='cancelled', note='cuenta eliminada', updated=? WHERE id=?", now(), s.id);
      } catch (e) {
        audit(uid, 'close_account_error', { sid: s.id, e: e.message });
        if (s.status === 'pending') continue;   // un pago sin terminar no cobra
        bad.push(s.provider === 'ls' ? 'Lemon Squeezy' : s.provider === 'paddle' ? 'Paddle' : 'Mercado Pago');
      }
    }
    if (bad.length) fail(502, `No pudimos cancelar tu suscripción en ${[...new Set(bad)].join(' y ')}. Tu cuenta sigue igual; inténtalo en unos minutos.`, 'cancel_failed');
    audit(uid, 'account_deleted', {});
  }

  /* firma de los avisos de Paddle: «ts=…;h1=…», HMAC-SHA256 de «ts:cuerpo»; solo si llegó hace menos de 5 minutos */
  function validPaddle(req, raw) {
    if (!PD.secret) return false;
    const parts = {}; for (const kv of String(req.headers['paddle-signature'] || '').split(';')) { const i = kv.indexOf('='); if (i > 0) (parts[kv.slice(0, i).trim()] = parts[kv.slice(0, i).trim()] || []).push(kv.slice(i + 1).trim()); }
    const ts = parts.ts && parts.ts[0];
    if (!ts || !/^\d{9,12}$/.test(ts) || Math.abs(Date.now() / 1000 - +ts) > 300) return false;
    const h = crypto.createHmac('sha256', PD.secret).update(ts + ':').update(raw).digest('hex');
    return (parts.h1 || []).some(v => { try { return v.length === h.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(v)); } catch (e) { return false; } });
  }

  /* ---------- hasta cuándo y con qué plan: suscripciones, meses regalados o cortesía ---------- */
  function entitlement(uid) {
    const u = userById(uid); if (!u) return;
    let grant = u.grant_until || 0, gplan = isPaidPlan(u.grant_plan) ? u.grant_plan : 'pro';
    if (isPaidPlan(u.plan) && !u.pro_until && !grant) { grant = FOREVER; gplan = u.plan; }   // plan sin fecha (asignado a mano)
    const src = grant ? [{ plan: gplan, end: grant }] : [];
    for (const s of S.all("SELECT * FROM subs WHERE uid=? AND status<>'pending'", uid)) {
      let end = 0;
      if (s.status === 'paused') end = (s.resume_at || s.next_payment || 0) + GRACE;
      else if (s.note === 'mes gratis repetido' && !s.paid_cycles) end = 0;
      else end = (s.next_payment || 0) + (s.status === 'authorized' ? GRACE : 0);
      if (end) src.push({ plan: isPaidPlan(s.plan) ? s.plan : 'pro', end });
    }
    const t = now(), live = src.filter(x => x.end > t);
    let plan = 'free', end = src.reduce((m, x) => Math.max(m, x.end), 0);
    if (live.length) {
      plan = live.reduce((b, x) => TIER[x.plan] > TIER[b] ? x.plan : b, live[0].plan);
      end = live.filter(x => x.plan === plan).reduce((m, x) => Math.max(m, x.end), 0);
    }
    const before = planOf(u);
    S.run('UPDATE users SET plan=?, pro_until=?, grant_until=?, grant_plan=? WHERE id=?', plan, end || null, grant || null, grant ? gplan : null, uid);
    if (before !== plan) { audit(uid, 'plan', { plan, until: end }); if (api) api.planChanged(uid); }
  }

  /* ---------- regalar días de un plan (cortesía, desde el panel) ---------- */
  async function grantDays(uid, days, kind, note, plan = 'pro') {
    plan = isPaidPlan(plan) ? plan : 'pro';   // indie, pro o studio
    const sub = activeSub(uid);
    if (sub && sub.provider === 'mp' && (sub.plan || 'pro') === plan && mpOn()) {
      // con suscripción de Mercado Pago del mismo plan: se pausa el cobro y se reanuda al terminar los días regalados
      const from = Math.max(sub.resume_at || 0, sub.next_payment || 0, now());
      const resume = from + days * DAY;
      try {
        if (sub.status === 'authorized') await mp('PUT', '/preapproval/' + encodeURIComponent(sub.ext_id), { status: 'paused' });
        S.run("UPDATE subs SET status='paused', resume_at=?, updated=? WHERE id=?", resume, now(), sub.id);
      } catch (e) {
        audit(uid, 'pause_error', { sid: sub.id, e: e.message });
        S.run('UPDATE users SET grant_until=?, grant_plan=? WHERE id=?', Math.max(userById(uid).grant_until || 0, now()) + days * DAY, plan, uid);
      }
    } else {
      const u = userById(uid);
      S.run('UPDATE users SET grant_until=?, grant_plan=? WHERE id=?', Math.max(u.grant_until || 0, now()) + days * DAY, plan, uid);
    }
    S.run('INSERT INTO rewards(id,uid,kind,days,ts,note) VALUES(?,?,?,?,?,?)', 'r' + rid(8), uid, kind, days, now(), note || null);
    audit(uid, 'grant', { days, kind, note, plan });
    entitlement(uid);
  }

  /* ---------- tareas periódicas ---------- */
  async function hourly() {
    const t = now();
    // reanudar los cobros pausados por días regalados (Mercado Pago)
    for (const s of S.all("SELECT * FROM subs WHERE provider='mp' AND status='paused' AND resume_at IS NOT NULL AND resume_at<=?", t)) {
      try { await mp('PUT', '/preapproval/' + encodeURIComponent(s.ext_id), { status: 'authorized' }); S.run("UPDATE subs SET status='authorized', resume_at=NULL WHERE id=?", s.id); await syncPre(s.ext_id); }
      catch (e) { audit(s.uid, 'resume_error', { sid: s.id, e: e.message }); }
    }
    // revisar las suscripciones vivas con su medio de pago (por si se perdió un aviso)
    for (const s of S.all("SELECT * FROM subs WHERE status IN ('authorized','paused','pending') AND (updated<? OR (next_payment IS NOT NULL AND next_payment<?))", t - DAY, t + DAY)) {
      if (s.status === 'pending' && t - s.created > 7 * DAY) { await dropPending(s, 'sin completar'); continue; }
      if (!s.ext_id || (s.provider === 'ls' ? !lsOn() : s.provider === 'paddle' ? !pdOn() : !mpOn())) continue;
      try { await syncAny(s); } catch (e) { S.run('UPDATE subs SET updated=? WHERE id=?', t, s.id); }
    }
    // aviso 3 días antes del primer cobro, al terminar el mes gratis (Mercado Pago)
    for (const s of S.all("SELECT s.*, u.email, u.name FROM subs s JOIN users u ON u.id=s.uid WHERE s.provider='mp' AND s.status='authorized' AND s.trial>0 AND s.paid_cycles=0 AND s.reminded IS NULL AND s.next_payment IS NOT NULL AND s.next_payment<?", t + 3 * DAY)) {
      S.run('UPDATE subs SET reminded=? WHERE id=?', t, s.id);
      const d = new Date(s.next_payment).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', timeZone: 'America/Lima' });
      mail.send({ to: s.email, subject: `Tu mes gratis de FilmSpirit ${PLAN_NAME[s.plan || 'pro']} termina pronto`, text: `Hola ${s.name}:\n\nTu mes gratis de FilmSpirit ${PLAN_NAME[s.plan || 'pro']} termina el ${d}. Ese día Mercado Pago cobrará ${money(s.amount, 'PEN')} ${s.cycle === 'year' ? 'por el año' : 'por el mes'}.\n\nSi no quieres continuar, cancela antes desde el botón de tu cuenta en la app: no se cobrará nada.\n\nFilmSpirit` });
    }
    // plan que venció (sin suscripción o fin de días regalados)
    for (const u of S.all("SELECT id FROM users WHERE plan IN ('indie','pro','studio') AND pro_until IS NOT NULL AND pro_until<?", t)) entitlement(u.id);
    // proyectos eliminados hace más de 30 días: se borran del todo
    S.run('DELETE FROM projects WHERE deleted IS NOT NULL AND deleted<?', t - 30 * DAY);
    S.run('DELETE FROM audit WHERE ts<?', t - 400 * DAY);
  }

  /* ---------- avisos (webhooks) ---------- */
  // sin MP_WEBHOOK_SECRET no se acepta ningún aviso (el repaso de cada hora mantiene las suscripciones al día igual)
  if (MP.token && !MP.secret) console.warn('Aviso: falta MP_WEBHOOK_SECRET; los avisos de Mercado Pago se rechazan hasta configurarla.');
  function validSignature(req, url) {
    if (!MP.secret) return false;
    const sig = String(req.headers['x-signature'] || ''), rq = String(req.headers['x-request-id'] || '');
    const parts = Object.fromEntries(sig.split(',').map(p => p.split('=').map(x => x.trim())));
    const id = String(url.searchParams.get('data.id') || '').toLowerCase();
    if (!parts.ts || !parts.v1) return false;
    let manifest = '';
    if (id) manifest += `id:${id};`;
    if (rq) manifest += `request-id:${rq};`;
    manifest += `ts:${parts.ts};`;
    const h = crypto.createHmac('sha256', MP.secret).update(manifest).digest('hex');
    try { return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(parts.v1)); } catch (e) { return false; }
  }
  function validLs(req, raw) {
    if (!LS.secret) return false;    // sin clave secreta no se acepta ningún aviso
    const sig = String(req.headers['x-signature'] || '');
    const h = crypto.createHmac('sha256', LS.secret).update(raw).digest('hex');
    try { return sig.length === h.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig)); } catch (e) { return false; }
  }

  /* ---------- rutas ---------- */
  async function handle(req, res, url, dev) {
    const p = url.pathname;
    if (p === '/api/billing/webhook' && req.method === 'POST') {
      rateLimit('mp:' + req.ip, 600, 60e3);
      const raw = await readBody(req, 64 * 1024);
      let b = {}; try { b = JSON.parse(raw.toString('utf8') || '{}'); } catch (e) { }
      if (!validSignature(req, url)) { badSig('mp', req); return sendJSON(res, 401, { ok: false }); }
      const type = String(b.type || url.searchParams.get('type') || url.searchParams.get('topic') || '');
      const id = String((b.data && b.data.id) || url.searchParams.get('data.id') || url.searchParams.get('id') || '');
      sendJSON(res, 200, { ok: true });   // se responde de inmediato; la lectura en Mercado Pago va después
      if (!mpOn() || !/^[\w-]{1,64}$/.test(id)) return true;
      try {
        if (/subscription_preapproval$|^preapproval$/.test(type)) await syncPre(id);
        else if (/authorized_payment/.test(type)) await syncPayment(id);
      } catch (e) { console.warn('aviso de Mercado Pago:', e.message); audit(null, 'mp_webhook_error', { type, id, e: e.message }); }
      return true;
    }
    if (p === '/api/billing/paddle-webhook' && req.method === 'POST') {
      rateLimit('pd:' + req.ip, 600, 60e3);
      const raw = await readBody(req, 512 * 1024);
      if (!validPaddle(req, raw)) { badSig('paddle', req); return sendJSON(res, 401, { ok: false }); }
      let b = {}; try { b = JSON.parse(raw.toString('utf8') || '{}'); } catch (e) { }
      sendJSON(res, 200, { ok: true });
      const ev = String(b.event_type || ''), d = b.data || {};
      if (!pdOn()) return true;
      try {
        if (/^subscription\./.test(ev)) await syncPaddle(String(d.id || ''), { sid: (d.custom_data || {}).sid, uid: (d.custom_data || {}).uid });
        else if (/^(transaction|adjustment)\./.test(ev)) await paddleTxn(d, ev);
      } catch (e) { console.warn('aviso de Paddle:', e.message); audit(null, 'paddle_webhook_error', { ev, id: d.id, e: e.message }); }
      return true;
    }
    if (p === '/api/billing/ls-webhook' && req.method === 'POST') {
      rateLimit('ls:' + req.ip, 600, 60e3);
      const raw = await readBody(req, 512 * 1024);
      if (!validLs(req, raw)) { badSig('ls', req); return sendJSON(res, 401, { ok: false }); }
      let b = {}; try { b = JSON.parse(raw.toString('utf8') || '{}'); } catch (e) { }
      sendJSON(res, 200, { ok: true });
      const meta = b.meta || {}, ev = String(meta.event_name || ''), d = b.data || {}, custom = meta.custom_data || {};
      if (!lsOn() || !/^\d{1,20}$/.test(String(d.id || ''))) return true;
      try {
        if (d.type === 'subscriptions') await syncLs(String(d.id), { sid: custom.sid, uid: custom.uid });
        else if (d.type === 'subscription-invoices') await lsInvoice(d, ev, { sid: custom.sid, uid: custom.uid });
      } catch (e) { console.warn('aviso de Lemon Squeezy:', e.message); audit(null, 'ls_webhook_error', { ev, id: d.id, e: e.message }); }
      return true;
    }
    if (p === '/api/geo' && req.method === 'GET') {
      const g = countryOf(req, String(url.searchParams.get('tz') || ''));
      return sendJSON(res, 200, { country: g.country, region: regionOf(g.country), src: g.src });
    }
    if (!p.startsWith('/api/billing')) return false;
    const u = auth.requireUser(req);
    if (req.method !== 'GET') auth.checkWrite(req);
    if (p === '/api/billing' && req.method === 'GET') {
      const sub = S.one("SELECT * FROM subs WHERE uid=? AND status IN ('authorized','paused') ORDER BY created DESC LIMIT 1", u.id)
        || S.one("SELECT * FROM subs WHERE uid=? AND status='cancelled' AND next_payment>? ORDER BY created DESC LIMIT 1", u.id, now());
      const g = countryOf(req, String(url.searchParams.get('tz') || ''));
      const country = g.country || u.country || '';
      return sendJSON(res, 200, {
        enabled: enabled(), providers: { mp: mpOn(), ls: !!intlProv(), paddle: pdOn() }, intl: intlProv(), country, region: regionOf(country),
        prices: PRICES, trial: trialAvailable(u, dev), trialIntl: pdOn() ? (PD.trial.month ? 30 : 0) : LS.trialDays, promo: u.promo || null,
        founder: founderNow() ? { until: FOUNDER.until, PEN: FOUNDER.PEN, pct: FOUNDER.pct, code: FOUNDER.code } : null, studioOpen: !!cfg.studioOpen,
        plans: Object.fromEntries(Object.entries(PLANS).map(([k, x]) => [k, { projects: x.projects, scripts: x.scripts, members: x.members, writers: x.writers, storageMB: x.storageMB, archived: x.archived, gastos: !!x.gastos }])),
        sub: sub ? { plan: sub.plan || 'pro', provider: sub.provider, currency: sub.currency, cycle: sub.cycle, status: sub.status, amount: sub.amount, base: sub.base_amount, next: sub.next_payment, trial: sub.trial, code: sub.code, resume: sub.resume_at, note: sub.note, portal: sub.portal || null } : null,
        grantUntil: u.grant_until && u.grant_until > now() ? u.grant_until : null, grantPlan: u.grant_plan || null,
      });
    }
    if (p === '/api/billing/quote' && req.method === 'POST') {
      rateLimit('q:' + u.id, 60, 600e3);
      const b = await readJSON(req, 4096);
      return sendJSON(res, 200, quote(u, b.cycle, b.code, dev, { plan: b.plan, region: b.region }));
    }
    if (p === '/api/billing/checkout' && req.method === 'POST') {
      rateLimit('co:' + u.id, 10, 600e3);
      const b = await readJSON(req, 4096);
      return sendJSON(res, 200, await checkout(u, b, dev));
    }
    if (p === '/api/billing/sync' && req.method === 'POST') {
      rateLimit('bsync:' + u.id, 30, 600e3);   // cada llamada consulta al medio de pago con la clave de la tienda
      const b = await readJSON(req, 4096);
      const sub = S.one('SELECT * FROM subs WHERE id=? AND uid=?', String(b.sid || ''), u.id);
      if (sub) {
        try {
          if (sub.provider === 'paddle') { if (pdOn()) await syncPaddleSub(sub); }
          else if (sub.provider === 'ls') {
            if (sub.ext_id && lsOn()) await syncLs(lsId(sub.ext_id));
            // sin aviso aún: se busca la suscripción por el correo de la cuenta
            else if (lsOn()) {
              const r = await ls('GET', '/v1/subscriptions?filter[store_id]=' + encodeURIComponent(LS.store) + '&filter[user_email]=' + encodeURIComponent(u.email));
              const cand = (r.data || []).filter(x => !S.one('SELECT 1 x FROM subs WHERE ext_id=?', 'ls:' + x.id)).sort((x, y) => Date.parse(y.attributes.created_at) - Date.parse(x.attributes.created_at))[0];
              if (cand && Date.parse(cand.attributes.created_at) >= sub.created - 60e3) await syncLs(String(cand.id), { sid: sub.id, uid: u.id });
            }
          } else if (mpOn()) {
            if (sub.ext_id) await syncPre(sub.ext_id);
            else { const r = await mp('GET', '/preapproval/search?external_reference=' + encodeURIComponent(sub.id)); const pre = r.results && r.results[0]; if (pre) await syncPre(pre.id); }
          }
        } catch (e) { audit(u.id, 'sync_error', { e: e.message }); }
      }
      return sendJSON(res, 200, auth.userJSON(userById(u.id)));
    }
    if (p === '/api/billing/cancel' && req.method === 'POST') {
      rateLimit('bcancel:' + u.id, 10, 600e3);
      const sub = activeSub(u.id);
      if (!sub) fail(404, 'No tienes una suscripción activa.', 'no_sub');
      if (sub.provider === 'ls') await ls('DELETE', '/v1/subscriptions/' + encodeURIComponent(lsId(sub.ext_id)));
      else if (sub.provider === 'paddle') await paddle('POST', `/subscriptions/${encodeURIComponent(pdId(sub.ext_id))}/cancel`, { effective_from: 'next_billing_period' });
      else await mp('PUT', '/preapproval/' + encodeURIComponent(sub.ext_id), { status: 'cancelled' });
      audit(u.id, 'cancel', { sid: sub.id });
      await syncAny(sub);
      return sendJSON(res, 200, { ok: true, until: userById(u.id).pro_until });
    }
    // recibos y medio de pago en Paddle: un enlace de un solo uso al portal del cliente
    if (p === '/api/billing/portal' && req.method === 'POST') {
      rateLimit('portal:' + u.id, 20, 600e3);
      const sub = S.one("SELECT * FROM subs WHERE uid=? AND provider='paddle' AND ext_id LIKE 'pd:%' AND status IN ('authorized','paused','cancelled') ORDER BY created DESC LIMIT 1", u.id);
      if (!sub || !sub.payer_id || !pdOn()) fail(404, 'No hay recibos para mostrar.', 'no_sub');
      // el portal muestra todo lo de ese cliente de Paddle: solo se abre si es de esta cuenta (su correo, o uno que no es de
      // ninguna otra cuenta ni lo usa otra cuenta)
      const c = await paddle('GET', `/customers/${encodeURIComponent(sub.payer_id)}`);
      const cm = normEmail((c && c.data && c.data.email) || '');
      const mine = cm === normEmail(u.email) || (cm && !S.one('SELECT 1 x FROM users WHERE email=? AND id<>?', cm, u.id) && !paddleShared(sub.payer_id, u.id));
      if (!mine) { audit(u.id, 'portal_denied', { sid: sub.id, ctm: sub.payer_id }); fail(403, 'Ese medio de pago está a nombre de otra cuenta. Escríbenos y lo revisamos.', 'not_owner'); }
      const r = await paddle('POST', `/customers/${encodeURIComponent(sub.payer_id)}/portal-sessions`, { subscription_ids: [pdId(sub.ext_id)] });
      const url = r && r.data && r.data.urls && r.data.urls.general && r.data.urls.general.overview;
      if (!url || !/^https:\/\//.test(url)) fail(502, 'Paddle no devolvió el enlace.', 'bad_gateway');
      return sendJSON(res, 200, { url });
    }
    fail(404, 'No encontrado', 'not_found');
  }

  let timer = null;
  const start = () => { if (!timer) { timer = setInterval(() => hourly().catch(e => console.warn('tareas:', e.message)), 3600e3); timer.unref(); setTimeout(() => hourly().catch(() => { }), 20000).unref(); } };
  return { handle, onLogin, entitlement, grantDays, hourly, closeAccount, syncPre, syncPayment, syncLs, syncPaddle, syncAny, quote, start, enabled, mpOn, lsOn, pdOn, intlProv, PRICE, PRICES, PD, audit };
}

module.exports = { makeBilling, FOREVER };
