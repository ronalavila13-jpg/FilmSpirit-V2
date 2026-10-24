'use strict';
(function () {
  const f = document.getElementById('lr'), err = document.getElementById('err'), ok = document.getElementById('ok');
  document.getElementById('menor').addEventListener('change', e => { const apo = document.getElementById('apo'); apo.hidden = !e.target.checked; apo.querySelector('input').required = e.target.checked; });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    err.hidden = true;
    const d = Object.fromEntries(new FormData(f));
    d.menor = !!d.menor;
    const b = f.querySelector('[type=submit]'); b.disabled = true; b.textContent = 'Enviando…';
    try {
      const r = await fetch('/api/reclamos', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-FS': '1' }, body: JSON.stringify(d) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se pudo enviar. Inténtalo de nuevo.');
      f.hidden = true;
      ok.hidden = false;
      ok.innerHTML = '<div class="ok-box"><b></b><span></span></div><pre style="white-space:pre-wrap;font-family:var(--font-script);font-size:13px;background:var(--surface);border-radius:12px;padding:16px;margin-top:16px"></pre><p><button class="btn" type="button" id="pr">Imprimir o guardar en PDF</button></p>';
      ok.querySelector('b').textContent = 'Hoja ' + j.code + ' registrada';
      ok.querySelector('span').textContent = j.emailed ? 'Te enviamos una copia a tu correo. Guarda este número.' : 'Guarda este número y la copia de abajo.';
      ok.querySelector('pre').textContent = j.copy;
      document.getElementById('pr').onclick = () => print();
      ok.focus();   // quien usa lector de pantalla o teclado llega directo al número de la hoja
    } catch (ex) { err.textContent = ex.message; err.hidden = false; b.disabled = false; b.textContent = 'Enviar'; }
  });
})();
