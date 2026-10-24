'use strict';
/* Planes Free, Pro y Studio: proyectos activos, personas por proyecto, archivar;
   pagos fuera del Perú con un Lemon Squeezy simulado; país, idioma y precios de la portada */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

/* ---------- Lemon Squeezy y Mercado Pago de mentira ---------- */
const LSS = { subs: {}, checkouts: [], n: 100, calls: [] };
const MPS = { pre: {}, n: 0 };
const DAY = 864e5;
const mock = http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c;
  const b = body ? JSON.parse(body) : {};
  const u = new URL(req.url, 'http://x');
  LSS.calls.push(`${req.method} ${u.pathname}`);
  const send = (st, o) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  let m;
  if (u.pathname.startsWith('/v1/')) {
    if (req.headers.authorization !== 'Bearer LS-KEY') return send(401, { errors: [{ detail: 'key' }] });
    if (req.method === 'POST' && u.pathname === '/v1/checkouts') { LSS.checkouts.push(b); return send(201, { data: { type: 'checkouts', id: 'c' + LSS.checkouts.length, attributes: { url: 'https://ls.test/checkout/' + LSS.checkouts.length } } }); }
    if (req.method === 'GET' && u.pathname === '/v1/subscriptions') return send(200, { data: Object.values(LSS.subs).filter(s => s.attributes.user_email === u.searchParams.get('filter[user_email]')) });
    if ((m = /^\/v1\/subscriptions\/(\d+)$/.exec(u.pathname))) {
      const s = LSS.subs[m[1]]; if (!s) return send(404, { errors: [{ detail: 'no existe' }] });
      if (req.method === 'DELETE') { s.attributes.status = 'cancelled'; s.attributes.cancelled = true; s.attributes.ends_at = s.attributes.renews_at; }
      return send(200, { data: s });
    }
    return send(404, {});
  }
  if (req.headers.authorization !== 'Bearer MP-TOKEN') return send(401, { message: 'token' });
  if (req.method === 'POST' && u.pathname === '/preapproval') {
    const id = 'pre' + (++MPS.n);
    MPS.pre[id] = { id, status: 'pending', ...b, init_point: 'https://mp.test/checkout?preapproval_id=' + id };
    return send(201, MPS.pre[id]);
  }
  if ((m = /^\/preapproval\/(\w+)$/.exec(u.pathname))) {
    const p = MPS.pre[m[1]]; if (!p) return send(404, { message: 'no existe' });
    if (req.method === 'PUT' && b.status) p.status = b.status;
    return send(200, p);
  }
  send(404, {});
});
function lsSub(email, variant, status = 'active') {
  const id = String(++LSS.n);
  LSS.subs[id] = { type: 'subscriptions', id, attributes: { status, variant_id: variant, customer_id: 77, user_email: email, renews_at: new Date(Date.now() + 30 * DAY).toISOString(), ends_at: null, trial_ends_at: null, created_at: new Date().toISOString(), urls: { customer_portal: 'https://ls.test/portal/' + id } } };
  return LSS.subs[id];
}
const LS_SECRET = 'ls-secreto';
let S, H, base;
async function lsHook(event, data, custom, { sign = true } = {}) {
  const raw = JSON.stringify({ meta: { event_name: event, custom_data: custom || {} }, data });
  const sig = sign ? crypto.createHmac('sha256', LS_SECRET).update(raw).digest('hex') : 'f'.repeat(64);
  const r = await fetch(base + '/api/billing/ls-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature': sig }, body: raw });
  await new Promise(r => setTimeout(r, 150));
  return r.status;
}
const login = async (c, email, more) => (await c.post('/api/auth/google', { credential: S.token(email, email.split('@')[0]), ...(more || {}) })).json;
const user = email => S.S.one('SELECT * FROM users WHERE email=?', email);
const sec = t => ({ guion: JSON.stringify({ meta: { title: t }, paras: [] }) });

