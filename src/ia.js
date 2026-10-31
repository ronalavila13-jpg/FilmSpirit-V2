/* ============================================================
   IMÁGENES CON IA (plan Studio · solo la versión con servidor)
   La imagen de una viñeta la genera el modelo de imagen de Google («Nano Banana») con la key de cada persona (Google
   le cobra a ella): la key vive cifrada en el servidor y el navegador nunca la vuelve a ver (server/lib/ia.js).
   · La imagen de IA va aparte, en FRAMES[<plano>~ia]: no reemplaza a los muñecos 3D (la escena del plano y una imagen
     subida quedan intactas). sh.ia la activa o desactiva en ese plano y P.meta.iaOff, en todo el proyecto.
   · En la ficha de cada personaje, la pestaña «IA» guarda su descripción y hasta 3 fotos de referencia
     (el.look.ai = { desc, refs, usePh }; las fotos en FRAMES['ai~<id>~<n>']).
   ============================================================ */
const IA_STYLES = {
  lapiz: ['Boceto a lápiz', 'Boceto de storyboard a lápiz, en blanco y negro, de trazo suelto y claro.'],
  color: ['Ilustración a color', 'Ilustración de storyboard a color, digital y limpia, con luz y atmósfera definidas.'],
  foto: ['Fotograma realista', 'Fotograma de película realista, iluminación cinematográfica, lente y profundidad de campo creíbles.'],
};
const IA_ASPECTS = { '1:1': 1, '3:2': 3 / 2, '2:3': 2 / 3, '3:4': 3 / 4, '4:3': 4 / 3, '4:5': 4 / 5, '5:4': 5 / 4, '9:16': 9 / 16, '16:9': 16 / 9, '21:9': 21 / 9 };
const IA_MAX_REFS = 6, IA_PER_CHAR = 2, IA_FICHA_REFS = 3;

/* ---------- lo que arma el pedido (sin red: se prueba aparte) ---------- */
/* la relación de aspecto de Google más cercana a la del proyecto */
function iaAspect(r = (ASPECTS[P.meta.aspect] || 16 / 9)) {
  let best = '16:9', d = 1e9;
  for (const [k, v] of Object.entries(IA_ASPECTS)) { const e = Math.abs(Math.log(v / r)); if (e < d) { d = e; best = k; } }
  return best;
}
/* la apariencia de un personaje para la IA: la de su ficha o, si no, la de su biografía (Historia › Apariencia) */
function iaBioLook(el) {
  const B = (P.build || {}).bios || {}, b = B[el.id] || Object.values(B).find(x => x && x.el === el.id);
  return b && typeof b.look === 'string' ? b.look.trim() : '';
}
const iaDesc = el => (((el.look || {}).ai || {}).desc || '').trim() || iaBioLook(el);
/* las claves de imagen de referencia de un personaje: las de su pestaña IA y, si lo pidió, las fotos de Cuerpo */
function iaCharRefKeys(el) {
  const ai = (el.look || {}).ai || {}, out = (ai.refs || []).filter(k => /^ai~/.test(k) && frameHas(k));
  if (ai.usePh) for (const s of ['front', 'right', 'back']) if (frameHas('ph~' + el.id + '~' + s)) out.push('ph~' + el.id + '~' + s);
  return out.slice(0, IA_PER_CHAR);
}
const iaShotChars = sh => (sh.chars || []).map(id => P.elements[id]).filter(Boolean);
/* los personajes del plano sin descripción ni fotos: la IA los inventaría distintos en cada viñeta */
const iaMissing = sh => iaShotChars(sh).filter(e => !iaDesc(e) && !iaCharRefKeys(e).length);
const iaKeysNeeded = sh => iaShotChars(sh).flatMap(iaCharRefKeys);
/* el pedido: texto + imágenes (la guía de encuadre primero, luego hasta 2 por personaje; 6 en total) + proporción.
   o.style: clave de IA_STYLES · o.notes: indicaciones libres · o.guide: imagen del encuadre 3D (data URL) */
