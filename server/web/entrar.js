/* Entrar con Google: el botón entrega un token que el servidor verifica y convierte en sesión */
'use strict';
(function () {
  const qs = new URLSearchParams(location.search);
  const lang = document.documentElement.lang || 'es';
  // solo se vuelve a direcciones de la propia app
  const nextRaw = qs.get('next') || '/app/';
  const next = /^\/(app\/?|admin)(\?[\w=&%.-]*)?$/.test(nextRaw) ? nextRaw : '/app/';
  // código de descuento de un influencer: se recuerda hasta crear la cuenta
  try { const ref = qs.get('ref'); if (ref && /^[\w-]{3,40}$/.test(ref)) localStorage.setItem('fs_ref', ref.toUpperCase()); } catch (e) { }
  const box = document.getElementById('err');
  const msg = k => box.dataset[k] || '';
  const err = m => { box.textContent = m; box.hidden = !m; };
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { }

  // si ya hay sesión, directo a la app. Para el panel de administración con una sesión de hace más de 12 horas
  // (reauth=1) hay que volver a elegir la cuenta de Google: se avisa y no se salta
  const reauth = qs.get('reauth') === '1';
  if (reauth) err(msg('reauth'));
  else fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }).then(r => { if (r.ok) location.replace(next); }).catch(() => { });

  async function onCredential(resp) {
    err('');
    let ref = '';
    try { ref = localStorage.getItem('fs_ref') || ''; } catch (e) { }
    try {
      const r = await fetch('/api/auth/google', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-FS': '1' },
        body: JSON.stringify({ credential: resp.credential, ref, tz }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { err(j.error || msg('login')); return; }
      try { localStorage.removeItem('fs_ref'); } catch (e) { }
      location.replace(next);
    } catch (e) { err(msg('net')); }
  }
  function start() {
    const cid = document.querySelector('meta[name="google-client-id"]').content;
    const gb = document.getElementById('gbtn');
    if (!cid || cid.startsWith('__')) { gb.innerHTML = ''; const s = document.createElement('span'); s.className = 'hint'; s.textContent = msg('cfg'); gb.appendChild(s); return; }
    google.accounts.id.initialize({ client_id: cid, callback: onCredential, ux_mode: 'popup', context: 'signin', use_fedcm_for_prompt: true, itp_support: true });
    gb.innerHTML = '';
    google.accounts.id.renderButton(gb, { theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'filled_black' : 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: lang, width: 300 });
    google.accounts.id.prompt();
  }
  let tries = 0;
  (function wait() {
    if (window.google && google.accounts && google.accounts.id) return start();
    if (++tries > 100) { const gb = document.getElementById('gbtn'); gb.innerHTML = ''; const s = document.createElement('span'); s.className = 'hint'; s.textContent = msg('gsi'); gb.appendChild(s); return; }
    setTimeout(wait, 100);
  })();
})();