test.before(async () => {
  await new Promise(r => mock.listen(0, '127.0.0.1', r));
  const mb = `http://127.0.0.1:${mock.address().port}`;
  Object.assign(process.env, {
    MP_ACCESS_TOKEN: 'MP-TOKEN', MP_API_BASE: mb, MP_WEBHOOK_SECRET: '',
    LS_API_KEY: 'LS-KEY', LS_STORE_ID: '9', LS_WEBHOOK_SECRET: LS_SECRET, LS_API_BASE: mb,
    LS_VARIANT_PRO_MONTH: '501', LS_VARIANT_PRO_YEAR: '502', LS_VARIANT_STUDIO_MONTH: '601', LS_VARIANT_STUDIO_YEAR: '602',
  });
  H = require('./helpers');
  S = await H.start({ ADMIN_EMAILS: 'admin@prueba.pe', FOUNDER_UNTIL: '2020-01-01', STUDIO_OPEN: '1' });
  base = S.base;
});
test.after(async () => { await S.stop(); mock.close(); });

const secP = t => ({ ...sec(t), desglose: JSON.stringify({ items: [] }) });
const mk = (c, t, kind) => c.post('/api/projects', { sections: kind === 'prod' ? secP(t) : sec(t), ...(kind ? { kind } : {}) });

test('plan Guion: 5 guiones activos, sin proyectos de producción; archivar libera el lugar', async () => {
  const A = H.client(base); await login(A, 'libre@prueba.pe');
  // sin decir el tipo, el plan Guion crea guiones
  let r = await mk(A, 'Uno'); assert.equal(r.status, 201, r.text);
  const p1 = r.json.pid;
  r = await A.get(`/api/p/${p1}?full=1`); assert.equal(r.json.kind, 'guion'); assert.deepEqual(r.json.read, ['guion']);
  // un proyecto de producción pide plan
  r = await mk(A, 'Prod', 'prod'); assert.equal(r.status, 403); assert.equal(r.json.code, 'need_plan'); assert.match(r.json.error, /30 días/);
  // un guion solo guarda texto del guion y notas
  r = await A.put(`/api/p/${p1}/s/desglose`, { json: '{"items":[]}', base: 0 }); assert.equal(r.json.code, 'script_only');
  r = await A.get(`/api/p/${p1}/s/plan`); assert.equal(r.json.code, 'script_only');
  r = await A.put(`/api/p/${p1}/f`, { k: 'sh1', url: 'data:image/png;base64,AAAA' }); assert.equal(r.json.code, 'script_only');
  for (let i = 2; i <= 5; i++) assert.equal((await mk(A, 'G' + i)).status, 201);
  r = await mk(A, 'G6'); assert.equal(r.json.code, 'limit_scripts'); assert.match(r.json.error, /Guion permite 5/);
  r = await A.get('/api/me'); assert.equal(r.json.plan, 'free'); assert.equal(r.json.scripts, 5); assert.equal(r.json.own, 0);
  assert.equal(r.json.limits.scripts, 5); assert.equal(r.json.limits.projects, 0); assert.equal(r.json.limits.writers, 4);
  // archivar: queda en solo lectura y libera el lugar
  r = await A.post(`/api/p/${p1}/archive`, { archived: true });
  assert.equal(r.status, 200); assert.ok(r.json.archived); assert.equal(r.json.me.scripts, 4); assert.equal(r.json.me.archived, 1);
  r = await A.get(`/api/p/${p1}?full=1`); assert.equal(r.json.readonly, 'archived');
  r = await A.put(`/api/p/${p1}/s/guion`, { json: sec('Uno bis').guion, base: 1 });
  assert.equal(r.status, 403); assert.equal(r.json.code, 'read_only'); assert.match(r.json.error, /archivado/);
  r = await A.get('/api/projects'); assert.ok(r.json.find(x => x.id === p1).archived); assert.equal(r.json.find(x => x.id === p1).kind, 'guion');
  r = await mk(A, 'G6'); assert.equal(r.status, 201, 'con uno archivado, se puede crear');
  const p6 = r.json.pid;
  // desarchivar exige un lugar libre
  r = await A.post(`/api/p/${p1}/archive`, { archived: false }); assert.equal(r.json.code, 'limit_scripts');
  await A.post(`/api/p/${p6}/archive`, { archived: true });
  r = await A.post(`/api/p/${p1}/archive`, { archived: false }); assert.equal(r.status, 200); assert.equal(r.json.archived, null);
  r = await A.put(`/api/p/${p1}/s/guion`, { json: sec('Uno bis').guion, base: 1 }); assert.equal(r.status, 200, 'desarchivado se edita');
  // llevar a producción sin plan: se ofrece la prueba
  r = await A.post(`/api/p/${p1}/produce`, {}); assert.equal(r.json.code, 'need_plan');
});

