/* Panel de administración de FilmSpirit */
'use strict';
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fd = t => t ? new Date(t).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fdt = t => t ? new Date(t).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '—';
  const until = t => !t ? '—' : t > 4e12 ? 'sin fecha' : fd(t);
  const soles = n => n == null ? '—' : 'S/ ' + (+n).toFixed(2);
  const money = (n, cur) => n == null ? '—' : (cur === 'USD' ? 'US$ ' : 'S/ ') + (+n).toFixed(2);
  const PLAN = { free: 'Guion', indie: 'Indie', pro: 'Pro', studio: 'Studio' };
  const PROV = { mp: 'Mercado Pago', ls: 'Lemon Squeezy', paddle: 'Paddle' };
  const pill = (s, cls) => `<span class="pill ${esc(cls || s)}">${esc(s)}</span>`;
  const toast = m => { document.querySelectorAll('.toast').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); };
  async function api(method, path, body) {
    const r = await fetch(path, { method, credentials: 'same-origin', headers: { 'X-FS': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/entrar?next=/admin' + (j.code === 'reauth' ? '&reauth=1' : ''); throw new Error('sesión'); }
    if (!r.ok) throw new Error(j.error || 'Error ' + r.status);
    return j;
  }
  const view = $('#view');
  const STATUS = { authorized: 'activa', paused: 'en pausa', pending: 'pendiente', cancelled: 'cancelada' };

  const tabs = {
    async resumen() {
      const s = await api('GET', '/api/admin/stats');
      const k = (l, v) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`;
      const P = s.allPrices || {};
      const pr = (cur, pl) => P[cur] ? `${money(P[cur][pl].month, cur)} al mes · ${money(P[cur][pl].year, cur)} al año` : '—';
      return `<div class="kpis">${k('Cuentas', s.users)}${k('Nuevas (7 días)', s.new7)}${k('Activas (7 días)', s.active7)}${k('Con Indie', s.indie || 0)}${k('Con Pro', s.pro)}${k('Con Studio', s.studio || 0)}${k('Guiones', s.scripts || 0)}${k('Lista de espera de Studio', s.waitlist || 0)}
        ${k('Suscripciones activas', s.subs.authorized || 0)}${k('Ingreso mensual (soles)', soles(s.mrr))}${k('Ingreso mensual (dólares)', money(s.mrrUSD || 0, 'USD'))}${k('Proyectos', s.projects)}${k('Archivados', s.archived || 0)}${k('Espacio usado', s.storageMB + ' MB')}
        ${k('Reclamos abiertos', s.reclamos)}</div>
        <div class="card"><h2>Configuración</h2>
          <p class="hint" style="margin:0">Perú · Mercado Pago: <b>${s.mp ? 'activo' : 'apagado (falta MP_ACCESS_TOKEN)'}</b> · Indie ${pr('PEN', 'indie')} · Pro ${pr('PEN', 'pro')} · Studio ${pr('PEN', 'studio')}</p>
          <p class="hint" style="margin:0">Otros países · ${s.intl === 'ls' ? 'Lemon Squeezy' : 'Paddle'}: <b>${s.intl ? 'activo' : 'apagado (faltan PADDLE_API_KEY y los precios PADDLE_PRICE_…)'}</b> · Indie ${pr('USD', 'indie')} · Pro ${pr('USD', 'pro')} · Studio ${pr('USD', 'studio')}</p></div>`;
    },
    async cuentas(q = '') {
      const rows = await api('GET', '/api/admin/users?q=' + encodeURIComponent(q));
      return `<div class="card"><div class="inline"><label class="fld"><span>Buscar por correo, nombre o código</span><input id="q" value="${esc(q)}" placeholder="ana@gmail.com"></label><button class="btn" id="qGo">Buscar</button></div>
        <div class="tbl-wrap"><table class="t"><thead><tr><th>Cuenta</th><th>Plan</th><th>Pro hasta</th><th>Suscripción</th><th class="num">Proy.</th><th class="num">Equipos</th><th>Código</th><th>Alta</th><th></th></tr></thead><tbody>
        ${rows.map(u => `<tr data-id="${esc(u.id)}"><td><b>${esc(u.name)}</b><br><span class="hint">${esc(u.email)}</span>${u.blocked ? ' ' + pill('suspendida', 'cancelled') : ''}</td>
          <td>${pill(PLAN[u.plan] || 'Free', u.plan)}${u.country ? ` <span class="hint">${esc(u.country)}</span>` : ''}</td><td>${until(u.proUntil)}</td>
          <td>${u.sub ? `${esc(PLAN[u.sub.plan] || 'Pro')} · ${esc(STATUS[u.sub.status] || u.sub.status)} · ${u.sub.cycle === 'year' ? 'anual' : 'mensual'} · ${money(u.sub.amount, u.sub.currency)}${u.sub.code ? ' · ' + esc(u.sub.code) : ''}<br><span class="hint">${esc(PROV[u.sub.provider] || '')}</span>` : '—'}</td>
          <td class="num">${u.projects}</td><td class="num">${u.member}</td><td class="mono">${esc(u.promo || '')}</td><td>${fd(u.created)}</td>
          <td><div class="row-actions"><button class="btn xs" data-a="i30">+30 días Indie</button><button class="btn xs" data-a="g30">+30 días Pro</button><button class="btn xs" data-a="g90">+90 días Pro</button><button class="btn xs" data-a="s30">+30 días Studio</button><button class="btn xs" data-a="forever">Pro sin fecha</button><button class="btn xs" data-a="sforever">Studio sin fecha</button><button class="btn xs" data-a="revoke">Quitar cortesía</button><button class="btn xs" data-a="${u.blocked ? 'unblock' : 'block'}">${u.blocked ? 'Reactivar' : 'Suspender'}</button></div></td></tr>`).join('') || '<tr><td colspan="9" class="hint">Sin resultados</td></tr>'}
        </tbody></table></div></div>`;
    },
    async codigos() {
      const rows = await api('GET', '/api/admin/codes');
      return `<div class="card"><h2>Nuevo código de descuento (influencers, campañas)</h2>
        <form class="inline" id="cForm">
          <label class="fld"><span>Código</span><input name="code" required placeholder="MARIA20" style="text-transform:uppercase"></label>
          <label class="fld"><span>Para quién</span><input name="label" placeholder="María · Instagram"></label>
          <label class="fld"><span>% de descuento</span><input name="pct" type="number" min="0" max="90" value="20"></label>
          <label class="fld"><span>Durante (cobros, 0 = siempre)</span><input name="cycles" type="number" min="0" max="36" value="3"></label>
          <label class="fld"><span>Días extra de prueba</span><input name="trialDays" type="number" min="0" max="90" value="0"></label>
          <label class="fld"><span>Usos máximos</span><input name="maxUses" type="number" min="1" placeholder="sin límite"></label>
          <label class="fld"><span>Vence</span><input name="expires" type="date"></label>
          <button class="btn primary">Crear código</button></form>
        <p class="hint" style="margin:0">Cada cuenta puede usar un solo código. El descuento se aplica a los primeros cobros (en el pago anual, al primer año) y después vuelve al precio completo. El enlace para compartir es <span class="mono">${esc(location.origin)}/r/CODIGO</span>.</p></div>
        <div class="card"><div class="tbl-wrap"><table class="t"><thead><tr><th>Código</th><th>Para quién</th><th class="num">%</th><th class="num">Cobros</th><th class="num">Días extra</th><th class="num">Usos</th><th class="num">Activas</th><th class="num">Cobros</th><th class="num">Cobrado</th><th>Vence</th><th>Estado</th><th></th></tr></thead><tbody>
        ${rows.map(c => `<tr data-code="${esc(c.code)}"><td class="mono"><b>${esc(c.code)}</b></td><td>${esc(c.label)}</td><td class="num">${c.pct}</td><td class="num">${c.cycles || 'siempre'}</td><td class="num">${c.trial_days}</td>
          <td class="num">${c.uses}${c.max_uses ? ' / ' + c.max_uses : ''}</td><td class="num">${c.active_subs}</td><td class="num">${c.paid}${c.refunds ? ` <span class="hint">(${c.refunds} devueltos)</span>` : ''}</td><td class="num">${soles(c.collected)}</td><td>${fd(c.expires)}</td><td>${pill(c.active ? 'activo' : 'apagado', c.active ? 'activo' : 'cancelled')}</td>
          <td><button class="btn xs" data-a="${c.active ? 'off' : 'on'}">${c.active ? 'Apagar' : 'Activar'}</button> <button class="btn xs" data-a="link">Copiar enlace</button></td></tr>`).join('') || '<tr><td colspan="12" class="hint">Aún no hay códigos</td></tr>'}
        </tbody></table></div></div>`;
    },
    async subs() {
      const rows = await api('GET', '/api/admin/subs');
      return `<div class="card"><div class="tbl-wrap"><table class="t"><thead><tr><th>Cuenta</th><th>Plan</th><th>Estado</th><th>Ciclo</th><th class="num">Monto</th><th class="num">Precio</th><th>Código</th><th class="num">Cobros</th><th>Próximo cobro</th><th>Nota</th><th>Medio de pago</th><th></th></tr></thead><tbody>
        ${rows.map(s => `<tr data-sid="${esc(s.id)}"><td>${esc(s.email)}</td><td>${esc(PLAN[s.plan] || 'Pro')}</td><td>${pill(STATUS[s.status] || s.status, s.status)}</td><td>${s.cycle === 'year' ? 'anual' : 'mensual'}</td><td class="num">${money(s.amount, s.currency)}</td><td class="num">${money(s.base_amount, s.currency)}</td>
          <td class="mono">${esc(s.code || '')}</td><td class="num">${s.paid_cycles}</td><td>${fd(s.next_payment)}${s.resume_at ? '<br><span class="hint">reanuda ' + fd(s.resume_at) + '</span>' : ''}</td><td>${esc(s.note || '')}</td><td>${esc(PROV[s.provider] || s.provider || '')}<br><span class="mono hint">${esc(s.ext_id || '')}</span></td>
          <td>${s.ext_id ? '<button class="btn xs" data-a="sync">Revisar</button>' : ''}</td></tr>`).join('') || '<tr><td colspan="12" class="hint">Aún no hay suscripciones</td></tr>'}
        </tbody></table></div></div>`;
    },
    async reclamos() {
      const rows = await api('GET', '/api/admin/reclamos');
      return rows.map(r => `<div class="card" data-n="${r.n}"><h2><span class="mono">${esc(r.code)}</span> · ${r.tipo === 'queja' ? 'Queja' : 'Reclamo'} ${pill(r.estado)}</h2>
        <p class="hint" style="margin:0">${fdt(r.ts)} · ${esc(r.data.nombre)} · ${esc(r.data.doc_tipo)} ${esc(r.data.doc_num)} · ${esc(r.data.email)} · ${esc(r.data.telefono || '')}</p>
        <p style="margin:0"><b>Bien:</b> ${esc(r.data.bien)} — ${esc(r.data.descripcion)}${r.data.monto ? ' · S/ ' + esc(r.data.monto) : ''}</p>
        <p style="margin:0"><b>Detalle:</b> ${esc(r.data.detalle)}</p><p style="margin:0"><b>Pedido:</b> ${esc(r.data.pedido)}</p>
        ${r.respuesta ? `<p style="margin:0"><b>Respuesta (${fd(r.resp_ts)}):</b> ${esc(r.respuesta)}</p>` : `<p class="hint" style="margin:0">Plazo: 15 días hábiles desde ${fd(r.ts)}.</p>
        <label class="fld"><span>Respuesta (se envía a su correo)</span><textarea rows="3"></textarea></label><div><button class="btn primary xs" data-a="resp">Responder</button></div>`}</div>`).join('') || '<div class="card"><p class="hint" style="margin:0">No hay reclamos.</p></div>';
    },
    async espera() {
      const rows = await api('GET', '/api/admin/waitlist');
      return `<div class="card"><h2>Lista de espera de Studio · ${rows.length}</h2><p class="hint" style="margin:0">Cuando abra Studio (STUDIO_OPEN=1), escríbeles a estos correos.</p>
        <div class="tbl-wrap"><table class="t"><thead><tr><th>Correo</th><th>Plan hoy</th><th>Idioma</th><th>País</th><th>Desde</th></tr></thead><tbody>
        ${rows.map(w => `<tr><td>${esc(w.email)}</td><td>${esc(PLAN[w.uplan] || '—')}</td><td>${esc(w.lang || '')}</td><td>${esc(w.country || '')}</td><td>${fd(w.ts)}</td></tr>`).join('')}</tbody></table></div></div>`;
    },
    async seguridad() {
      const s = await api('GET', '/api/admin/security');
      // los nombres de cada límite (la primera parte de su clave en el servidor)
      const LIM = { auth: 'Entrar con Google (por IP)', w: 'Guardados (por cuenta)', rd: 'Lecturas pesadas (por cuenta)', np: 'Proyectos nuevos (por cuenta)', rq: 'Pedidos de acceso (por cuenta)',
        q: 'Precios con código', co: 'Ir a pagar', bsync: '«Ya pagué»', bcancel: 'Cancelar suscripción', portal: 'Portal de pago', lr: 'Libro de reclamaciones (por IP)', wl: 'Lista de espera (por IP)',
        mp: 'Avisos de Mercado Pago (por IP)', pd: 'Avisos de Paddle (por IP)', ls: 'Avisos de Lemon Squeezy (por IP)', del: 'Eliminar cuenta', lang: 'Idioma', themes: 'Temas' };
      const LOG = { bad_token: 'Token de Google inválido o vencido', blocked: 'Cuenta suspendida', csrf: 'Envío desde otro sitio', rate_limited: 'Demasiados intentos' };
      const rows = (o, names) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<tr><td>${esc(names[k] || k)}</td><td class="num">${n}</td></tr>`).join('') || '<tr><td colspan="2" class="hint">Nada en las últimas 24 horas.</td></tr>';
      const tot = o => Object.values(o).reduce((a, b) => a + b, 0);
      const k = (l, v) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`;
      return `<div class="kpis">${k('Bloqueos por límite (24 h)', tot(s.limits))}${k('Inicios rechazados (24 h)', tot(s.logins))}${k('Avisos de pago con firma falsa (24 h)', tot(s.sigs))}${k('Sesiones abiertas', s.sessions)}${k('Personas con sesión', s.sessionUsers)}</div>
        <div class="card"><h2>Bloqueos por límite</h2><p class="hint" style="margin:0">Cuando alguien pide algo demasiadas veces, la app responde «Demasiadas solicitudes». Unos pocos son normales; cientos de un mismo tipo, no. Los bloqueos de nginx (por IP, antes de llegar a la app) no salen aquí: <span class="mono">grep " 429 " /var/log/nginx/access.log</span>.</p>
          <div class="tbl-wrap"><table class="t"><thead><tr><th>Límite</th><th>Veces</th></tr></thead><tbody>${rows(s.limits, LIM)}</tbody></table></div></div>
        <div class="card"><h2>Inicios de sesión rechazados</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>Motivo</th><th>Veces</th></tr></thead><tbody>${rows(s.logins, LOG)}</tbody></table></div></div>
        <div class="card"><h2>Avisos de pago con firma falsa</h2><p class="hint" style="margin:0">Alguien intentó hacerse pasar por el medio de pago. Se rechazan solos; si son muchos, revisa que la clave del aviso (<span class="mono">*_WEBHOOK_SECRET</span>) sea la correcta.</p>
          <div class="tbl-wrap"><table class="t"><thead><tr><th>Medio de pago</th><th>Veces</th></tr></thead><tbody>${rows(s.sigs, PROV)}</tbody></table></div></div>
        <div class="card"><h2>Quién más chocó con un límite</h2><p class="hint" style="margin:0">La IP o la cuenta (u…) y el tipo de límite.</p>
          <div class="tbl-wrap"><table class="t"><thead><tr><th>Clave</th><th>Veces</th></tr></thead><tbody>${s.top.map(([key, n]) => `<tr><td class="mono">${esc(key)}</td><td class="num">${n}</td></tr>`).join('') || '<tr><td colspan="2" class="hint">Nadie.</td></tr>'}</tbody></table></div></div>
        <div class="card"><h2>El panel</h2><p class="hint" style="margin:0">Lo administran: ${s.admins.map(esc).join(', ') || '—'}. El panel pide haber entrado con Google en las últimas ${s.adminHours} horas. Activa la verificación en dos pasos de Google en esas cuentas.</p></div>`;
    },
    async bitacora() {
      const rows = await api('GET', '/api/admin/audit');
      return `<div class="card"><div class="tbl-wrap"><table class="t"><thead><tr><th>Fecha</th><th>Cuenta</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>
        ${rows.map(a => `<tr><td>${fdt(a.ts)}</td><td>${esc(a.email || '—')}</td><td class="mono">${esc(a.action)}</td><td class="wrap mono" style="font-size:12px">${esc(a.detail || '')}</td></tr>`).join('')}</tbody></table></div></div>`;
    },
  };
  let cur = 'resumen', q = '';
  async function show(t) {
    cur = t;
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === t ? 'true' : 'false'));
    try { view.innerHTML = await (t === 'cuentas' ? tabs.cuentas(q) : tabs[t]()); } catch (e) { view.innerHTML = `<p class="hint">${esc(e.message)}</p>`; }
  }
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) show(b.dataset.t); });
  view.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    try {
      if (b.closest('[data-id]')) {
        const id = b.closest('[data-id]').dataset.id;
        const body = a === 'i30' ? { grantDays: 30, plan: 'indie' } : a === 'g30' ? { grantDays: 30 } : a === 'g90' ? { grantDays: 90 } : a === 's30' ? { grantDays: 30, plan: 'studio' } : a === 'forever' ? { forever: true } : a === 'sforever' ? { forever: true, plan: 'studio' } : a === 'revoke' ? { revoke: true } : { block: a === 'block' };
        await api('POST', '/api/admin/users/' + id, body); toast('Listo'); return show('cuentas');
      }
      if (b.closest('[data-code]')) {
        const code = b.closest('[data-code]').dataset.code;
        if (a === 'link') { await navigator.clipboard.writeText(location.origin + '/r/' + code).catch(() => { }); return toast('Enlace copiado'); }
        await api('POST', '/api/admin/codes/' + code, { active: a === 'on' }); return show('codigos');
      }
      if (b.closest('[data-sid]')) { await api('POST', '/api/admin/subs/' + b.closest('[data-sid]').dataset.sid + '/sync', {}); toast('Revisada con el medio de pago'); return show('subs'); }
      if (b.closest('[data-n]')) {
        const card = b.closest('[data-n]'), txt = card.querySelector('textarea').value.trim();
        if (!txt) return toast('Escribe la respuesta');
        const r = await api('POST', '/api/admin/reclamos/' + card.dataset.n, { respuesta: txt });
        toast(r.emailed ? 'Respuesta enviada por correo' : 'Respuesta guardada (el correo no está configurado: envíala tú)'); return show('reclamos');
      }
    } catch (er) { toast(er.message); }
  });
  view.addEventListener('submit', async e => {
    if (e.target.id !== 'cForm') return;
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try { await api('POST', '/api/admin/codes', f); toast('Código creado'); show('codigos'); } catch (er) { toast(er.message); }
  });
  view.addEventListener('keydown', e => { if (e.target.id === 'q' && e.key === 'Enter') { q = e.target.value; show('cuentas'); } });
  view.addEventListener('click', e => { if (e.target.id === 'qGo') { q = $('#q').value; show('cuentas'); } });
  show('resumen');
})();
