/* Página de pago de Paddle: es el «enlace de pago predeterminado» de la cuenta de Paddle. El servidor crea la
   transacción (con el precio del plan y la cuenta) y manda aquí con ?_ptxn=txn_…&sid=…; Paddle.js abre el pago solo
   y, al terminar, vuelve a la app, que confirma la suscripción con el servidor (/api/billing/sync). */
'use strict';
(function () {
  const qs = new URLSearchParams(location.search);
  const sid = /^[\w-]{4,40}$/.test(qs.get('sid') || '') ? qs.get('sid') : '';
  const back = '/app/' + (sid ? '?pago=' + encodeURIComponent(sid) : '');
  const msg = document.getElementById('payMsg');
  document.getElementById('payBack').href = back;
  const token = document.querySelector('meta[name="paddle-client-token"]').content;
  const env = document.querySelector('meta[name="paddle-env"]').content;
  if (!window.Paddle || !token || token.startsWith('__')) { msg.textContent = msg.dataset.cfg; return; }
  try {
    if (env === 'sandbox') Paddle.Environment.set('sandbox');
    Paddle.Initialize({
      token,
      checkout: { settings: { displayMode: 'overlay', theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', locale: document.documentElement.lang || 'es', successUrl: location.origin + back } },
      eventCallback: ev => { if (ev && ev.name === 'checkout.closed') location.href = back; },
    });
  } catch (e) { msg.textContent = msg.dataset.err; }
})();