test('Indie 2, Pro 7, Studio 20 proyectos de producción; guiones sin límite; llevar a producción; bajar de plan', async () => {
  const A = H.client(base); await login(A, 'indie@prueba.pe');
  const g = (await mk(A, 'Guion suelto')).json.pid;
  S.S.run("UPDATE users SET plan='indie' WHERE email='indie@prueba.pe'");
  let r = await A.get('/api/me');
  assert.equal(r.json.limits.projects, 2); assert.equal(r.json.limits.members, 1); assert.equal(r.json.limits.scripts, null); assert.equal(r.json.limits.photos, true);
  assert.deepEqual(r.json.plans.studio, { projects: 20, scripts: null, members: 60, writers: 4, storageMB: 100000, archived: 200, gastos: true });
  assert.deepEqual([r.json.plans.indie.storageMB, r.json.plans.pro.storageMB], [5000, 20000]);
  // con plan, sin decir el tipo: producción
  r = await mk(A, 'Corto'); assert.equal(r.status, 201); const c1 = r.json.pid;
  r = await A.get(`/api/p/${c1}?full=1`); assert.equal(r.json.kind, 'prod'); assert.ok(r.json.read.includes('desglose'));
  r = await mk(A, 'Corto 2', 'prod'); assert.equal(r.status, 201); const c2 = r.json.pid;
  r = await mk(A, 'Corto 3', 'prod'); assert.equal(r.json.code, 'limit_projects'); assert.match(r.json.error, /Indie permite 2.*Pro \(7\)/);
  for (let i = 0; i < 6; i++) assert.equal((await mk(A, 'Guion ' + i, 'guion')).status, 201, 'guiones sin límite');
  // llevar el guion a producción: cuenta en los proyectos del plan
  r = await A.post(`/api/p/${g}/produce`, {}); assert.equal(r.json.code, 'limit_projects');
  await A.post(`/api/p/${c2}/archive`, { archived: true });
  r = await A.post(`/api/p/${g}/produce`, {}); assert.equal(r.status, 200, r.text); assert.equal(r.json.kind, 'prod'); assert.equal(r.json.me.own, 2);
  assert.ok(r.json.state.read.includes('desglose'));
  r = await A.put(`/api/p/${g}/s/desglose`, { json: '{"items":[]}', base: 0 }); assert.equal(r.status, 200, r.text);
  // Pro: 7
  S.S.run("UPDATE users SET plan='pro' WHERE email='indie@prueba.pe'");
  for (let i = 0; i < 5; i++) assert.equal((await mk(A, 'P' + i, 'prod')).status, 201);
  r = await mk(A, 'P5', 'prod'); assert.equal(r.json.code, 'limit_projects'); assert.match(r.json.error, /Pro permite 7.*Studio \(20\)/);
  // Studio: 20
  S.S.run("UPDATE users SET plan='studio' WHERE email='indie@prueba.pe'");
  r = await mk(A, 'S1', 'prod'); assert.equal(r.status, 201);
  r = await A.get('/api/me'); assert.equal(r.json.plan, 'studio'); assert.equal(r.json.limits.projects, 20); assert.equal(r.json.own, 8);
  // al bajar a Indie con 8 activos: 2 siguen editables y 6 quedan en solo lectura; los guiones siguen editables
  S.S.run("UPDATE users SET plan='indie' WHERE email='indie@prueba.pe'");
  const list = (await A.get('/api/projects')).json.filter(x => !x.archived);
  let ro = 0, rog = 0;
  for (const x of list) { const st = (await A.get(`/api/p/${x.id}`)).json; if (st.readonly === 'plan') x.kind === 'prod' ? ro++ : rog++; }
  assert.equal(list.filter(x => x.kind === 'prod').length, 8); assert.equal(ro, 6); assert.equal(rog, 0);
  // y en el plan Guion: los proyectos de producción quedan en solo lectura y se pueden ver
  S.S.run("UPDATE users SET plan='free' WHERE email='indie@prueba.pe'");
  r = await A.get(`/api/p/${c1}?full=1`); assert.equal(r.json.readonly, 'plan'); assert.ok(r.json.read.includes('desglose'));
  r = await A.put(`/api/p/${c1}/s/desglose`, { json: '{"items":[1]}', base: 1 }); assert.equal(r.status, 403);
  r = await A.post(`/api/p/${c2}/archive`, { archived: false }); assert.equal(r.json.code, 'need_plan');
});