function iaShotPrompt(sh, o = {}) {
  const sc = sceneOfKey(sh.sc), chars = iaShotChars(sh);
  let lens = sh.lens;
  try { if (shot3D(sh)) lens = Math.round(s3Of(sh).keys[0].cam.lens); } catch (e) { }
  const acc = sh.desc && sh.desc.trim() || shotTextExcerpt(sh, 400);
  const L = ['Viñeta de storyboard para una película.'];
  if (sc) L.push(`Escena ${sc.key}: ${sc.heading}.`);
  L.push(`Plano: ${SIZE_NAME[sh.size] || sh.size || 'plano medio'}${sh.size ? ' (' + sh.size + ')' : ''}, ángulo ${String(sh.angle || 'Normal').toLowerCase()}, movimiento ${String(sh.move || 'Fijo').toLowerCase()}${lens ? ', lente de ' + lens + ' mm' : ''}.`);
  if (acc) L.push('Acción: ' + acc);
  if (chars.length) L.push('Personajes (que se vean siempre igual):\n' + chars.map(e => `- ${titleCase(e.name)}: ${iaDesc(e) || 'sin descripción; usa las imágenes de referencia si las hay'}`).join('\n'));
  L.push('Estilo: ' + (IA_STYLES[o.style] || IA_STYLES.color)[1]);
  if (o.guide) L.push('La primera imagen es la guía de composición: respeta su encuadre, la posición de las figuras y la cámara; no copies su estilo.');
  if (o.notes && o.notes.trim()) L.push('Indicaciones: ' + o.notes.trim());
  L.push('Sin texto, letras ni marcos en la imagen.');
  const refs = [o.guide, ...iaShotChars(sh).flatMap(e => iaCharRefKeys(e).map(k => FRAMES[k]))].filter(Boolean).slice(0, IA_MAX_REFS);
  return { text: L.join('\n').slice(0, 4000), refs, aspect: o.aspect || iaAspect() };
}

/* ---------- el servidor ---------- */
const iaStudio = () => !!(typeof APITEAM !== 'undefined' && APITEAM.me && APITEAM.me.plan === 'studio');
const iaHasKey = () => !!(APITEAM.me && APITEAM.me.ia && APITEAM.me.ia.key);
/* cada error del servidor, con lo que la persona puede hacer */
function iaFail(e) {
  if (e && e.code === 'plan_studio') return studioAsk('ia');
  if (e && e.code === 'ia_nokey') { APITEAM.me.ia = { key: false }; toast('Primero guarda tu key de Google.', 4000); return iaSettings(); }
  toast((e && e.message) || 'No se pudo generar la imagen.', 8000);
}
/* ¿puede generar? si no, le explica qué falta */
function iaReady() {
  if (UI.readOnly) return false;
  if (!iaStudio()) { studioAsk('ia'); return false; }
  if (!iaHasKey()) { iaSettings(); return false; }
  return true;
}
async function iaRequest(q) {
  const r = await apiFetch('POST', '/api/ia/imagen', { prompt: q.text, refs: await Promise.all(q.refs.map(iaShrink)), aspect: q.aspect }), j = r.json || {};
  // apiFetch no lanza con un 409 (ia_nokey): se convierte aquí para que iaFail lo atienda
  if (r.status === 409 || !j.image) { const er = new Error(j.error || 'Google no devolvió una imagen.'); er.code = j.code; throw er; }
  return j.image;
}
/* las referencias viajan chicas: 1024 px, WebP 90 % (el servidor acepta hasta 2 MB cada una) */
async function iaShrink(url) { return imgEncode(await imgCanvas(url, { max: 1024 })).url; }
/* una imagen → exactamente W×H (recorta lo que sobra: Google respeta la proporción solo de forma aproximada) */
async function iaCover(src, W, H) {
  const im = await imgLoad(src), c = document.createElement('canvas'); c.width = W; c.height = H;
  const k = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k, g = c.getContext('2d');
  g.imageSmoothingQuality = 'high'; g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
  return c;
}