test('personas por proyecto: Indie solo tú, Pro 30, Studio 60; un guion, hasta 4', async () => {
  const A = H.client(base); await login(A, 'equipo@prueba.pe');
  const emails = n => Array.from({ length: n }, (_, i) => `p${i}@x.pe`);
  // en el plan Guion: hasta 3 coescritores, solo con el guion
  const g = (await mk(A, 'Coescrito')).json.pid;
  const addTo = (pid, list, perms = { guion: 'ver' }) => A.put(`/api/p/${pid}/team`, { list: list.map(email => ({ add: true, email, role: 'Guion', perms })) });
  let r = await addTo(g, ['a@x.pe', 'b@x.pe', 'c@x.pe'], { guion: 'editar', plan: 'editar', budget: 'ver' }); assert.equal(r.status, 200, r.text);
  const perms = S.S.all('SELECT perms FROM invites WHERE pid=?', g).map(x => JSON.parse(x.perms));
  assert.ok(perms.every(x => Object.keys(x).join() === 'guion' && x.guion === 'editar'), JSON.stringify(perms));
  r = await addTo(g, ['d@x.pe']); assert.equal(r.json.code, 'limit_members'); assert.match(r.json.error, /hasta 4 personas/);
  // Indie: solo tú
  S.S.run("UPDATE users SET plan='indie' WHERE email='equipo@prueba.pe'");
  const pid = (await mk(A, 'Equipo', 'prod')).json.pid;
  r = await addTo(pid, ['e@x.pe']); assert.equal(r.json.code, 'limit_members'); assert.match(r.json.error, /Indie es para una sola persona.*Pro \(hasta 30/);
  // Pro: 30 contándote a ti
  S.S.run("UPDATE users SET plan='pro' WHERE email='equipo@prueba.pe'");
  r = await addTo(pid, emails(29)); assert.equal(r.status, 200, r.text);
  r = await addTo(pid, ['k@x.pe']); assert.equal(r.json.code, 'limit_members'); assert.match(r.json.error, /Pro permite 30.*Studio, hasta 60/);
  S.S.run("UPDATE users SET plan='studio' WHERE email='equipo@prueba.pe'");
  r = await addTo(pid, ['k@x.pe']); assert.equal(r.status, 200);
  // el guion sigue con 4 aunque el plan sea Studio
  r = await addTo(g, ['d@x.pe']); assert.equal(r.json.code, 'limit_members');
});

test('país: zona horaria, cabecera del proxy e idioma del navegador', async () => {
  let r = await fetch(base + '/api/geo?tz=America/Lima').then(r => r.json()); assert.equal(r.region, 'pe');
  // la cabecera de país solo vale si GEO_HEADER dice que la pone el proxy (sin proxy, cualquiera la inventa)
  r = await fetch(base + '/api/geo?tz=America/Lima', { headers: { 'CF-IPCountry': 'BR' } }).then(r => r.json()); assert.deepEqual([r.country, r.region], ['PE', 'pe']);
  process.env.GEO_HEADER = 'CF-IPCountry';
  r = await fetch(base + '/api/geo?tz=America/Lima', { headers: { 'CF-IPCountry': 'BR' } }).then(r => r.json()); assert.deepEqual([r.country, r.region], ['BR', 'intl']);
  delete process.env.GEO_HEADER;
  r = await fetch(base + '/api/geo', { headers: { 'Accept-Language': 'es-PE,es;q=0.9' } }).then(r => r.json()); assert.equal(r.region, 'pe');
  r = await fetch(base + '/api/geo', { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }).then(r => r.json()); assert.deepEqual([r.country, r.region], ['US', 'intl']);
});

test('portada en el idioma y con los precios de la región', async () => {
  fs.writeFileSync(path.join(S.tmp, 'public', 'index.html'), '<html lang="__LANG__" data-region="__REGION__"><h1>{{t.hero_h1}}</h1><b>__P_PRO_M__</b><i>__P_ST_M__</i>__LANG_LINKS__</html>');
  let r = await fetch(base + '/', { headers: { 'Accept-Language': 'fr-FR,fr;q=0.9', 'CF-IPCountry': 'FR' } });
  let t = await r.text();
  assert.match(t, /lang="fr"/); assert.match(t, /Du scénario au tournage/); assert.match(t, /US\$ 14,99/); assert.match(t, /US\$ 39/);
  assert.match(r.headers.get('vary'), /Accept-Language/);
  r = await fetch(base + '/?lang=pt', { headers: { 'Accept-Language': 'es-PE' } });
  t = await r.text();
  assert.match(t, /Do roteiro à filmagem/); assert.match(t, /S\/ 49/); assert.match(t, /S\/ 129/);
  assert.match(r.headers.get('set-cookie'), /fs_lang=pt/);
  r = await fetch(base + '/', { headers: { Cookie: 'fs_lang=it' } });
  assert.match(await r.text(), /lang="it"/);
  r = await fetch(base + '/', { headers: { 'Accept-Language': 'de-DE' } });
  assert.match(await r.text(), /lang="es"/, 'otro idioma: español');
});

test('Studio fuera del Perú con Lemon Squeezy: checkout, aviso firmado, pago y cancelación', async () => {
  const A = H.client(base); await login(A, 'nyc@prueba.com', { tz: 'America/New_York' });
  let r = await A.get('/api/billing?tz=America/New_York');
  assert.equal(r.json.region, 'intl'); assert.deepEqual(r.json.providers, { mp: true, ls: true, paddle: false }); assert.deepEqual(r.json.prices.USD.studio, { month: 39, year: 390 });
  r = await A.post('/api/billing/quote', { plan: 'studio', cycle: 'month', region: 'intl' });
  assert.equal(r.json.amount, 39); assert.equal(r.json.currency, 'USD'); assert.equal(r.json.provider, 'ls'); assert.equal(r.json.trialDays, 0);
  r = await A.post('/api/billing/checkout', { plan: 'studio', cycle: 'month', region: 'intl' });
  assert.equal(r.status, 200, r.text); assert.match(r.json.url, /^https:\/\/ls\.test\/checkout\//);
  const sid = r.json.sid, ck = LSS.checkouts.at(-1);
  assert.equal(ck.data.relationships.variant.data.id, '601');
  assert.equal(ck.data.relationships.store.data.id, '9');
  assert.deepEqual(ck.data.attributes.checkout_data.custom, { uid: user('nyc@prueba.com').id, sid });
  assert.match(ck.data.attributes.product_options.redirect_url, new RegExp('/app/\\?pago=' + sid));
  assert.equal(user('nyc@prueba.com').plan, 'free', 'pendiente');
  // aviso sin firma válida: rechazado
  const s = lsSub('nyc@prueba.com', 601);
  assert.equal(await lsHook('subscription_created', s, { uid: user('nyc@prueba.com').id, sid }, { sign: false }), 401);
  assert.equal(user('nyc@prueba.com').plan, 'free');
  // aviso firmado: el servidor vuelve a leer la suscripción y activa Studio
  assert.equal(await lsHook('subscription_created', { type: 'subscriptions', id: s.id, attributes: { status: 'active' } }, { uid: user('nyc@prueba.com').id, sid }), 200);
  let u = user('nyc@prueba.com');
  assert.equal(u.plan, 'studio'); assert.ok(u.pro_until > Date.now() + 29 * DAY);
  r = await A.get('/api/me'); assert.equal(r.json.limits.projects, 20); assert.equal(r.json.limits.members, 60);
  r = await A.get('/api/billing'); assert.equal(r.json.sub.provider, 'ls'); assert.equal(r.json.sub.plan, 'studio'); assert.match(r.json.sub.portal, /portal/);
  // un cobro (factura pagada) queda registrado una sola vez
  const inv = { type: 'subscription-invoices', id: '9001', attributes: { subscription_id: +s.id, status: 'paid', total: 3900, refunded: false } };
  await lsHook('subscription_payment_success', inv, { sid }); await lsHook('subscription_payment_success', inv, { sid });
  const pay = S.S.all("SELECT * FROM payments WHERE ext_id='ls:inv:9001'");
  assert.equal(pay.length, 1); assert.equal(pay[0].amount, 39); assert.equal(pay[0].currency, 'USD');
  // no se puede contratar otra vez el mismo plan
  r = await A.post('/api/billing/checkout', { plan: 'pro', cycle: 'month', region: 'intl' }); assert.equal(r.status, 409);
  // cancelar: sigue Studio hasta el fin del periodo pagado
  r = await A.post('/api/billing/cancel', {}); assert.equal(r.status, 200, r.text);
  assert.ok(LSS.calls.includes(`DELETE /v1/subscriptions/${s.id}`));
  u = user('nyc@prueba.com'); assert.equal(u.plan, 'studio');
  // la suscripción vence
  s.attributes.status = 'expired'; s.attributes.ends_at = new Date(Date.now() - 1000).toISOString();
  await lsHook('subscription_expired', { type: 'subscriptions', id: s.id, attributes: {} }, {});
  assert.equal(user('nyc@prueba.com').plan, 'free');
});

test('de Pro (Mercado Pago) a Studio: la suscripción anterior se cancela al activarse la nueva', async () => {
  const A = H.client(base); await login(A, 'lima@prueba.pe', { tz: 'America/Lima' });
  let r = await A.get('/api/billing'); assert.equal(r.json.country, 'PE'); assert.equal(r.json.region, 'pe');
  r = await A.post('/api/billing/checkout', { plan: 'pro', cycle: 'month', region: 'pe' });
  assert.equal(r.status, 200, r.text);
  const pre = Object.values(MPS.pre).at(-1);
  assert.equal(pre.auto_recurring.currency_id, 'PEN'); assert.equal(pre.auto_recurring.transaction_amount, 49); assert.match(pre.reason, /Pro mensual/);
  pre.status = 'authorized'; pre.payer_id = 'p9'; pre.next_payment_date = new Date(Date.now() + 30 * DAY).toISOString();
  await S.billing.syncPre(pre.id);
  assert.equal(user('lima@prueba.pe').plan, 'pro');
  // Studio en soles
  r = await A.post('/api/billing/quote', { plan: 'studio', cycle: 'year', region: 'pe' });
  assert.equal(r.json.amount, 1290); assert.equal(r.json.trialDays, 0, 'la prueba es solo de Pro');
  r = await A.post('/api/billing/checkout', { plan: 'studio', cycle: 'month', region: 'pe' });
  assert.equal(r.status, 200, r.text);
  const pre2 = Object.values(MPS.pre).at(-1);
  assert.equal(pre2.auto_recurring.transaction_amount, 129); assert.match(pre2.reason, /Studio mensual/);
  pre2.status = 'authorized'; pre2.payer_id = 'p9'; pre2.next_payment_date = new Date(Date.now() + 30 * DAY).toISOString();
  await S.billing.syncPre(pre2.id);
  assert.equal(user('lima@prueba.pe').plan, 'studio');
  assert.equal(MPS.pre[pre.id].status, 'cancelled', 'la de Pro se canceló');
  assert.equal(S.S.one('SELECT status FROM subs WHERE ext_id=?', pre.id).status, 'cancelled');
});

test('panel: días de cortesía de Studio', async () => {
  const adm = H.client(base); await login(adm, 'admin@prueba.pe');
  const C = H.client(base); await login(C, 'cortesia@prueba.pe');
  let r = await adm.get('/api/admin/users?q=cortesia');
  r = await adm.post('/api/admin/users/' + r.json[0].id, { grantDays: 30, plan: 'studio' });
  assert.equal(r.json.plan, 'studio'); assert.equal(r.json.grantPlan, 'studio');
  r = await adm.get('/api/admin/stats'); assert.ok(r.json.studio >= 1); assert.equal(r.json.ls, true);
});