/* ---------- ajustes: la key de Google ---------- */
async function iaSettings() {
  if (!iaStudio()) return studioAsk('ia');
  let I;
  try { I = (await apiFetch('GET', '/api/me/ia')).json; } catch (e) { return toast(e.message, 6000); }
  const m = modal({
    title: 'Inteligencia artificial (Studio)',
    body: `<div class="ia-set">
      <p>Genera la imagen de las viñetas del storyboard con el modelo de imagen de Google («Nano Banana»). Usas <b>tu propia key de Google</b>: <b>Google cobra a tu cuenta</b> cada imagen; FilmSpirit no cobra nada aparte.</p>
      <p>Crea tu key en <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> (y activa la facturación de esa cuenta de Google) y pégala aquí. Se guarda cifrada en el servidor y no vuelve a mostrarse.</p>
      <p class="hint">Al generar se envían a Google el texto del pedido y las imágenes de referencia. Las imágenes generadas llevan la marca SynthID de Google.</p>
      <div class="ia-row"><label for="iaKey">Key de Google</label><input id="iaKey" type="password" autocomplete="off" spellcheck="false" placeholder="${ea(I.hasKey ? 'Guardada (termina en ' + I.last4 + ') · pega otra para cambiarla' : 'AIza…')}"></div>
      <div class="ia-row"><label for="iaModel">Modelo</label><select id="iaModel">${I.models.map(x => `<option value="${ea(x.id)}"${x.id === I.model ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <p class="hint" id="iaMsg" role="status"></p></div>`,
    foot: `${I.hasKey ? '<button class="btn danger" id="iaDel" style="margin-right:auto">Quitar la key</button>' : ''}<button class="btn" data-close>Cerrar</button><button class="btn primary" id="iaSave">Guardar</button>`,
  });
  const msg = t => { $('#iaMsg', m).textContent = t; };
  const done = j => { APITEAM.me.ia = { key: j.hasKey }; };
  $('#iaSave', m).onclick = async () => {
    const key = $('#iaKey', m).value.trim(), model = $('#iaModel', m).value;
    if (!key && !I.hasKey) return msg('Pega tu key de Google.');
    msg('Comprobando con Google…');
    try {
      const j = (await apiFetch('PUT', '/api/me/ia', { ...(key ? { key } : {}), model })).json;
      done(j); closeModal(); toast('Listo: ya puedes generar imágenes con IA. Modelos que ve tu key: ' + j.models.map(x => x.name).join(', ') + '.', 9000);
    } catch (e) { msg(e.message); }
  };
  if (I.hasKey) $('#iaDel', m).onclick = async () => {
    try { done((await apiFetch('DELETE', '/api/me/ia')).json); closeModal(); toast('Tu key se borró del servidor.', 4000); } catch (e) { msg(e.message); }
  };
}

/* ---------- la viñeta: ventana para generar ---------- */
/* la escena 3D sola, sin la imagen de IA ni otras imágenes, como guía de encuadre */
function iaGuide(sh) {
  const [W, H] = frameDims(768), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (!r3Draw(g, s3Of(sh), 0, W, H, { labels: false })) drawAutoFrame(g, W, H, shotSketchInfo(sh));
  return c.toDataURL('image/jpeg', .85);
}
async function iaShotDialog(sh) {
  if (!sh || !iaReady()) return;
  const code = D.code[sh.id], miss = iaMissing(sh), has3d = shot3D(sh) && !sh.blank;
  const st0 = IA_STYLES[P.meta.iaStyle] ? P.meta.iaStyle : 'color';
  await framesNeed(iaKeysNeeded(sh)).catch(() => { });
  const m = modal({
    title: `Imagen con IA · plano ${code}`, wide: true,
    body: `<div class="ia-d"><div class="ia-cur"><img id="iaImg" alt="Viñeta actual" src="${ea(frameOf(sh))}"><p class="hint" id="iaCap">Viñeta actual</p></div>
      <div class="ia-f" id="iaForm">
        <label class="ia-l">Estilo<select id="iaStyle">${Object.entries(IA_STYLES).map(([k, v]) => `<option value="${ea(k)}"${k === st0 ? ' selected' : ''}>${esc(v[0])}</option>`).join('')}</select></label>
        ${has3d ? '<label class="ia-chk"><input type="checkbox" id="iaGuide" checked> Respetar el encuadre de la viñeta 3D</label>' : ''}
        <label class="ia-l">Indicaciones <span class="hint">(opcional)</span><textarea id="iaNotes" rows="3" maxlength="600" placeholder="Luz, ambiente, qué debe verse…"></textarea></label>
        ${miss.length ? `<div class="ia-warn">${miss.map(e => `<p><b>${esc(titleCase(e.name))}</b> no tiene descripción ni fotos de referencia: puede verse distinto en cada viñeta. <button type="button" class="btn sm" data-ficha="${ea(e.id)}">Abrir su ficha</button></p>`).join('')}</div>` : ''}
        <p class="hint">Se envían a Google el texto y las imágenes de referencia; Google cobra a tu cuenta. La imagen no reemplaza la escena 3D: se activa o desactiva desde el storyboard.</p>
      </div></div>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="iaGo">Generar</button>',
  });
  const go = $('#iaGo', m);
  m.addEventListener('click', e => { const f = e.target.closest('[data-ficha]'); if (f) { closeModal(); openFicha(f.dataset.ficha, () => iaShotDialog(sh)); } });
  let res = null;
  const run = async () => {
    const o = { style: $('#iaStyle', m) ? $('#iaStyle', m).value : st0, notes: $('#iaNotes', m) ? $('#iaNotes', m).value : '' };
    if (P.meta.iaStyle !== o.style) { P.meta.iaStyle = o.style; changed('data'); }
    if ($('#iaGuide', m) && $('#iaGuide', m).checked) { try { o.guide = iaGuide(sh); } catch (e) { } }
    go.disabled = true; go.textContent = 'Generando…'; $('#iaCap', m).textContent = 'Generando la imagen… puede tardar entre 10 y 40 segundos.';
    try { res = await iaRequest(iaShotPrompt(sh, o)); }
    catch (e) { if (m.isConnected) { go.disabled = false; go.textContent = 'Generar'; $('#iaCap', m).textContent = 'Viñeta actual'; } return iaFail(e); }
    if (!m.isConnected) return;   // cerró la ventana mientras esperaba
    $('#iaImg', m).src = res; $('#iaCap', m).textContent = 'Resultado';
    go.disabled = false; go.textContent = 'Otra versión';
    if (!$('#iaUse', m)) { go.insertAdjacentHTML('beforebegin', '<button class="btn primary" id="iaUse">Usar en la viñeta</button>'); go.classList.remove('primary'); $('#iaUse', m).onclick = async () => { const u = res; closeModal(); await iaShotUse(sh, u); }; }
  };
  go.onclick = run;
}
/* «Usar en la viñeta»: la imagen (a las medidas de la viñeta, WebP 90 %) se guarda aparte, en <plano>~ia, y se muestra */
async function iaShotUse(sh, url) {
  const k = sh.id + '~ia', [W, H] = frameDims(1280);
  let out;
  try { out = imgEncode(await iaCover(url, W, H)).url; } catch (e) { return toast('No se pudo leer la imagen que devolvió Google.', 6000); }
  if (frameHas(k) && !FRAMES[k]) await framesNeed([k]).catch(() => { });
  const old = FRAMES[k] || null;
  histNote(`Imagen de IA en el plano ${D.code[sh.id] || ''}`.trim(), old ? { [k]: old } : null, 'board');
  FRAMES[k] = out; IMGS.delete(k); sh.ia = true;
  changed('data'); render();
  toastUndo(`Imagen de IA puesta en el plano ${D.code[sh.id]}. La escena 3D sigue ahí: se alterna desde la viñeta («IA») o con «Viñetas: 3D | IA».`, 8000);
  if (P._sample && !P._saved) await flushSave();
  try { await Store.saveFrame(P.id, k, out); }
  catch (e) { problem('No se pudo guardar la imagen de IA.', () => Store.saveFrame(P.id, k, out).catch(() => problem('Sigue sin guardarse la imagen de IA.'))); }
}
/* alternar la imagen de IA y la viñeta 3D de un plano, sin abrir su editor */
function iaShotToggle(sh) {
  if (!sh || UI.readOnly || !frameHas(sh.id + '~ia')) return;
  if (P.meta.iaOff) return toast('Las viñetas están en «3D» para todo el proyecto. Cámbialo con «Viñetas: 3D | IA» en la barra del Storyboard.', 6000);
  const on = !sh.ia;
  histNote(`${on ? 'Ver la imagen de IA' : 'Ver la viñeta 3D'} del plano ${D.code[sh.id] || ''}`.trim(), null, 'board');
  if (on) sh.ia = true; else delete sh.ia;
  changed('data'); render();
  toastUndo(on ? `El plano ${D.code[sh.id]} muestra su imagen de IA.` : `El plano ${D.code[sh.id]} muestra su viñeta 3D.`);
}
/* todo el proyecto: «3D» muestra los muñecos aunque haya imágenes de IA (el PDF sigue lo que se ve) */
function iaAllSet(on) {
  if (UI.readOnly) return;
  histNote(on ? 'Viñetas con IA donde la haya' : 'Todas las viñetas en 3D', null, 'board');
  if (on) delete P.meta.iaOff; else P.meta.iaOff = true;
  changed('data'); render();
  toastUndo(on ? 'Los planos con imagen de IA la muestran.' : 'Todas las viñetas muestran la escena 3D; las imágenes de IA siguen guardadas.');
}
async function iaShotClear(sh) {
  const k = sh.id + '~ia';
  if (UI.readOnly || !frameHas(k)) return;
  if (!FRAMES[k]) await framesNeed([k]).catch(() => { });
  histNote(`Borrar la imagen de IA del plano ${D.code[sh.id] || ''}`.trim(), FRAMES[k] ? { [k]: FRAMES[k] } : null, 'board');
  delete FRAMES[k]; IMGS.delete(k); if (FRIDX) delete FRIDX[k]; delete sh.ia;
  changed('data'); render();
  toastUndo(`Imagen de IA borrada del plano ${D.code[sh.id]}.`);
  try { await Store.saveFrame(P.id, k, null); } catch (e) { problem('No se pudo borrar la imagen de IA.'); }
}

/* ---------- lo que se ve en el storyboard ---------- */
const iaAny = () => Object.values(P.shots).some(s => frameHas(s.id + '~ia'));
function iaMenuHTML(sh) {
  if (TARGET !== 'server' || UI.readOnly || sh.ws === '2d') return '';
  const has = frameHas(sh.id + '~ia');
  return `<button data-m="iagen">${has ? 'Otra imagen con IA…' : 'Generar imagen con IA…'}</button>`
    + (has ? `<button data-m="iatog">${shotIaKey(sh) ? 'Ver la viñeta 3D' : 'Ver la imagen de IA'}</button><button data-m="iadel">Borrar la imagen de IA</button>` : '');
}
const iaBlankBtn = sh => TARGET !== 'server' ? '' : `<button type="button" data-act="ia-gen" data-id="${ea(sh.id)}" title="Generar la imagen de este plano con IA (Studio)"><span>Generar con IA</span></button>`;
/* la pastilla «IA» de la tarjeta: aparece solo si el plano tiene imagen de IA; encendida, la muestra */
function iaPillHTML(sh) {
  if (TARGET !== 'server') return '';
  // sin imagen de IA todavía: el botón para generarla (si no, nadie encontraría la función)
  if (!frameHas(sh.id + '~ia')) return UI.readOnly || sh.ws === '2d' ? '' : `<button type="button" class="v2-ia gen" data-v2iagen="${ea(sh.id)}" title="Generar la imagen de este plano con IA (Studio)">✦ Generar con IA</button>`;
  const on = !!shotIaKey(sh), off = !!P.meta.iaOff;
  return `<button type="button" class="v2-ia${on ? ' on' : ''}" data-v2ia="${ea(sh.id)}" ${UI.readOnly ? 'disabled' : ''} title="${ea(off ? 'Las viñetas están en 3D para todo el proyecto («Viñetas: 3D | IA»)' : on ? 'Muestra la imagen de IA. Un clic: ver la viñeta 3D' : 'Muestra la viñeta 3D. Un clic: ver la imagen de IA')}">${on ? 'Ver 3D' : 'Ver IA'}</button>`;
}
function iaSwitchHTML() {
  if (TARGET !== 'server' || !iaAny()) return '';
  const off = !!P.meta.iaOff;
  return `<span class="v2-ord" role="group" aria-label="Qué muestran las viñetas" title="3D: todas las viñetas muestran los muñecos, aunque tengan imagen de IA. IA: los planos con imagen de IA la muestran (cada plano se alterna con su pastilla «IA»). El PDF sigue lo que se ve"><span class="lab">Viñetas</span><button type="button" data-v2iaall="0" aria-pressed="${off}">3D</button><button type="button" data-v2iaall="1" aria-pressed="${!off}"${UI.readOnly ? ' disabled' : ''}>IA</button></span>`;
}
if (typeof ACT !== 'undefined') ACT['ia-gen'] = b => iaShotDialog(P.shots[b.dataset.id]);

/* ---------- la ficha del personaje: pestaña «IA» ---------- */
/* devuelve { html, click, input, save, cancel } para ficha.js (openFicha). Las fotos viven en FRAMES['ai~<id>~<n>'] y se
   suben con «Guardar» (con «Cancelar» todo vuelve como estaba) */
function iaFicha(el, ed, repaint) {
  const id = el.id, K = n => `ai~${id}~${n}`, keys = [0, 1, 2].map(K);
  const ai = () => (el.look || {}).ai || {};
  const put = patch => { el.look = { ...(el.look || {}), ai: { ...ai(), ...patch } }; };
  const old = {}; for (const k of keys) old[k] = FRAMES[k] || null;
  framesNeed(keys.filter(frameHas)).then(() => { for (const k of keys) if (old[k] == null) old[k] = FRAMES[k] || null; repaint(); }).catch(() => { });
  const refs = () => keys.map(k => (ai().refs || []).includes(k) && FRAMES[k] ? k : '');
  let busy = '';
  const setRef = (k, url) => {
    const list = (ai().refs || []).filter(x => x !== k);
    if (url) { FRAMES[k] = url; list.push(k); } else delete FRAMES[k];
    IMGS.delete(k); put({ refs: keys.filter(x => list.includes(x)) });
  };
  const addPhoto = async (file, at) => {
    if (!file || !/^image\//.test(file.type)) return toast('Elige una imagen (JPG, PNG o WebP).');
    try { setRef(at, imgEncode(await imgCanvas(file, { max: 1024 })).url); } catch (e) { toast('No se pudo leer esa imagen.'); }
    repaint();
  };
  return {
    html() {
      const a = ai(), dis = ed ? '' : 'disabled', slots = refs(), bio = iaBioLook(el);
      return `<div class="fi-form ia-fi">
        <div class="fi-row"><span>Descripción para la IA</span><div class="fi-v"><textarea data-iad rows="4" maxlength="600" ${dis} placeholder="${ea(bio || 'Cómo se ve: edad, rostro, pelo, ropa de siempre, rasgos que no deben cambiar…')}">${esc(a.desc || '')}</textarea>
          <span class="hint">${bio && !a.desc ? 'Si la dejas vacía, la IA usa su «Apariencia» de Historia.' : 'Se usa en todas sus viñetas.'}</span></div></div>
        <div class="fi-row"><span>Fotos de referencia</span><div class="fi-v"><div class="ia-slots">${keys.map((k, n) => slots[n]
          ? `<div class="ia-slot"><img src="${ea(FRAMES[k])}" alt="Referencia ${n + 1}">${ed ? `<button type="button" class="btn sm" data-iarm="${ea(k)}" aria-label="Quitar la referencia ${n + 1}">Quitar</button>` : ''}</div>`
          : `<div class="ia-slot empty">${ed ? `<button type="button" class="btn sm" data-iaadd="${ea(k)}">Agregar foto</button>` : '<span class="hint">vacía</span>'}</div>`).join('')}</div>
          <label class="ia-chk"><input type="checkbox" data-iaph ${a.usePh ? 'checked' : ''} ${dis}> Usar también las fotos de Cuerpo (frente, perfil y espalda)</label>
          <span class="hint">Hasta ${IA_FICHA_REFS} fotos: con ellas el personaje se ve igual en todas las viñetas. Se envían a Google al generar.</span></div></div>
        ${ed ? `<div class="fi-row"><span></span><div class="fi-v"><button type="button" class="btn sm" data-iagen ${busy ? 'disabled' : ''}>${busy || 'Generar retrato de referencia'}</button><span class="hint">Crea un retrato de frente con la descripción y lo pone en la primera casilla libre.</span></div></div>` : ''}
      </div>`;
    },
    input(x) { if (x.dataset.iad != null && ed) put({ desc: x.value.slice(0, 600) }); },
    click(e) {
      if (!ed) return;
      const rm = e.target.closest('[data-iarm]'), ad = e.target.closest('[data-iaadd]');
      if (rm) { setRef(rm.dataset.iarm, null); repaint(); return; }
      if (ad) { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = () => addPhoto(f.files[0], ad.dataset.iaadd); f.click(); return; }
      if (e.target.closest('[data-iaph]')) { put({ usePh: e.target.closest('[data-iaph]').checked }); return; }
      if (e.target.closest('[data-iagen]') && !busy) this.portrait();
    },
    async portrait() {
      const free = keys.find(k => !refs()[keys.indexOf(k)]);
      if (!free) return toast('Quita una foto de referencia para dejar lugar al retrato.', 5000);
      if (!iaReady()) return;
      const desc = ai().desc && ai().desc.trim() || iaBioLook(el);
      if (!desc) return toast('Escribe primero la descripción para la IA.', 5000);
      busy = 'Generando…'; repaint();
      try {
        const u = await iaRequest({ text: `Retrato de referencia de un personaje de cine, de frente, de la cabeza a la cintura, con fondo gris claro liso y luz suave y pareja.\n${titleCase(el.name)}: ${desc}\nSin texto ni letras.`, refs: [], aspect: '3:4' });
        setRef(free, imgEncode(await imgCanvas(u, { max: 1024 })).url);
      } catch (e) { iaFail(e); }
      busy = ''; repaint();
    },
    /* «Guardar»: sube las fotos nuevas y borra las quitadas */
    async save() {
      if (P._sample && !P._saved) await flushSave();   // un proyecto que aún no está en el servidor se guarda primero
      for (const k of keys) if ((FRAMES[k] || null) !== old[k]) Store.saveFrame(P.id, k, FRAMES[k] || null).catch(() => problem('No se pudo guardar una foto de referencia de IA.'));
      if (!(ai().refs || []).length && !ai().desc && !ai().usePh) { const lk = { ...el.look }; delete lk.ai; el.look = lk; }
    },
    /* «Cancelar»: las fotos vuelven a como estaban */
    cancel() { for (const k of keys) { if (old[k]) FRAMES[k] = old[k]; else delete FRAMES[k]; IMGS.delete(k); } },
  };
}
