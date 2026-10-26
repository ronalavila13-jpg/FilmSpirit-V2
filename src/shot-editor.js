/* ============================================================
   EDITOR DE PLANO · visor 3D + planta de cámara + claves
   ============================================================ */
const clone = o => JSON.parse(JSON.stringify(o));
let EDT = null;
/* pestañas del panel: íconos; la elegida muestra su nombre */
const SX_TABS = [
  ['sel', 'Figura', '<circle cx="12" cy="7" r="3.2"/><path d="M5 20.5v-1.8A5.2 5.2 0 0 1 10.2 13.5h3.6A5.2 5.2 0 0 1 19 18.7v1.8"/>'],
  ['cam', 'Cámara', '<rect x="2.5" y="7" width="13" height="10" rx="2.4"/><path d="M15.5 10.6 21 7.6v8.8l-5.5-3z"/>'],
  ['esc', 'Escena', '<path d="M3 19.5 9 10l4 6 2.5-3.5 5.5 7z"/><circle cx="16.5" cy="6.5" r="2"/>'],
  ['luz', 'Luz', '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>'],
  ['shot', 'Plano', '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7.5 6 9.5 10M13 6l2 4M18.5 6l2 4"/>'],
];
/* la tecla que alterna la vista libre con un toque: Ctrl, o ⌘ en la Mac */
const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '') ? 'Meta' : 'Control';
const FREE_TIP = MOD_KEY === 'Meta'
  ? ['Vista libre: gira alrededor de la figura para posarla; la cámara del plano no se mueve (un toque de ⌘)', 'Volver a la cámara del plano (su encuadre no cambió) · un toque de ⌘']
  : ['Vista libre: gira alrededor de la figura para posarla; la cámara del plano no se mueve (un toque de Ctrl)', 'Volver a la cámara del plano (su encuadre no cambió) · un toque de Ctrl'];
/* ficha del plano, solo para mirar: la viñeta, la planta de cámara y los datos del plano, sin poder cambiar nada.
   Fuera del Storyboard (guion rayado, animatic, hoja de script) un plano se abre así; «Editar en el Storyboard»
   lleva a su pestaña y abre ahí el editor. */
function openShotView(id, isNew) {
  const sh = P.shots[id];
  if (!sh) return;
  const s = sceneOfKey(sh.sc);
  if (!s) return;
  const all = D.sc.scenes.flatMap(x => D.shotsBy[x.key] || []), i = all.indexOf(sh);
  const is2 = sh.ws === '2d', s3 = s3Of(sh), st = s3At(s3, 0), cam = st.cam;
  const ar = ASPECTS[P.meta.aspect] || 16 / 9, base = 960;
  const u = thumbCached(sh, 0, base);
  const secs = n => `${+(+n).toFixed(1)} s`;
  const aim = !is2 && s3.aim && s3.objs.find(o => o.id === s3.aim);
  const figs = is2 ? (sh.chars || []).map(c => P.elements[c] && P.elements[c].name).filter(Boolean) : [...s3.objs.filter(o => o.kind === 'actor').map(o => o.name).filter(Boolean), ...s3.objs.filter(o => o.kind === 'gente').map(o => `${o.name || 'Extras'} (${o.n})`)];
  const lights = is2 ? [] : s3.objs.filter(o => o.kind === 'luz');
  const R = !is2 && s3.set === 'int' ? roomOf(s3) : null;
  const row = (k, v) => v ? `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>` : '';
  const facts = [
    row('Tamaño', esc(sh.size ? `${sh.size} · ${SIZE_NAME[sh.size] || ''}` : '')),
    row('Ángulo', esc(sh.angle || '')),
    row('Movimiento', esc(sh.move || '')),
    row('Soporte', esc(sh.support || '')),
    row('Sonido', esc(({ si: 'Sí, directo', amb: 'Solo ambiente', no: 'No (MOS)' })[sh.snd] || '')),
    row('Lente', esc(is2 ? (sh.lens ? `${sh.lens} mm` : '') : `${Math.round(cam.lens)} mm${sensorOf(s3)[0] === 'ff' ? '' : ` · ${sensorOf(s3)[1]} (como ${Math.round(camFF(cam))} mm en full frame)`}`)),
    row('Altura de cámara', is2 ? '' : esc(`${cam.h.toFixed(2)} m`)),
    row('Duración', esc(secs(shotDur(sh))) + (s3.keys.length > 1 && !is2 ? ` <span class="shv-mut">· animado, ${s3.keys.length} claves</span>` : '')),
    row('Sigue a', aim ? esc(aim.name) : ''),
    row('En cuadro', esc(figs.join(', '))),
    row('Luces', esc(lights.map(o => { const q = st.o[o.id] || {}; return `${o.name} (${(S3_LIGHTS[o.type] || {}).name || o.type}, ${Math.round(q.k || 0)} K)`; }).join('; '))),
    row('Interior', R ? esc(`${R.w} × ${R.d} m, alto ${R.h} m`) : ''),
  ].join('');
  // sin acceso al Storyboard no se edita; con la pestaña oculta, el editor se abre aquí mismo
  const noEdit = UI.readOnly || (typeof canSeeTab === 'function' && !canSeeTab('board')), boardOff = !!($('#tab-board') || {}).hidden;
  const m = modal({
    title: `Plano ${D.code[id] || ''} · Esc. ${s.key}`, wide: true,
    body: `<div class="shv${ea(is2 ? ' d2' : '')}">
        <div class="shv-pics">
          <figure class="shv-fr" style="--ar:${ea(ar)}"><img draggable="false" alt="Viñeta del plano ${esc(D.code[id] || '')}" class="${ea(u ? '' : 'wait')}" src="${ea(u || BLANK)}" ${u ? '' : `data-thumb="${ea(id)}" data-base="${ea(base)}"`}><figcaption>${is2 ? 'Dibujo' : 'Vista de cámara'}</figcaption></figure>
          ${is2 ? '' : '<figure class="shv-plw"><canvas class="shv-pl" aria-label="Planta de cámara"></canvas><figcaption>Planta de cámara</figcaption></figure>'}
        </div>
        <p class="shv-sc">${esc(s.heading || '')}</p>
        <dl class="shv-dl">${facts}</dl>
        <section class="shv-tx"><h3>Descripción</h3>${sh.desc ? `<p>${esc(sh.desc)}</p>` : '<p class="shv-mut">Sin descripción.</p>'}</section>
        ${sh.notes ? `<section class="shv-tx"><h3>Notas</h3><p>${esc(sh.notes)}</p></section>` : ''}
        <p class="shv-hint">${noEdit ? 'Solo para consultar.' : 'Solo para consultar. Para cambiar el plano, ábrelo en el Storyboard.'}</p>
      </div>`,
    foot: `<span class="left"><button class="btn ghost" data-v="prev" ${i > 0 ? '' : 'disabled'}>◀ Anterior</button><button class="btn ghost" data-v="next" ${i >= 0 && i < all.length - 1 ? '' : 'disabled'}>Siguiente ▶</button></span>${isNew && !noEdit ? '<button class="btn ghost" data-v="drop">Quitar el plano</button>' : ''}<button class="btn" data-close>Cerrar</button>${noEdit ? '' : `<button class="btn primary" data-v="edit">${boardOff ? 'Editar el plano' : 'Editar en el Storyboard'}</button>`}`,
    onMount: mm => {
      const c = $('.shv-pl', mm);
      if (c) { const pl = makePlan(c, { s3, sel: null, state: () => st, changed() { }, commit() { } }, { w: 340, h: 340, static: true, dpr: 2 }); pl.fit(); }
      if (!u) requestAnimationFrame(() => hydrateThumbs());
      mm.addEventListener('click', e => {
        const b = e.target.closest('[data-v]'); if (!b || b.disabled) return;
        const v = b.dataset.v;
        if (v === 'prev' && all[i - 1]) openShotView(all[i - 1].id);
        else if (v === 'next' && all[i + 1]) openShotView(all[i + 1].id);
        else if (v === 'drop') { closeModal(); delete P.shots[id]; changed('data'); derive(); render(); toast('Plano quitado.'); }
        else if (v === 'edit') {
          closeModal();
          if (!boardOff && UI.tab !== 'board') setTab('board');
          requestAnimationFrame(() => {
            const card = $(`#view .pcell[data-sid="${CSS.escape(id)}"]`);
            if (card && card.scrollIntoView) card.scrollIntoView({ block: 'center' });
            if (!sh.s3 && !sh.d2 && !sh.ws && ls.get('boardWs', '3d') === '2d') openShot2D(id); else openShotEditor(id);
          });
        }
      });
    },
  });
  return m;
}
/* fuera del Storyboard se mira; en el Storyboard se edita */
function openShot(id, isNew) { return UI.tab === 'board' ? openShotEditor(id, isNew) : openShotView(id, isNew); }
function openShotEditor(id, isNew, from2d, waited) {
  const sh = P.shots[id];
  if (!sh) return;
  const s = sceneOfKey(sh.sc);
  if (!s) return;
  // los planos 2D (y los nuevos, si así se eligió en Ajustes) se abren en el espacio de dibujo
  if (!from2d && (sh.ws === '2d' || (isNew && !sh.s3 && !sh.d2 && ls.get('boardWs', '3d') === '2d'))) return openShot2D(id, isNew);
  ensureFrames('index');
  // la referencia y la anotación del plano, si existen y aún no llegan: se abre cuando estén
  const fk = [id, id + '~a', ...d2LayerKeys(sh, null)].filter(k => frameHas(k) && !FRAMES[k]);   // (y las capas del dibujo 2D)
  if (fk.length && !waited) { framesNeed(fk).finally(() => openShotEditor(id, isNew, from2d, true)); return; }
  const E = EDT = {
    id, sh, s, isNew, from2d: !!from2d, t: 0, sel: null, playing: false, tab: 'sel', autokey: false, custom: !!sh.s3, cam: 'a',
    s3: (x => { if (x.atm == null && typeof envFromScene === 'function') { const a = envFromScene(s).atm; if (a !== 'dia') x.atm = a; } return x; })(clone(s3Of(sh))), form: { size: sh.size, angle: sh.angle, move: sh.move, support: sh.support, snd: sh.snd || '', desc: sh.desc, notes: sh.notes, done: !!sh.done, names: !sh.noNames, p0: sh.p0 ?? s.p0, p1: sh.p1 ?? s.p1 - 1 },
    // la referencia y la anotación que el dibujo 2D trajo como capas se ven allá (d2Imp), no aquí otra vez
    dur: shotDur(sh), durSet: !!(sh.dur && num(sh.dur) > 0), ref: (d2On(sh) && d2Imp(sh.d2, 'ref') ? null : FRAMES[id]) || null, refBack: !!sh.refBack, l2: ls.get('ed2d', true), refDirty: false, anno: null, annoDirty: false, hist: [], fut: [], gesture: false, tmp: null, gd: new Set(ls.get('guias', ls.get('guides', true) ? ['tercios', 'segura'] : [])),
    draw: { tool: 'pen', color: '#C8382C', w: 4, undo: [] },
    looks0: Object.fromEntries(Object.values(P.elements).filter(e => e.cat === 'cast').map(e => [e.id, e.look ? JSON.parse(JSON.stringify(e.look)) : null])),
  };
  E.s3_0 = JSON.stringify(E.s3); E.form0 = JSON.stringify(E.form); E.dur0 = E.dur;
  const ar = ASPECTS[P.meta.aspect] || 16 / 9;
  const list = D.shotsBy[sh.sc] || [];
  const i = list.indexOf(sh);
  const m = modal({
    title: `Plano ${D.code[id] || ''} · Esc. ${s.key}`, wide: true,
    body: `<div class="sx">
        <div class="sx-view" style="--ar:${ea(ar)}">
          <div class="vp-top" id="vpTop" role="toolbar" aria-label="Acciones de la viñeta">
            <button class="vp-ic" data-vt="undo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></button>
            <button class="vp-ic" data-vt="redo" title="Rehacer (Ctrl+Mayús+Z)" aria-label="Rehacer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg></button>
            <i class="vp-sep" aria-hidden="true"></i>
            <button class="vp-ic" data-vt="fig" title="Agregar una figura" aria-label="Agregar figura"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="6.5" r="3"/><path d="M4.5 20.5v-2.5a5.5 5.5 0 0 1 11 0v2.5"/><path d="M19 8v6M16 11h6"/></svg></button>
            <button class="vp-ic" data-vt="obj" title="Agregar un objeto" aria-label="Agregar objeto"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5 10 5l6.5 3.5v7L10 19l-6.5-3.5z"/><path d="M3.5 8.5 10 12l6.5-3.5M10 12v7"/><path d="M20 3v5M17.5 5.5h5"/></svg></button>
            <button class="vp-ic" data-vt="env" title="Entorno" aria-label="Entorno" aria-haspopup="listbox"><span class="vt-i" id="vtEnvI"></span><span class="sr" id="vtEnv"></span></button>
            <button class="vp-ic" data-vt="atm" title="Atmósfera" aria-label="Atmósfera" aria-haspopup="listbox"><span class="vt-i" id="vtAtmI"></span><span class="sr" id="vtAtm"></span></button>
            <i class="vp-sep" aria-hidden="true"></i>
            <button class="vp-ic" data-vt="names" title="Mostrar u ocultar los nombres (solo en este plano)" aria-label="Nombres"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.5V5a1.5 1.5 0 0 1 1.5-1.5h7.5L21 12l-8.5 8.5z"/><circle cx="8" cy="8" r="1.4"/></svg></button>
            <button class="vp-ic" data-vt="guides" title="Líneas guía: tercios, cuadrícula, centro, diagonales, proporción áurea, zona segura y horizonte" aria-label="Líneas guía" aria-haspopup="menu"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M9.2 5v14M14.8 5v14M3.5 9.7h17M3.5 14.3h17"/></svg></button>
            <button class="vp-ic" data-vt="draw" title="Dibujar flechas y notas sobre la viñeta" aria-label="Dibujar sobre la viñeta"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg></button>
            <button class="vp-ic vp-ws" data-vt="ws2d" title="Dibujo a mano 2D (capas, lápices, papel cebolla)" aria-label="Pasar al dibujo 2D"><span>2D</span></button>
            <button class="vp-ic vp-camab" id="vpCamAB" hidden title="Este plano tiene dos cámaras: toca para pasar a la otra" aria-label="Cámara A: pasar a la cámara B"><span>A</span></button>
            <span class="grow"></span>
            <button class="vp-ic vp-l2" data-vt="l2" id="vpL2" hidden aria-pressed="true" title="Capas 2D: ver u ocultar en la cámara las fotos y el dibujo hechos en 2D"><svg viewBox="0 0 24 24" aria-hidden="true"></svg><span>Capas 2D</span></button>
            <button class="vp-ic vp-free" id="vpFree" title="${ea(FREE_TIP[0])}"><svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="3.6"/><path d="M12 3v18"/><path d="M17.6 6.9 19.5 8.4l-2.4.6"/></svg><span>Vista libre</span></button>
            <button class="vp-ic vp-full" id="vpFull" title="Ver la viñeta sola (doble toque en un espacio vacío)" aria-label="Viñeta a pantalla completa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
          </div>
          <div class="vp" id="vp"><canvas id="vpC" aria-label="Viñeta del plano"></canvas><img id="vpRef" alt="" hidden><canvas id="vp2d" aria-hidden="true" hidden></canvas><canvas id="anC" width="1280" height="${Math.round(1280 / ar)}"></canvas><div class="vp-guides" id="vpG"></div><div class="vp-hint" id="vpHint"></div><div class="vp-part" id="vpPart" hidden></div>
            <!-- solo se ve la cámara; al pasar el mouse por ella (o tocarla) aparecen las flechas alrededor -->
            <div class="vp-cam" id="vpCam" role="group" aria-label="Mover la cámara">
              <button class="c-pl" data-cm="pl" title="Girar a la izquierda" aria-label="Girar la cámara a la izquierda"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.2v4.6h4.6"/></svg></button>
              <button class="c-n" data-cm="fwd" title="Avanzar" aria-label="Avanzar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14.5l6-6 6 6"/></svg></button>
              <button class="c-pr" data-cm="pr" title="Girar a la derecha" aria-label="Girar la cámara a la derecha"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.2v4.6h-4.6"/></svg></button>
              <button class="c-up" data-cm="up" title="Subir la cámara" aria-label="Subir la cámara"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6M7 10.5 12 5.5l5 5"/><path d="M6 20h12"/></svg></button>
              <button class="c-w" data-cm="left" title="A la izquierda" aria-label="Mover a la izquierda"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg></button>
              <button class="c-hub" data-cm="pad" title="Mover la cámara: pasa el mouse para ver las flechas (clic para dejarlas fijas)" aria-label="Controles para mover la cámara" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="12.5" height="10" rx="2.6"/><path d="M15.5 10.6 21 7.6v8.8l-5.5-3z"/></svg></button>
              <button class="c-e" data-cm="right" title="A la derecha" aria-label="Mover a la derecha"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg></button>
              <button class="c-s" data-cm="back" title="Retroceder" aria-label="Retroceder"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg></button>
              <button class="c-dn" data-cm="down" title="Bajar la cámara" aria-label="Bajar la cámara"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13M7 13.5l5 5 5-5"/><path d="M6 4h12"/></svg></button>
            </div>
<canvas class="vp-cube" id="vpCube" hidden title="Toca una cara del cubo para ver la figura desde ese lado · arrástralo para girar" aria-label="Cubo de vista: frente, atrás, izquierda, derecha y arriba"></canvas>
            </div>
          <div class="sx-tl">
            <div class="tl-l">
              <button class="tl-b" id="tlPlay" aria-label="Reproducir" title="Reproducir (espacio)">▶</button>
              <span class="tnum tl-time" id="tlTime"></span>
              <label class="tl-dur" title="Duración del plano: las claves se quedan en su segundo">/ <input type="number" id="tlDur" min="0.5" step="0.5" value="${ea(E.dur)}" class="tnum" aria-label="Duración en segundos"> s</label>
            </div>
            <canvas id="tlC" class="tl-c" height="46" tabindex="0" role="slider" aria-label="Tiempo del plano" aria-valuemin="0"></canvas>
            <div class="tl-r">
              <button class="tl-b" id="tlAuto" aria-pressed="false" title="Animar: con la grabación activa, cada cambio crea una clave en el tiempo actual" aria-label="Animar"><i class="rec" aria-hidden="true"></i><span class="tl-lab">Animar</span></button>
              <button class="tl-b" id="tlKey" aria-pressed="false" title="Poner una clave aquí" aria-label="Clave">◆</button>
              <button class="tl-b" id="tlEase" data-v="suave" title="Curva hacia la clave siguiente: suave" aria-label="Curva"></button>
            </div>
          </div>
        </div>
        <div class="sx-plan">
          <div class="pl-add" role="toolbar" aria-label="Agregar a la escena">
            <button type="button" data-pa="fig" aria-haspopup="menu" title="Agregar una figura: un personaje de la escena, una figura genérica o extras"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="6.5" r="3"/><path d="M4.5 20.5v-2.5a5.5 5.5 0 0 1 11 0v2.5"/><path d="M19 8v6M16 11h6"/></svg><span>Figura</span></button>
            <button type="button" data-pa="obj" aria-haspopup="dialog" title="Agregar un objeto del catálogo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5 10 5l6.5 3.5v7L10 19l-6.5-3.5z"/><path d="M3.5 8.5 10 12l6.5-3.5M10 12v7"/><path d="M20 3v5M17.5 5.5h5"/></svg><span>Objeto</span></button>
            <button type="button" data-pa="luz" aria-haspopup="menu" title="Agregar una luz o el esquema de tres puntos"><svg viewBox="0 0 24 24" aria-hidden="true">${SX_TABS.find(x => x[0] === 'luz')[2]}</svg><span>Luz</span></button>
            <span class="pl-grow"></span>
            <button type="button" class="pl-x" data-pa="gen" title="Las cámaras de todos los planos de la escena en una sola planta"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 7.5l9 4.5 9-4.5z"/><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5"/></svg><span>Planta general</span></button>
            <button type="button" class="pl-x" data-pa="exp" aria-haspopup="menu" title="Exportar solo la planta: PDF o imagen PNG"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/></svg><span>Exportar</span></button>
          </div>
          <div class="sx-stage"><canvas id="plC" class="pl-c" title="Planta: arrastra figuras, objetos y la cámara; el círculo blanco gira. Mayúsculas ajusta a 25 cm y 15°. Doble toque: pantalla completa."></canvas><button type="button" id="plPvB" class="pl-pvb" title="Volver al editor (Esc)" aria-label="Volver al editor"><canvas id="plPv" class="pl-pv" aria-hidden="true"></canvas></button>
            <div class="pl-mh" id="plMh" hidden><span>Arrastra entre dos puntos. De la cámara a una figura da la distancia de foco (hasta los ojos) y lo que queda nítido. Toca una medida para quitarla.</span><button type="button" id="plMclr" hidden>Borrar todas</button></div>
            <div class="pl-ov" role="toolbar" aria-label="Planta">
              <button id="plMed" aria-pressed="false" title="Medir distancias en la planta (Esc para terminar)" aria-label="Medir distancias"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 15.5 12-12 5 5-12 12z"/><path d="m7 12 2 2M9.5 9.5l1.5 1.5M12 7l2 2M14.5 4.5 16 6"/></svg></button>
              <button id="plZo" title="Alejar" aria-label="Alejar">−</button><button id="plZi" title="Acercar" aria-label="Acercar">+</button>
              <button id="plFit" title="Ajustar a lo que hay en la escena" aria-label="Ajustar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><circle cx="12" cy="12" r="2.4"/></svg></button>
              <button id="plFull" class="pl-fullbtn" title="Ver la planta sola, a pantalla completa (doble toque en la planta)" aria-label="Planta a pantalla completa">⤢</button>
            </div></div>
        </div>
        <div class="sx-insp">
          <div class="seg sx-tabs" role="group" aria-label="Panel del plano">${SX_TABS.map(([k, n, ic]) => `<button data-tab="${k}" aria-pressed="${ea(k === 'sel')}" title="${n}" aria-label="${n}"><svg viewBox="0 0 24 24" aria-hidden="true">${ic}</svg><span>${n}</span></button>`).join('')}</div>
          <div id="sxPanel" class="sx-panel"></div>
        </div></div>`,
    foot: `<div class="left"><button class="btn" id="edMore" aria-haspopup="menu" title="Duplicar o eliminar el plano" aria-label="Más acciones del plano">${ICO.more}</button>
      <button class="btn ghost" id="edPrev" ${i > 0 ? '' : 'disabled'} title="Guardar e ir al plano anterior" aria-label="Plano anterior">◀<span class="hide-sm"> Anterior</span></button><button class="btn ghost" id="edNext" ${i >= 0 && i < list.length - 1 ? '' : 'disabled'} title="Guardar e ir al plano siguiente" aria-label="Plano siguiente"><span class="hide-sm">Siguiente </span>▶</button></div>
      <button class="btn hide-sm" data-close>Cancelar</button><button class="btn primary" id="edSave">Guardar</button>`,
    // con cambios, cerrar (✕, Esc, Cancelar) pregunta; tocar fuera no cierra
    keep: true,
    dirty: () => !E.saved && !UI.readOnly && (jsonA() !== E.s3_0 || JSON.stringify(E.form) !== E.form0 || E.dur !== E.dur0 || E.refDirty || E.refBack !== !!sh.refBack || E.annoDirty || !!E.lookDirty),
    save: () => save(),
    onClose: () => {
      E.playing = false; ro.disconnect(); if (E.offTake) E.offTake(); if (E.offMod) E.offMod(); removeEventListener('keydown', onKey); removeEventListener('keydown', escFull, true); removeEventListener('keydown', escPart, true); removeEventListener('keydown', escPose, true); removeEventListener('pointerdown', poseWas, true); closePoseMenu(); EDT = null;
      if (!E.saved && E.lookDirty) for (const [k, v] of Object.entries(E.looks0)) { if (!P.elements[k]) continue; if (v) P.elements[k].look = v; else delete P.elements[k].look; }
      if (E.isNew && P.shots[id] && !E.saved) { delete P.shots[id]; changed('data'); derive(); render(); }
    },
  });
  m.classList.add('sx-modal'); m.style.setProperty('--ar', ar);
  const $m = sel => $(sel, m);
  $('.dlg>header h2', m).insertAdjacentHTML('afterend', `<div class="seg s2-ws" role="group" aria-label="Espacio de trabajo"><button data-ws="3d" aria-pressed="true" title="Figuras, cámara y luces en 3D">3D</button><button data-ws="2d" aria-pressed="false" title="Dibujo a mano por capas: lápices, pinceles, flechas, texto y papel cebolla">2D</button></div>`);
  $m('[data-ws="2d"]').onclick = () => save(null, true);
  const vpC = $m('#vpC'), vctx = vpC.getContext('2d'), anC = $m('#anC'), actx = anC.getContext('2d'), tlC = $m('#tlC'), tctx = tlC.getContext('2d');
  const has3D = r3Init();
  if (!has3D) $m('#vpHint').textContent = 'Este navegador no tiene WebGL: se muestra el boceto 2D.';
  // anotaciones guardadas
  const annoKey = id + '~a';
  if (FRAMES[annoKey] && !(d2On(sh) && d2Imp(sh.d2, 'anno'))) { const im = new Image(); im.onload = () => actx.drawImage(im, 0, 0, anC.width, anC.height); im.src = FRAMES[annoKey]; }
  if (E.ref) $m('#vpRef').src = E.ref;
  $m('#vpRef').onload = () => redraw();

  /* ---------- interfaz con la planta ---------- */
  let stCache = null;
  const ed = {
    get s3() { return E.s3; }, get sel() { return E.sel; },
    state: () => stCache || (stCache = s3At(E.s3, E.t)),
    select: id => { E.sel = id; if (E.part && E.part.id !== id) E.part = null; const o = E.s3.objs.find(x => x.id === id); if (id === 'cam') E.tab = 'cam'; else if (o && o.kind === 'luz') E.tab = 'luz'; else if (id) E.tab = 'sel'; panel(); redraw(); },
    editKey, changed: () => edited(), commit,
    // medir en la planta: las medidas van con el plano (s3.meas) y se deshacen como lo demás
    measuring: () => !!E.measure,
    measSet: L => { snapshot(); E.custom = true; if (L.length) E.s3.meas = L; else delete E.s3.meas; commit(); redraw(); measUi(); },
    // con cámara B: la letra de la que se edita, la otra (tenue en la planta) y pasar a la otra con un toque en ella
    camLetter: () => s3HasB(E.s3) ? E.cam.toUpperCase() : '',
    other: () => s3HasB(E.s3) ? planOther(E.s3, E.t, E.cam === 'a' ? 'B' : 'A') : null,
    switchCam: () => camSwitch(E.cam === 'a' ? 'b' : 'a'),
    // un toque en un espacio vacío de la planta suelta lo elegido, después de esperar un posible doble toque
    tapEmpty: () => { clearTimeout(E.deselT); E.deselT = setTimeout(() => { if (EDT === E && E.sel) { E.part = null; ed.select(null); } }, 380); },
    // dos dedos (viñeta o planta): lo que alcanzó a hacer el primer dedo se deshace, sin elegir ni mover nada
    snap: () => ({ s3: JSON.stringify(E.s3), sel: E.sel, part: E.part, tab: E.tab, hist: E.hist.length, gesture: E.gesture }),
    restore: S => {
      if (!S) return;
      clearTimeout(E.vdesT); clearTimeout(E.deselT);
      const ch = JSON.stringify(E.s3) !== S.s3, sc = E.sel !== S.sel || E.tab !== S.tab || E.part !== S.part;
      if (ch) E.s3 = JSON.parse(S.s3);
      if (E.hist.length > S.hist) E.hist.length = S.hist;
      E.gesture = S.gesture; E.tmp = null; stCache = null;
      E.sel = S.sel; E.part = S.part; E.tab = S.tab;
      if (ch || sc) { panel(); redraw(); }
    },
  };
  function snapshot() { if (!E.gesture) { E.hist.push(jsonA()); if (E.hist.length > 60) E.hist.shift(); E.fut = []; E.gesture = true; } }
  /* la escena con la cámara A en su lugar: lo que se guarda, lo que se compara y lo que va al historial (mientras se edita
     la B, E.s3 la tiene cambiada: s3SwapB) */
  function jsonA() { return JSON.stringify(E.cam === 'b' ? s3SwapB(clone(E.s3)) : E.s3); }
  function setS3A(json) { E.s3 = JSON.parse(json); if (E.cam === 'b') { if (s3HasB(E.s3)) s3SwapB(E.s3); else E.cam = 'a'; } }
  /* pasar a editar la otra cámara: la viñeta, la planta, el panel y el tiempo siguen igual, ahora con esa cámara */
  function camSwitch(to) {
    if (!s3HasB(E.s3) || to === E.cam) return;
    E.tmp = null; E.gesture = false; stCache = null; if (E.free) freeOn(false);
    s3SwapB(E.s3); E.cam = to;
    if (E.sel && E.sel !== 'cam' && !E.s3.objs.some(o => o.id === E.sel)) E.sel = null;
    E.tab = 'cam'; panel(); redraw(); camBadge();
  }
  function camBadge() {
    const b = $m('#vpCamAB'); if (!b) return;
    const on = s3HasB(E.s3), L = E.cam.toUpperCase(), O = E.cam === 'a' ? 'B' : 'A';
    b.hidden = !on; b.classList.toggle('is-b', E.cam === 'b');
    $('span', b).textContent = L;
    b.setAttribute('aria-label', `Cámara ${L}: pasar a la cámara ${O}`); b.title = `Ves la cámara ${L}. Toca para pasar a la ${O}`;
  }
  E.liveS3 = () => JSON.parse(jsonA());
  E.goShot = gid => { const n = P.shots[gid]; if (n && n.id !== id) save(n); };
  // la planta general agrega, mueve o quita una luz, un objeto o un animal de la escena: también en este plano abierto
  E.sceneEl = (op, x) => {
    snapshot(); E.custom = true;
    if (op === 'add') scElPut(E.s3, x.ob, x.pos);
    else if (op === 'set') { for (const k of E.s3.keys) if (k.o[x.ob.id]) Object.assign(k.o[x.ob.id], x.pos); }
    else if (op === 'del' && E.s3.objs.some(o => o.id === x.ob.id)) { s3DelObj(E.s3, x.ob.id); if (E.sel === x.ob.id) E.sel = null; }
    stCache = null; commit(); redraw();
  };
  /* deshacer y rehacer: cada gesto guarda la escena 3D de antes; rehacer vuelve a lo deshecho mientras no se edite otra cosa */
  function histGo(dir) {
    const from = dir < 0 ? E.hist : E.fut, to = dir < 0 ? E.fut : E.hist;
    const cur = jsonA();
    while (from.length && from[from.length - 1] === cur) from.pop();
    if (!from.length) { paintTop(); return; }
    to.push(cur);
    setS3A(from.pop()); camBadge();
    E.gesture = false; E.tmp = null; E.part = null; stCache = null; E.custom = true;
    if (E.sel && E.sel !== 'cam' && !E.s3.objs.some(o => o.id === E.sel)) E.sel = null;
    panel(); redraw();
  }
  function editKey() {
    snapshot(); E.custom = true;
    const k = E.s3.keys.find(k => Math.abs(k.t - E.t) < .02);
    if (k) { E.mode = 'key'; delete k.co; delete k.oo; return k; }
    if (E.autokey) { E.mode = 'key'; return s3KeyAt(E.s3, E.t, true); }
    if (!E.tmp) { const st = s3At(E.s3, E.t); E.tmp = { cam: { ...st.cam }, o: clone(st.o) }; for (const id in E.tmp.o) { delete E.tmp.o[id].walk; delete E.tmp.o[id].walkN; } E.tmpBase = clone(E.tmp); }
    E.mode = 'all';
    return E.tmp;
  }
  function edited() {
    if (E.mode === 'all' && E.tmp) {
      const A = E.tmp, B = E.tmpBase;
      for (const f of ['x', 'z', 'h', 'yaw', 'pitch', 'roll']) { const d = A.cam[f] - B.cam[f]; if (Math.abs(d) > 1e-6) { E.s3.keys.forEach(k => { k.cam[f] = round2(k.cam[f] + d); }); B.cam[f] = A.cam[f]; } }
      if (Math.abs(A.cam.lens - B.cam.lens) > 1e-6) { const r = A.cam.lens / B.cam.lens; E.s3.keys.forEach(k => { k.cam.lens = Math.round(k.cam.lens * r * 10) / 10; }); B.cam.lens = A.cam.lens; }
      for (const id in A.o) {
        const a = A.o[id], b = B.o[id];
        for (const f of ['x', 'z', 'rot', 'h']) { if (typeof a[f] !== 'number') continue; const d = a[f] - (b[f] ?? a[f]); if (b[f] == null && f === 'h') { E.s3.keys.forEach(k => { if (k.o[id]) k.o[id].h = a.h; }); b.h = a.h; continue; } if (Math.abs(d) > 1e-6) { E.s3.keys.forEach(k => { if (k.o[id]) k.o[id][f] = f === 'rot' ? Math.round(k.o[id][f] + d) : round2((k.o[id][f] ?? b[f]) + d); }); b[f] = a[f]; } }
        for (const f of ['expr', 'pose']) if (a[f] !== b[f]) { E.s3.keys.forEach(k => { if (k.o[id]) k.o[id][f] = a[f]; }); b[f] = a[f]; }
        const ja = a.j || {}, jb = b.j || (b.j = {});
        for (const f of new Set([...Object.keys(ja), ...Object.keys(jb)])) {
          const d = (ja[f] || 0) - (jb[f] || 0); if (Math.abs(d) < 1e-6) continue;
          E.s3.keys.forEach(k => { const o = k.o[id]; if (!o) return; o.j = { ...(o.j || {}) }; const v = Math.round(((o.j[f] || 0) + d) * 10) / 10; if (v) o.j[f] = v; else delete o.j[f]; });
          jb[f] = ja[f] || 0;
        }
      }
    }
    stCache = null;
    redraw();
  }
  function commit() {
    E.gesture = false; E.tmp = null; stCache = null; if (E.s3.keys.some(k => k.co || k.oo)) s3Bake(E.s3);
    if (E.hist.length && E.hist[E.hist.length - 1] === jsonA()) E.hist.pop();   // un toque que no cambió nada no ocupa un paso de deshacer
    panel(); paintTop();
  }
  const plan = makePlan($m('#plC'), ed);
  E.plan = plan;

  /* ---------- visor ---------- */
  let VW = 0, VH = 0;
  function sizeViewport() {
    const r = $m('#vp').getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    VW = Math.max(160, Math.round(r.width * dpr)); VH = Math.round(VW / ar);
    vpC.width = VW; vpC.height = VH;
    const v2 = $m('#vp2d'); if (v2) { v2.width = VW; v2.height = VH; }
    // la planta, al lado, empieza a la altura de la viñeta (no de la barra de íconos de encima)
    const sv = $m('.sx-view'), sx = $m('.sx');
    if (sv && sx && !sv.classList.contains('full')) sx.style.setProperty('--vpo', Math.max(0, Math.round(r.top - sv.getBoundingClientRect().top)) + 'px');
  }
  /* dibujo de la viñeta: los pedidos se juntan en uno por cuadro de pantalla (antes, cada movimiento del dedo o del
     ratón dibujaba la escena 3D dos veces). syncView deja la escena lista para medir sin dibujarla. */
  const vOpts = () => ({ faceLive: FACE_LIVE.ob, sel: E.sel && E.sel !== 'cam' ? E.sel : null, labels: E.form.names, part: E.part, view: E.free ? orbitCam() : null, poseMenu: E.tab !== 'draw', k: VW / Math.max(1, vpC.getBoundingClientRect().width), meter: (E.s3.light || {}).meter !== false, falseColor: !!(E.s3.light || {}).fc });
  function syncView() { if (!VW) sizeViewport(); if (has3D && !E.full) r3Draw(vctx, E.s3, E.t, VW, VH, { ...vOpts(), syncOnly: true }); }
  function drawViewportNow() {
    if (!VW) sizeViewport();
    // con la planta a pantalla completa la viñeta queda tapada: se dibuja solo su vista previa (E.pv)
    if (E.part && E.part.id !== E.sel) E.part = null;
    // la imagen de referencia: delante tapa la escena (la <img>); detrás, la escena se dibuja sobre ella sin escenario
    // (en la vista libre se ve la escena 3D: la foto solo vale para el encuadre del plano)
    const back = !!(E.ref && E.refBack && has3D && !E.free), rim = $m('#vpRef');
    rim.hidden = !E.ref || (E.refBack && has3D);
    // las capas del dibujo 2D, pegadas al cuadro de la cámara: las fotos de fondo debajo de la escena (que entonces va
    // sin su entorno) y el dibujo encima, en su propio lienzo (sobre la foto de delante, debajo de la anotación)
    const L2 = lay2D(), v2 = $m('#vp2d');
    if (has3D) { if (!E.full) {
      if (L2) { vctx.fillStyle = '#FFFFFF'; vctx.fillRect(0, 0, VW, VH); d2Paint(vctx, sh, L2.F, VW, VH, true); }
      if (back) { if (rim.complete && rim.naturalWidth) vctx.drawImage(rim, 0, 0, VW, VH); else { vctx.fillStyle = '#E4E2DD'; vctx.fillRect(0, 0, VW, VH); } }
      if (L2 && L2.op < 1 && !(E.s3.light || {}).fc) vctx.globalAlpha = L2.op;
      r3Draw(vctx, E.s3, E.t, VW, VH, back || (L2 && L2.under) ? { ...vOpts(), plate: true } : vOpts());
      vctx.globalAlpha = 1;
    } }
    else drawAutoFrame(vctx, VW, VH, shotSketchInfo({ ...sh, ...E.form }));
    v2.hidden = !L2 || !!E.full;
    if (L2 && !E.full) { const g = v2.getContext('2d'); g.clearRect(0, 0, v2.width, v2.height); d2Paint(g, sh, L2.F, v2.width, v2.height, false); l2Pin(); }
    l2Ui();
    paintGuides();
    drawGizmo();
    drawCube();
  }
  let rafId = 0, rafAll = false;
  /* al abrir: primero aparece el editor con la viñeta ya hecha del storyboard (si la hay) y la escena 3D se
     dibuja justo después de ese primer cuadro (antes el editor recién se veía cuando terminaba de dibujarla) */
  E.boot = has3D ? 1 : 0;
  function bootDraw() {
    if (E.boot !== 1) return;
    E.boot = 2;
    const u = typeof thumbCached === 'function' && !E.free ? thumbCached(sh) : null;
    if (u) vpC.style.background = `center / 100% 100% no-repeat url(${u})`;
    requestAnimationFrame(() => setTimeout(() => { if (EDT !== E) return; E.boot = 0; redrawNow(); vpC.style.background = ''; }, 0));
  }
  function flushDraw() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    if (EDT !== E) return;
    const all = rafAll; rafAll = false;
    if (E.boot) bootDraw(); else drawViewportNow();
    if (all) { plan.draw(); drawTimeline(); if (E.pv) E.pv(); if (E.paintPad) E.paintPad(); paintTop(); coachEd(); }
  }
  /* avisos de la primera vez: doblar el cuerpo al elegir una figura; el cubo en la vista libre */
  function coachEd() {
    if (!has3D || m.hidden || E.tab === 'draw' || typeof coach !== 'function') return;
    const ob = E.sel && E.s3.objs.find(o => o.id === E.sel);
    if (E.free) coach('ed-cube', 'Vista libre: arrastra en la viñeta para girar alrededor de la figura. El cubo de arriba a la derecha la muestra de frente, de atrás, de lado o desde arriba.', $m('#vpCube'), { below: true });
    else if (ob && ob.kind === 'actor' && !E.part) coach('ed-pose', 'Toca otra vez la figura sobre un brazo, una pierna, el torso o la cabeza para doblarla. El ▾ junto a su nombre abre la lista de posturas.', $m('#vp'));
  }
  function drawViewport() { if (!rafId) rafId = requestAnimationFrame(flushDraw); }
  /* ---------- el dibujo 2D sobre la cámara (lote U) ----------
     Lo hecho en 2D (fotos y dibujo, con su opacidad y si se ven) va pegado al cuadro del plano: se ve en la vista de
     cámara con el cuadro del 2D que toca en ese momento de la línea de tiempo. En la vista libre no (la cámara que mira
     es otra) y tampoco en la cámara B. «Capas 2D» lo muestra u oculta (se recuerda en este navegador) */
  const has2D = () => d2On(sh) && sh.d2.layers.some(L => L && L.vis);
  function lay2D() {
    if (!E.l2 || E.free || E.cam === 'b' || !has3D || !has2D()) return null;
    const F = d2FrameAt(sh.d2, E.t);
    return { F, under: d2Under(sh, F), op: shot3D(sh) ? d2Op3D(sh) : 1 };
  }
  // la cámara al abrir: si se mueve con el dibujo 2D a la vista, la primera vez se avisa que el dibujo no la sigue
  const camSig = () => JSON.stringify(camKeys(E.s3).map(k => [k.cam.x, k.cam.z, k.cam.h, k.cam.yaw, k.cam.pitch, k.cam.roll, k.cam.lens].join()).filter((c, i, a) => !i || c !== a[i - 1]));
  E.cam0 = camSig();
  function l2Pin() {
    if (E.pinSaid || ls.get('d2pin', 0) || camSig() === E.cam0) return;
    E.pinSaid = true; ls.set('d2pin', 1);
    toast('El dibujo 2D va pegado al cuadro: no se mueve con la cámara. Si hace falta, acomódalo en el 2D.', 6500);
  }
  function l2Ui() {
    const b = $m('#vpL2'); if (!b) return;
    const on = has3D && has2D();
    b.hidden = !on;
    if (!on) return;
    b.setAttribute('aria-pressed', String(!!E.l2)); b.classList.toggle('off', !E.l2);
    const ic = E.l2 ? D2_ICO.eye : D2_ICO.eyeoff, sv = $('svg', b); if (sv.dataset.ic !== ic) { sv.innerHTML = ic; sv.dataset.ic = ic; }
    // un aviso chico abajo cuando las capas no se pueden ver (la vista libre o la cámara B)
    const h = $m('#vpHint'), msg = E.l2 && (E.free || E.cam === 'b') ? (E.free ? 'Capas 2D ocultas en la vista libre' : 'Las capas 2D van con la cámara A') : '';
    if ((h.dataset.l2 || '') !== msg) { h.dataset.l2 = msg; h.textContent = msg; }
  }
  /* ---------- esfera de ejes: aparece al elegir una figura u objeto ----------
     centro = mover libre por el piso · flechas X (rojo) y Z (azul) = mover en un eje ·
     Y (verde, objetos pequeños y luces) = altura · anillo = girar */
  const GZ = { x: '#E5484D', z: '#3E7BFA', y: '#30A46C' };
  function gizmoObj() {
    if (!has3D || E.tab === 'draw' || !E.sel || E.sel === 'cam' || E.part) return null;
    const ob = E.s3.objs.find(o => o.id === E.sel), p = ed.state().o[E.sel];
    if (!ob || !p || (ob.kind === 'luz' && ob.type === 'sol')) return null;
    // flecha hacia arriba: luces, objetos pequeños y figuras (para subirlas a una tarima, una mesa o una cubierta; la vereda la pisan solas)
    const hasY = ob.kind === 'luz' || ob.kind === 'actor' || !!(S3_PROPS[ob.kind] || {}).small;
    const g = liftOf(E.s3, p, false), y0 = g + (ob.kind === 'luz' ? (p.h ?? 2) : hasY ? (p.h || 0) : 0);
    return { ob, p, hasY, y0 };
  }
  /* ---------- vista libre: girar alrededor de la figura sin tocar la cámara del plano ---------- */
  function freeTarget() {
    const st = ed.state(), ob = E.sel && E.s3.objs.find(o => o.id === E.sel), p = ob && st.o[ob.id];
    if (p) { const h = ob.kind === 'actor' ? lookOf(ob).height * (p.pose === 'suelo' ? .12 : poseDef(p.pose).h * .56) + liftOf(E.s3, p) : liftOf(E.s3, p) + .4; return { x: p.x, y: h, z: p.z }; }
    const acts = E.s3.objs.filter(o => o.kind === 'actor').map(o => st.o[o.id]).filter(Boolean);
    if (acts.length) return { x: acts.reduce((a, q) => a + q.x, 0) / acts.length, y: .9, z: acts.reduce((a, q) => a + q.z, 0) / acts.length };
    const c = st.cam; return { x: c.x - Math.sin(rad(c.yaw)) * 3, y: .9, z: c.z - Math.cos(rad(c.yaw)) * 3 };
  }
  function freeOn(on) {
    if (on && !has3D) return;
    if (on && E.tab === 'draw') { E.tab = 'sel'; panel(); }    // el dibujo va sobre el encuadre del plano, no sobre la vista libre
    if (on) {
      // empieza mirando desde donde está la cámara del plano, para no perder la orientación
      const t = freeTarget(), c = ed.state().cam, dx = c.x - t.x, dy = c.h - t.y, dz = c.z - t.z, d = Math.hypot(dx, dy, dz) || 3;
      E.free = { t, yaw: deg(Math.atan2(dx, dz)), pitch: clamp(deg(Math.asin(clamp(dy / d, -1, 1))), -10, 80), dist: clamp(d, 1.2, 14), lens: 30 };
    } else E.free = null;
    const b = $m('#vpFree'), vp = $m('#vp');
    vp.classList.toggle('free', !!E.free); b.classList.toggle('on', !!E.free);
    b.innerHTML = E.free ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="12.5" height="10" rx="2.6"/><path d="M15.5 10.6 21 7.6v8.8l-5.5-3z"/></svg><span>Volver<i class="vf-l"> al encuadre</i></span>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="3.6"/><path d="M12 3v18"/><path d="M17.6 6.9 19.5 8.4l-2.4.6"/></svg><span>Vista libre</span>';
    b.title = FREE_TIP[E.free ? 1 : 0];
    E.freeAnim = null; E.cubeHover = null;
    if (E.paintPad) E.paintPad();
    redraw();
  }
  /* ángulos rápidos de la vista libre: relativos a hacia dónde mira la figura elegida, con un giro suave */
  function freeBase() {
    const st = ed.state(), sel = E.sel && E.sel !== 'cam' && E.s3.objs.find(o => o.id === E.sel);
    const acts = E.s3.objs.filter(o => o.kind === 'actor'), ref = sel ? st.o[sel.id] : acts.length === 1 ? st.o[acts[0].id] : null;
    return ref ? ref.rot || 0 : st.cam.yaw;                       // sin figura: el frente es el lado de la cámara del plano
  }
  function freeAngle(k) {
    if (!E.free) return;
    const base = freeBase(), snap = Math.round((E.free.yaw - base) / 90) * 90;
    let yaw, pitch;
    if (k === 'cw' || k === 'ccw') { yaw = base + snap + (k === 'cw' ? 90 : -90); pitch = E.free.pitch > 70 ? 85 : 8; }   // un cuarto de vuelta alrededor de la figura
    else if (k === 'level') { yaw = base + snap; pitch = 8; }
    else { yaw = base + ({ front: 0, back: 180, left: 90, right: -90 }[k] ?? snap); pitch = k === 'top' ? 85 : 8; }
    const F = E.free, from = { yaw: F.yaw, pitch: F.pitch, t: { ...F.t } }, to = freeTarget();
    const dy = ((yaw - from.yaw) % 360 + 540) % 360 - 180, t0 = performance.now(), D = 460;
    const id = E.freeAnim = {};
    const step = now => {
      if (E.freeAnim !== id || !E.free) return;
      const u = Math.min(1, (now - t0) / D), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      F.yaw = from.yaw + dy * e; F.pitch = from.pitch + (pitch - from.pitch) * e;
      F.t = { x: from.t.x + (to.x - from.t.x) * e, y: from.t.y + (to.y - from.t.y) * e, z: from.t.z + (to.z - from.t.z) * e };
      drawViewport();
      if (u < 1) requestAnimationFrame(step); else { F.yaw = ((F.yaw % 360) + 360) % 360; E.freeAnim = null; }
    };
    requestAnimationFrame(step);
  }
  /* ---------- cubo de vista (arriba a la derecha, en la vista libre) ----------
     Es la figura vista como un cubo: gira con la vista y cada cara lleva su lado. Tocar una cara gira la
     vista hasta ahí; arrastrarlo gira como en la viñeta. */
  const CUBE_F = [
    { k: 'front', n: [0, 0, 1], r: [1, 0, 0], d: [0, -1, 0], t: 'Frente' },
    { k: 'back', n: [0, 0, -1], r: [-1, 0, 0], d: [0, -1, 0], t: 'Atrás' },
    { k: 'left', n: [1, 0, 0], r: [0, 0, -1], d: [0, -1, 0], t: 'Izq.' },
    { k: 'right', n: [-1, 0, 0], r: [0, 0, 1], d: [0, -1, 0], t: 'Der.' },
    { k: 'top', n: [0, 1, 0], r: [1, 0, 0], d: [0, 0, 1], t: 'Arriba' },
    { k: 'bottom', n: [0, -1, 0], r: [1, 0, 0], d: [0, 0, -1], t: 'Abajo' },
  ];
  const v3dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const v3cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  function drawCube() {
    const cv = $m('#vpCube'); if (!cv) return;
    cv.hidden = !E.free || !has3D;
    if (cv.hidden) return;
    const css = cv.clientWidth || 84, dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(css * dpr);
    if (cv.width !== W) cv.width = cv.height = W;
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W);
    const rel = rad(E.free.yaw - freeBase()), P = rad(E.free.pitch), cp = Math.cos(P);
    const d = [Math.sin(rel) * cp, Math.sin(P), Math.cos(rel) * cp];
    let R = v3cross([0, 1, 0], d); const rl = Math.hypot(...R) || 1; R = R.map(v => v / rl);
    const U = v3cross(d, R), s = W * .19;
    const pr = p => [W / 2 + v3dot(p, R) * s, W / 2 - v3dot(p, U) * s];
    const font = getComputedStyle(cv).fontFamily || 'sans-serif';
    const hits = [];
    const poly = pts => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
    for (const F of CUBE_F) {
      const vis = v3dot(F.n, d); if (vis <= .015) continue;
      const at = (a, b) => [F.n[0] + a * F.r[0] + b * F.d[0], F.n[1] + a * F.r[1] + b * F.d[1], F.n[2] + a * F.r[2] + b * F.d[2]];
      const pts = [at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)].map(pr);
      const off = F.k === 'bottom', hov = E.cubeHover === F.k && !off;
      g.setTransform(1, 0, 0, 1, 0, 0);
      poly(pts);
      // caras casi transparentes (la que mira de frente, un poco más clara) y aristas blancas finas
      g.fillStyle = hov ? 'rgba(255,255,255,.42)' : `rgba(255,255,255,${(.07 + .15 * vis).toFixed(3)})`; g.fill();
      g.lineJoin = 'round'; g.lineWidth = 1.3 * dpr; g.strokeStyle = 'rgba(255,255,255,.95)'; g.stroke();
      // el nombre de la cara, impreso sobre ella (se inclina con la cara)
      if (vis > .22) {
        const o = pr(F.n), ex = pr(at(1, 0)), ey = pr(at(0, 1));
        g.setTransform((ex[0] - o[0]) / 50, (ex[1] - o[1]) / 50, (ey[0] - o[0]) / 50, (ey[1] - o[1]) / 50, o[0], o[1]);
        g.font = '700 25px ' + font;
        const k = Math.min(1, 84 / g.measureText(F.t).width);
        g.scale(k, k);
        g.globalAlpha = Math.min(1, (vis - .22) * 3) * (off ? .4 : .95);
        g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(F.t, 0, 1);
        g.globalAlpha = 1;
      }
      hits.push({ k: F.k, pts, off });
    }
    // flechas alrededor: girar un cuarto de vuelta a cada lado, mirar desde arriba o volver a la altura de la figura
    g.setTransform(1, 0, 0, 1, 0, 0);
    const c = W / 2, m = W * .085, h = W * .055, top = E.free.pitch > 70, low = E.free.pitch < 30;
    const tris = [
      { k: 'ccw', pts: [[m - h * .2, c], [m + h, c - h * 1.1], [m + h, c + h * 1.1]] },
      { k: 'cw', pts: [[W - m + h * .2, c], [W - m - h, c - h * 1.1], [W - m - h, c + h * 1.1]] },
      !top && { k: 'top', pts: [[c, m - h * .2], [c - h * 1.1, m + h], [c + h * 1.1, m + h]] },
      !low && { k: 'level', pts: [[c, W - m + h * .2], [c - h * 1.1, W - m - h], [c + h * 1.1, W - m - h]] },
    ].filter(Boolean);
    for (const T of tris) {
      const hov = E.cubeHover === T.k;
      poly(T.pts); g.fillStyle = hov ? '#FFFFFF' : 'rgba(255,255,255,.78)'; g.fill();
      // zona de toque más grande que el triángulo
      const [x0, y0] = T.pts[0], cx = (T.pts[0][0] + T.pts[1][0] + T.pts[2][0]) / 3, cy = (T.pts[0][1] + T.pts[1][1] + T.pts[2][1]) / 3, z = W * .09;
      hits.unshift({ k: T.k, pts: [[cx - z, cy - z], [cx + z, cy - z], [cx + z, cy + z], [cx - z, cy + z]], tri: true, x0, y0 });
    }
    E.cubeHits = hits;
  }
  function cubeAt(cv, e) {
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height;
    for (const h of E.cubeHits || []) {
      let inside = false;
      for (let i = 0, j = h.pts.length - 1; i < h.pts.length; j = i++) { const [xi, yi] = h.pts[i], [xj, yj] = h.pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; }
      if (inside) return h.off ? null : h.k;
    }
    return null;
  }
  function orbitCam() {
    const F = E.free, t = F.t, cp = Math.cos(rad(F.pitch));
    return { pos: [t.x + F.dist * cp * Math.sin(rad(F.yaw)), t.y + F.dist * Math.sin(rad(F.pitch)), t.z + F.dist * cp * Math.cos(rad(F.yaw))], target: [t.x, t.y, t.z], lens: F.lens };
  }
  /* en la vista libre, la cámara del plano se ve como un ícono con su campo de visión */
  function drawShotCam() {
    if (!E.free || !has3D) return;
    const fr = r3ShotFrustum(ed.state().cam, ar, .9); if (!fr) return;
    const P2 = fr.map(w => r3Project(w[0], w[1], w[2], VW, VH));
    if (!P2[0].front) return;
    const k = VW / Math.max(1, vpC.getBoundingClientRect().width), g2 = vctx;
    g2.save(); g2.lineJoin = 'round'; g2.lineCap = 'round';
    const path = () => { g2.beginPath(); for (let i = 1; i <= 4; i++) { g2.moveTo(P2[0].x, P2[0].y); g2.lineTo(P2[i].x, P2[i].y); } g2.moveTo(P2[1].x, P2[1].y); for (const i of [2, 3, 4, 1]) g2.lineTo(P2[i].x, P2[i].y); };
    path(); g2.lineWidth = 3.4 * k; g2.strokeStyle = 'rgba(0,0,0,.3)'; g2.stroke(); g2.lineWidth = 1.6 * k; g2.strokeStyle = '#FFFFFF'; g2.stroke();
    g2.fillStyle = 'rgba(255,255,255,.14)'; g2.beginPath(); g2.moveTo(P2[1].x, P2[1].y); for (const i of [2, 3, 4]) g2.lineTo(P2[i].x, P2[i].y); g2.closePath(); g2.fill();
    g2.fillStyle = '#E5484D'; g2.strokeStyle = '#FFFFFF'; g2.lineWidth = 2 * k; g2.beginPath(); g2.arc(P2[0].x, P2[0].y, 6 * k, 0, Math.PI * 2); g2.fill(); g2.stroke();
    g2.restore();
  }
  /* parte del cuerpo elegida: un aro fino en la articulación y un punto donde se agarra */
  let _pv = null, _pe = null;
  function drawPartRing() {
    E.pring = null;
    paintPartHud();
    if (!E.part || !has3D || E.full) return;
    const A = poseFig(R3.objs.get(E.part.id)), part = POSE_PARTS[E.part.key];
    if (!A || !A.fig || !part) return;
    A.root.updateMatrixWorld(true);
    if (!_pv) { _pv = new THREE.Vector3(); _pe = new THREE.Vector3(); }
    const k = VW / Math.max(1, vpC.getBoundingClientRect().width);
    const a = r3Project(...posePivot(A, part, _pv).toArray(), VW, VH), b = r3Project(...poseEff(A, part, _pe).toArray(), VW, VH);
    if (!a.front || !b.front) return;
    const R = (part.ik ? 15 : 13) * k, c = part.ik ? b : a;
    const g2 = vctx;
    g2.save();
    g2.lineCap = 'round'; g2.lineJoin = 'round';
    // codo y rodilla: el aro es el camino que recorre el punto al doblarse; las demás, un aro en la articulación
    const st = ed.state().o[E.part.id];
    const arc = part.dof.length === 1 && st ? poseArc(A, st, part, st.j || {}, w => { const q = r3Project(w.x, w.y, w.z, VW, VH); return [q.x, q.y]; }) : null;
    const stroke = () => { g2.lineWidth = 3.6 * k; g2.strokeStyle = 'rgba(0,0,0,.26)'; g2.stroke(); g2.lineWidth = 1.8 * k; g2.strokeStyle = '#FFFFFF'; g2.stroke(); };
    if (arc) { g2.beginPath(); arc.forEach((q, i) => i ? g2.lineTo(q.p[0], q.p[1]) : g2.moveTo(q.p[0], q.p[1])); stroke(); g2.beginPath(); g2.arc(a.x, a.y, 4 * k, 0, Math.PI * 2); g2.fillStyle = '#FFFFFF'; g2.fill(); }
    else if (!part.fingers) { g2.beginPath(); g2.arc(c.x, c.y, R, 0, Math.PI * 2); stroke(); }
    if (!part.ik && !arc) {
      g2.setLineDash([3 * k, 3 * k]); g2.lineWidth = 1.3 * k; g2.strokeStyle = 'rgba(255,255,255,.9)';
      g2.beginPath(); g2.moveTo(a.x, a.y); g2.lineTo(b.x, b.y); g2.stroke(); g2.setLineDash([]);
    }
    // aro de la muñeca (antebrazo): gira la mano; su punto blanco marca cuánto
    let tw = null, fg = null;
    const jj = (st && st.j) || {};
    if (part.twist) {
      const TR = poseTwistRing(A, part.twist, w => { const q = w.clone().project(R3.cam); return [(q.x + 1) / 2 * VW, (1 - q.y) / 2 * VH]; }, 13 * k);
      g2.beginPath(); TR.pts.forEach((q, i) => i ? g2.lineTo(q.p[0], q.p[1]) : g2.moveTo(q.p[0], q.p[1])); g2.closePath(); stroke();
      const val = (part.side === 'R' ? 1 : -1) * (jj['w' + part.side] || 0) * Math.PI / 180, kn = ringAt(TR.pts, Math.PI + val);
      g2.fillStyle = '#FFFFFF'; g2.strokeStyle = 'rgba(0,0,0,.45)'; g2.lineWidth = 1.4 * k;
      g2.beginPath(); g2.arc(kn[0], kn[1], 5 * k, 0, Math.PI * 2); g2.fill(); g2.stroke();
      tw = { pts: TR.pts, knob: kn };
    }
    // aro de los dedos (mano): girarlo cierra la mano (en el sentido del reloj) o la abre; el arco rojo muestra cuánto
    if (part.fingers) {
      const RF = 24 * k, cu = clamp((jj['f' + part.side] || 0) / 100, 0, 1), a0 = -Math.PI / 2, a1 = a0 + cu * FING_SPAN;
      g2.beginPath(); g2.arc(b.x, b.y, RF, 0, Math.PI * 2); stroke();
      if (cu > .005) { g2.beginPath(); g2.arc(b.x, b.y, RF, a0, a1); g2.lineWidth = 3.2 * k; g2.strokeStyle = '#E5484D'; g2.stroke(); }
      const kn = [b.x + Math.cos(a1) * RF, b.y + Math.sin(a1) * RF];
      g2.fillStyle = '#FFFFFF'; g2.strokeStyle = '#E5484D'; g2.lineWidth = 2 * k;
      g2.beginPath(); g2.arc(kn[0], kn[1], 5 * k, 0, Math.PI * 2); g2.fill(); g2.stroke();
      fg = { r: RF, knob: kn };
    }
    // punto que se arrastra (sin contorno: una sombra suave lo separa del fondo)
    g2.fillStyle = '#E5484D'; g2.shadowColor = 'rgba(0,0,0,.35)'; g2.shadowBlur = 3 * k;
    g2.beginPath(); g2.arc(b.x, b.y, 6.5 * k, 0, Math.PI * 2); g2.fill(); g2.shadowBlur = 0;
    g2.restore();
    E.pring = { pv: [a.x, a.y], ef: [b.x, b.y], r: R, k, tw, fg };
  }
  const FING_SPAN = Math.PI * 4 / 3;   // de abierta a puño: dos tercios de vuelta
  function ringAt(pts, th) {
    const t = ((th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), n = pts.length, f = t / (Math.PI * 2) * n, i = Math.floor(f) % n, u = f - Math.floor(f), a = pts[i].p, b = pts[(i + 1) % n].p;
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  }
  function paintPartHud() {
    const h = $m('#vpPart'); if (!h) return;
    const part = E.part && POSE_PARTS[E.part.key];
    h.hidden = !part;
    if (!part) return;
    const key = E.part.id + '|' + E.part.key;
    if (h.dataset.k === key) return;
    h.dataset.k = key;
    h.innerHTML = `<span class="vpp-t" title="${esc(part.hint || 'Arrastra para ' + part.act)}"><b>${esc(part.name)}</b></span>${part.twist ? `<button data-p="j" data-f="w${ea(part.side)}" data-v="-30" title="Girar la mano (palma hacia un lado)" aria-label="Girar la mano a un lado"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12a7 7 0 1 0 2-5M5 4v4h4"/></svg></button><button data-p="j" data-f="w${ea(part.side)}" data-v="30" title="Girar la mano (palma hacia el otro lado)" aria-label="Girar la mano al otro lado"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M19 12a7 7 0 1 1-2-5M19 4v4h-4"/></svg></button>` : ''}${part.fingers ? `<button data-p="j" data-f="m${ea(part.side)}" data-v="-20" title="Doblar la muñeca hacia el dorso" aria-label="Doblar la muñeca hacia el dorso"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 19V6M7 11l5-5 5 5"/></svg></button><button data-p="j" data-f="m${ea(part.side)}" data-v="20" title="Doblar la muñeca hacia la palma" aria-label="Doblar la muñeca hacia la palma"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 5v13M7 13l5 5 5-5"/></svg></button>` : ''}<button data-p="reset" title="Volver esta parte a la postura base" aria-label="Restablecer"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.6h4.6"/></svg></button><button data-p="x" aria-label="Soltar la parte" title="Soltar (Esc)">${ICO.close}</button>`;
  }
  /* ---------- expresiones (una sola herramienta: expresiones.js) ----------
     Un personaje guarda sus dibujos en su ficha (vale en todos los planos); una figura genérica, en el
     proyecto. «cur»: edita la expresión que tiene la figura; «new»: una expresión nueva. */
  function exprEdit(anchor, ob, mode) {
    const cur = (ed.state().o[ob.id] || {}).expr || 'neutral', lk = lookOf(ob), el = ob.el && P.elements[ob.el];
    const name = exprLabel(cur, lk), clone = x => JSON.parse(JSON.stringify(x));
    let key = null, d, named = true, title = 'Nueva expresión';
    if (mode === 'new') d = { name: '', base: cur.slice(0, 2) === 'f:' || cur.slice(0, 2) === 'c:' ? '' : cur, strokes: [] };
    else if (cur.slice(0, 2) === 'f:' && customFace(cur.slice(2))) { key = cur; d = clone(customFace(cur.slice(2))); title = `Editar «${name}»`; }
    else if (el) {
      const own = ((el.look || {}).faces || {})[cur];
      key = cur; named = cur.slice(0, 2) === 'c:'; title = `Editar «${name}»`;
      d = own ? clone(own) : { base: cur.slice(0, 2) === 'c:' ? '' : cur, strokes: [] };
    } else { d = { name, base: cur.slice(0, 2) === 'f:' ? 'neutral' : cur, strokes: [] }; title = `Editar «${name}»`; }   // genérica: el dibujo va al proyecto
    openExprEditor({ anchor, title, sub: ob.name || 'Figura', d, named, eyes: el ? (el.look || {}).eyes !== false : null, glasses: lk.glasses || '', ob: ob.id, live: () => drawViewport(),
      save: (nd, eyes, gl) => exprSave(ob, key, nd, eyes, gl) });
  }
  /* guarda el dibujo en la ficha del personaje o en el proyecto; la figura pasa a llevarlo en este plano */
  function exprSave(ob, key, nd, eyes, gl) {
    const el = ob.el && P.elements[ob.el];
    let k2 = key;
    if (el) exprLook(el, { ...((el.look || {}).faces || {}) }, eyes, gl);
    else if ((ob.look || {}).glasses !== (gl || undefined)) { ob.look = { ...(ob.look || {}), glasses: gl || undefined }; stCache = null; }
    if (k2 && k2.slice(0, 2) === 'f:') { P.faces[k2.slice(2)] = nd; faceChanged(k2.slice(2)); }
    else if (el) {
      const faces = { ...((el.look || {}).faces || {}) };
      if (!k2) { k2 = 'c:' + uid('x'); nd.name = nd.name || 'Expresión ' + (Object.keys(faces).filter(x => x.slice(0, 2) === 'c:').length + 1); }
      faces[k2] = nd;
      exprLook(el, faces, eyes);
    } else {
      P.faces = P.faces || {};
      const id = uid('f'); k2 = 'f:' + id;
      nd.name = nd.name || 'Dibujo ' + (Object.keys(P.faces).length + 1);
      P.faces[id] = nd; faceChanged(id);
    }
    changed('data');
    const k = editKey(); if (k.o[ob.id]) k.o[ob.id].expr = k2; edited(); commit();
    panel(); redraw();
    toast(el && k2.slice(0, 2) !== 'f:' ? `«${exprLabel(k2, lookOf(ob))}» guardada en la ficha de ${titleCase(el.name)}: cambia en todos sus planos.` : `«${nd.name || 'Dibujo'}» guardada en el proyecto.`);
  }
  /* la biblioteca del personaje queda guardada aunque se cancele el editor del plano (como desde su ficha) */
  function exprLook(el, faces, eyes, gl) {
    const set = lk => {
      lk = { ...(lk || {}), faces }; if (!Object.keys(faces).length) delete lk.faces; if (eyes === false) lk.eyes = false; else delete lk.eyes;
      if (gl !== undefined) { if (gl) lk.glasses = gl; else delete lk.glasses; }
      return lk;
    };
    el.look = set(el.look);
    E.looks0[el.id] = set(E.looks0[el.id] ? JSON.parse(JSON.stringify(E.looks0[el.id])) : null);
    stCache = null;
    if (typeof THUMB3 !== 'undefined') THUMB3.clear();
  }
  /* lentes dibujados: del personaje (en todos sus planos) o de la figura genérica (en este plano) */
  function exprGlasses(ob, gl) {
    const el = ob.el && P.elements[ob.el];
    if (el) { exprLook(el, { ...((el.look || {}).faces || {}) }, (el.look || {}).eyes !== false, gl); changed('data'); }
    else { snapshot(); E.custom = true; ob.look = { ...(ob.look || {}), glasses: gl || undefined }; stCache = null; commit(); }
    panel(); redraw();
  }
  /* quitar: el redibujo de una predefinida (vuelve la original) o una expresión propia (la figura queda neutral) */
  function exprDelete(ob, k) {
    const el = ob.el && P.elements[ob.el], lk = lookOf(ob), name = exprLabel(k, lk);
    if (k.slice(0, 2) === 'f:') {
      const id = k.slice(2), d = customFace(id); if (!d) return;
      snapshot(); E.custom = true;
      E.s3.keys.forEach(kk => { for (const o of Object.values(kk.o)) if (o.expr === k) o.expr = d.base || 'neutral'; });
      delete P.faces[id]; faceChanged(id); changed('data');
      commit(); panel(); redraw(); toast(`Expresión «${name}» borrada. En los otros planos esas caras quedan neutrales.`);
      return;
    }
    if (!el) return;
    const faces = { ...((el.look || {}).faces || {}) }; if (!faces[k]) return;
    delete faces[k];
    exprLook(el, faces, (el.look || {}).eyes !== false);
    changed('data');
    if (k.slice(0, 2) === 'c:') { snapshot(); E.custom = true; E.s3.keys.forEach(kk => { const o = kk.o[ob.id]; if (o && o.expr === k) o.expr = 'neutral'; }); commit(); }
    panel(); redraw();
    toast(k.slice(0, 2) === 'c:' ? `Expresión «${name}» borrada de la ficha de ${titleCase(el.name)}.` : `«${name}» vuelve a ser la predefinida para ${titleCase(el.name)}.`);
  }
  /* ---------- posturas predefinidas ----------
     Lista junto al ▾ del nombre (o al botón del panel): se ven 5 y el resto aparece al deslizar con el dedo
     o con la rueda. Elegir una cambia solo el cuerpo (sin objetos) en todo el plano y borra lo doblado a mano. */
  function closePoseMenu() { const p = document.querySelector('#pop.pop-pose'); if (p) closePop(); }
  function openPoseMenu(id, at) {
    const ob = E.s3.objs.find(o => o.id === id); if (!ob) return;
    if (E.sel !== id) { E.part = null; ed.select(id); }
    const cur = (ed.state().o[id] || {}).pose || 'pie';
    let r;
    if (at instanceof Element) r = at.getBoundingClientRect();
    else { const c = vpC.getBoundingClientRect(), k = c.width / VW; r = { left: c.left + at.bx * k, right: c.left + at.ax * k, top: c.top + at.y0 * k, bottom: c.top + at.ay * k + 2, width: (at.ax - at.bx) * k }; }
    const html = `<div class="pose-h">Postura · ${esc(ob.name || 'Figura')}</div><div class="pose-list" role="listbox" aria-label="Posturas">${S3_POSE.map(([k, n]) => `<button role="option" data-pose="${k}" aria-selected="${ea(k === cur)}"><span>${esc(n)}</span>${k === cur ? '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}</button>`).join('')}</div>`;
    const p = popover(r, html, p => {
      p.classList.add('pop-pose'); p.dataset.id = id;
      const L = p.querySelector('.pose-list'), sel = L.querySelector('[aria-selected="true"]');
      const fade = () => { p.classList.toggle('more-up', L.scrollTop > 2); p.classList.toggle('more-dn', L.scrollTop + L.clientHeight < L.scrollHeight - 2); };
      if (sel) L.scrollTop = Math.max(0, sel.offsetTop - L.clientHeight / 2 + sel.offsetHeight / 2);
      fade(); L.addEventListener('scroll', fade, { passive: true });
      L.addEventListener('click', e => { const b = e.target.closest('[data-pose]'); if (!b) return; closePop(); setPose(id, b.dataset.pose); });
      // la rueda mueve la lista (no la página ni la viñeta de abajo)
      L.addEventListener('wheel', e => { e.stopPropagation(); }, { passive: true });
    });
    popPlace(p, r);
    // en el teléfono la lista también queda junto a la figura (no como hoja desde abajo)
    if (matchMedia('(max-width:760px)').matches) for (const k of ['left', 'top']) p.style.setProperty(k, p.style[k], 'important');
  }
  function setPose(id, key) {
    const cur = ed.state().o[id]; if (!cur) return;
    const D = poseDef(key), was = poseDef(cur.pose);
    // la expresión acompaña a la postura solo si la cara estaba neutral o con la que sugirió la postura anterior
    const ex = cur.expr || 'neutral', expr = ex === 'neutral' || ex === was.expr ? D.expr || 'neutral' : ex;
    snapshot(); E.custom = true; E.part = null;
    const put = o => { if (!o) return; o.pose = key; o.expr = expr; delete o.j; };
    E.s3.keys.forEach(k => put(k.o[id])); if (E.tmp) { put(E.tmp.o[id]); if (E.tmpBase) put(E.tmpBase.o[id]); }
    commit(); redraw();
  }
  function drawGizmo() {
    E.giz = null;
    drawShotCam();
    drawPartRing();
    const g = gizmoObj(); if (!g) return;
    const { p, hasY, y0 } = g, k = VW / Math.max(1, vpC.getBoundingClientRect().width);
    const c = r3Project(p.x, y0, p.z, VW, VH);
    if (!c.front || c.x < -40 || c.y < -40 || c.x > VW + 40 || c.y > VH + 40) return;
    // flechas finas de largo fijo en pantalla (entre 34 y 50 px), en la dirección de cada eje
    const tip = (dx, dy, dz) => {
      const q = r3Project(p.x + dx * .5, y0 + dy * .5, p.z + dz * .5, VW, VH);
      let vx = q.x - c.x, vy = q.y - c.y; const L = Math.hypot(vx, vy);
      if (!q.front || L < 1e-3) return null;
      const want = clamp(L, 34 * k, 50 * k); vx *= want / L; vy *= want / L;
      return [c.x + vx, c.y + vy];
    };
    const ax = { x: tip(1, 0, 0), z: tip(0, 0, 1), y: hasY ? tip(0, 1, 0) : null };
    // anillo de giro sobre el piso (o a la altura del objeto)
    const R = .55, ring = [];
    for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, q = r3Project(p.x + Math.sin(a) * R, y0, p.z + Math.cos(a) * R, VW, VH); if (q.front) ring.push([q.x, q.y]); }
    const rr = rad(p.rot || 0), rh = r3Project(p.x + Math.sin(rr) * R, y0, p.z + Math.cos(rr) * R, VW, VH);
    const g2 = vctx;
    g2.save();
    g2.lineCap = 'round'; g2.lineJoin = 'round';
    if (ring.length > 6) {
      g2.beginPath(); ring.forEach(([x, y], i) => i ? g2.lineTo(x, y) : g2.moveTo(x, y));
      g2.strokeStyle = 'rgba(0,0,0,.28)'; g2.lineWidth = 2.4 * k; g2.stroke();
      g2.strokeStyle = 'rgba(255,255,255,.85)'; g2.lineWidth = 1.2 * k; g2.setLineDash([4 * k, 4 * k]); g2.stroke(); g2.setLineDash([]);
    }
    // flechas mínimas: trazo fino con un halo oscuro suave y una punta pequeña (sin esfera ni letras)
    for (const [key, t] of Object.entries(ax)) {
      if (!t) continue;
      const a = Math.atan2(t[1] - c.y, t[0] - c.x), s = 7 * k, bx = t[0] - Math.cos(a) * s * .5, by = t[1] - Math.sin(a) * s * .5;
      const head = () => { g2.beginPath(); g2.moveTo(t[0] + Math.cos(a) * s * .55, t[1] + Math.sin(a) * s * .55); g2.lineTo(t[0] + Math.cos(a + 2.55) * s, t[1] + Math.sin(a + 2.55) * s); g2.lineTo(t[0] + Math.cos(a - 2.55) * s, t[1] + Math.sin(a - 2.55) * s); g2.closePath(); };
      g2.strokeStyle = 'rgba(0,0,0,.3)'; g2.lineWidth = 3.2 * k; g2.beginPath(); g2.moveTo(c.x + Math.cos(a) * 5 * k, c.y + Math.sin(a) * 5 * k); g2.lineTo(bx, by); g2.stroke();
      head(); g2.lineWidth = 2.2 * k; g2.stroke();
      g2.strokeStyle = GZ[key]; g2.lineWidth = 1.6 * k; g2.beginPath(); g2.moveTo(c.x + Math.cos(a) * 5 * k, c.y + Math.sin(a) * 5 * k); g2.lineTo(bx, by); g2.stroke();
      g2.fillStyle = GZ[key]; head(); g2.fill();
    }
    if (rh.front) { g2.fillStyle = '#fff'; g2.strokeStyle = 'rgba(0,0,0,.45)'; g2.lineWidth = 1 * k; g2.beginPath(); g2.arc(rh.x, rh.y, 4.5 * k, 0, Math.PI * 2); g2.fill(); g2.stroke(); }
    g2.restore();
    E.giz = { c: [c.x, c.y], ax, ring, rh: rh.front ? [rh.x, rh.y] : null, k, y0 };
  }
  function gizmoHit(px, py) {
    const G = E.giz; if (!G) return null;
    const k = G.k, d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (d([px, py], G.c) < 14 * k) return 'free';
    if (G.rh && d([px, py], G.rh) < 13 * k) return 'rot';
    for (const key of ['y', 'x', 'z']) {
      const t = G.ax[key]; if (!t) continue;
      // a lo largo de la flecha (de 35 % a la punta)
      const vx = t[0] - G.c[0], vy = t[1] - G.c[1], L2 = vx * vx + vy * vy;
      const u = ((px - G.c[0]) * vx + (py - G.c[1]) * vy) / L2;
      if (u < .35 || u > 1.25) continue;
      const qx = G.c[0] + vx * u, qy = G.c[1] + vy * u;
      if (Math.hypot(px - qx, py - qy) < 10 * k) return key;
    }
    for (let i = 1; i < G.ring.length; i++) {
      const a = G.ring[i - 1], b = G.ring[i], vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy || 1;
      const u = clamp(((px - a[0]) * vx + (py - a[1]) * vy) / L2, 0, 1);
      if (Math.hypot(px - (a[0] + vx * u), py - (a[1] + vy * u)) < 7 * k) return 'rot';
    }
    return null;
  }
  function redraw() { rafAll = true; if (!rafId) rafId = requestAnimationFrame(flushDraw); }
  function redrawNow() { rafAll = true; flushDraw(); }
  E.redraw = () => { stCache = null; redraw(); };
  E.redrawNow = () => { stCache = null; redrawNow(); };
  const ro = new ResizeObserver(() => { sizeViewport(); plan.resize(); sizeTimeline(); redrawNow(); });   // al cambiar de tamaño el lienzo queda en blanco: se dibuja enseguida
  ro.observe($m('#vp')); ro.observe($m('#plC'));

  let vDrag = null;
  const vpPos = e => { const r = vpC.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * VW, (e.clientY - r.top) / r.height * VH, r]; };
  vpC.addEventListener('pointerdown', e => {
    if (!has3D || E.tab === 'draw') return;
    e.preventDefault(); vpC.setPointerCapture(e.pointerId);
    syncView();
    const [px, py] = vpPos(e);
    // el triangulito ▾ junto al nombre: lista de posturas (se abre al soltar, si no se arrastró)
    const ph = r3PoseHit(px, py, VW, VH);
    if (ph) { vDrag = { t: 'posemenu', id: ph.id, hit: ph, sx: e.clientX, sy: e.clientY, dead: E.poseOpen === ph.id }; return; }
    closePoseMenu();
    const gz = gizmoHit(px, py);
    if (gz) {
      const p = ed.state().o[E.sel], y0 = E.giz.y0;
      const f = r3PlaneAt(px, py, VW, VH, y0);
      vDrag = { t: 'giz', axis: gz, id: E.sel, x0: p.x, z0: p.z, h0: p.h, rot0: p.rot || 0, y0, f0: f, py0: py, a0: f ? deg(Math.atan2(f.x - p.x, f.z - p.z)) : 0 };
      // metros por píxel en vertical, para la altura
      if (gz === 'y') { const a = r3Project(p.x, y0, p.z, VW, VH), b = r3Project(p.x, y0 + 1, p.z, VW, VH); vDrag.ppm = Math.max(4, Math.hypot(b.x - a.x, b.y - a.y)); }
      return;
    }
    // parte elegida: el aro, el punto o la misma parte se arrastran para doblarla
    if (E.part && E.pring && E.part.id === E.sel) {
      const PR = E.pring, near = (q, r) => q && Math.hypot(px - q[0], py - q[1]) < r;
      // aros de la mano: el de la muñeca gira la mano; el de la mano abre o cierra los dedos
      const prt = POSE_PARTS[E.part.key];
      let ring = null;
      if (PR.tw && (near(PR.tw.knob, 12 * PR.k) || (!near(PR.ef, 12 * PR.k) && ringPick(PR.tw.pts, [px, py]).d < 9 * PR.k))) ring = 'twist';
      else if (PR.fg && (near(PR.fg.knob, 12 * PR.k) || (!near(PR.ef, 13 * PR.k) && Math.abs(Math.hypot(px - PR.ef[0], py - PR.ef[1]) - PR.fg.r) < 10 * PR.k))) ring = 'curl';
      if (ring && prt) {
        const st = ed.state().o[E.part.id] || {}, j0 = { ...(st.j || {}) };
        vDrag = ring === 'twist' ? { t: 'twist', id: E.part.id, side: prt.side, j0, pts: PR.tw.pts, th: ringPick(PR.tw.pts, [px, py]).th, acc: 0, sx: e.clientX, sy: e.clientY }
          : { t: 'curl', id: E.part.id, side: prt.side, j0, c: PR.ef, a: Math.atan2(py - PR.ef[1], px - PR.ef[0]), acc: 0, sx: e.clientX, sy: e.clientY };
        return;
      }
      let on = near(PR.ef, 22 * PR.k) || near(PR.pv, PR.r + 10 * PR.k);
      if (!on) on = r3PickPart(px, py, VW, VH, E.sel) === E.part.key;
      if (on) {
        const A = poseFig(R3.objs.get(E.part.id)), part = POSE_PARTS[E.part.key];
        if (A && A.fig && part) {
          A.root.updateMatrixWorld(true);
          const cam = R3.cam.clone(), proj = w => { const q = w.clone().project(cam); return [(q.x + 1) / 2 * VW, (1 - q.y) / 2 * VH]; };
          const st = ed.state().o[E.part.id] || {}, j0 = { ...(st.j || {}) };
          const D0 = { t: 'pose', id: E.part.id, key: E.part.key, j0, j: j0, px, py, sx: e.clientX, sy: e.clientY, keys: part.dof };
          // la mano dobla solo la muñeca; con Mayús, el brazo entero sigue a la mano
          if (part.ik || (part.ikDof && e.shiftKey)) {
            D0.keys = part.ik ? part.dof : part.ikDof; D0.ik = true;
            // mano o pie: el objetivo vive en el plano que mira a la cámara y pasa por el punto agarrado
            const through = poseEff(A, part, new THREE.Vector3()), p0 = r3DragPoint(px, py, VW, VH, through, cam);
            Object.assign(D0, { cam, through, off: p0 ? through.clone().sub(p0) : new THREE.Vector3() });
          } else {
            const arc = part.dof.length === 1 && poseArc(A, st, part, j0, proj);
            if (arc) { const e0 = proj(poseEff(A, part, new THREE.Vector3())); Object.assign(D0, { arc, off: [e0[0] - px, e0[1] - py] }); }
            else D0.lin = poseLinStart(A, st, part, j0, proj);
          }
          vDrag = D0;
          return;
        }
      }
    }
    const hit = r3Pick(px, py, VW, VH, E.s3);
    if (hit) {
      const was = E.sel === hit && E.tab !== 'draw';
      ed.select(hit);
      const f = r3FloorAt(px, py, VW, VH), p = ed.state().o[hit];
      vDrag = { t: 'move', id: hit, ox: f ? f.x - p.x : 0, oz: f ? f.z - p.z : 0, ok: !!f, was, px, py, sx: e.clientX, sy: e.clientY };
    } else {
      if (E.free) { E.freeAnim = null; vDrag = { t: 'orbit', x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }; return; }
      // si la cámara seguía a una figura, deja de seguirla recién al mover (un toque para soltar lo elegido no la cambia)
      vDrag = { t: 'look', x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, unaim: !!E.s3.aim };
    }
  });
  /* dos dedos: pellizcar hace zoom. En la viñeta cambia el lente (abrir los dedos acerca: 50 → 85 mm) sin mover la
     cámara; en la vista libre acerca o aleja la mirada (la cámara del plano no cambia). Al apoyar el segundo dedo se
     deshace lo que empezó el primero (antes cada dedo contaba como un toque suelto y la escena saltaba) */
  const touches = new Map();
  let preTouch = null;
  const zoomHud = document.createElement('div'); zoomHud.className = 'vp-zoom'; zoomHud.hidden = true; $m('#vp').appendChild(zoomHud);
  const showZoom = txt => { zoomHud.textContent = txt; zoomHud.hidden = false; clearTimeout(E.hudT); E.hudT = setTimeout(() => { zoomHud.hidden = true; }, 900); };
  const span = () => { const [a, b] = [...touches.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; };
  vpC.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch' || !has3D || E.tab === 'draw') return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 1) { preTouch = ed.snap(); return; }
    e.stopImmediatePropagation(); e.preventDefault();
    if (touches.size !== 2) return;   // tres dedos o más: nada
    vDrag = null; ed.restore(preTouch);
    try { vpC.setPointerCapture(e.pointerId); } catch (er) { }
    E.pinch = E.free ? { d0: span(), dist0: E.free.dist } : { d0: span(), lens0: ed.state().cam.lens };
  }, true);
  vpC.addEventListener('pointermove', e => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (!E.pinch || touches.size < 2) return;
    e.stopImmediatePropagation();
    const f = span() / E.pinch.d0;
    if (E.free) { E.free.dist = clamp(E.pinch.dist0 / f, .6, 30); drawViewport(); if (E.pv) E.pv(); return; }
    const lens = Math.round(clamp(E.pinch.lens0 * f, 10, 400) * 10) / 10, k = editKey();
    if (Math.abs(k.cam.lens - lens) < .05) return;
    k.cam.lens = lens; edited(); showZoom(Math.round(lens) + ' mm');
  }, true);
  const untouch = e => {
    if (!touches.delete(e.pointerId)) return;
    if (E.pinch && touches.size < 2) { const was = E.pinch; E.pinch = null; if (was.lens0 != null) commit(); }
    if (!touches.size) preTouch = null;
  };
  vpC.addEventListener('pointerup', untouch, true); vpC.addEventListener('pointercancel', untouch, true);
  vpC.addEventListener('pointermove', e => {
    if (!vDrag) {
      if (e.pointerType !== 'mouse') return;
      const [px, py] = vpPos(e);
      if (E.pring) { const P2 = E.pring; vpC.style.cursor = Math.hypot(px - P2.ef[0], py - P2.ef[1]) < 22 * P2.k || Math.hypot(px - P2.pv[0], py - P2.pv[1]) < P2.r + 10 * P2.k ? 'grab' : ''; return; }
      if (E.giz) { const h = gizmoHit(px, py); vpC.style.cursor = h ? (h === 'rot' ? 'alias' : h === 'free' ? 'move' : h === 'y' ? 'ns-resize' : 'grab') : ''; }
      return;
    }
    const [px, py, r] = vpPos(e);
    if (vDrag.t === 'posemenu') { if (Math.hypot(e.clientX - vDrag.sx, e.clientY - vDrag.sy) > 8) vDrag.dead = true; return; }
    if (vDrag.t === 'orbit') {
      if (!vDrag.moved && Math.hypot(e.clientX - vDrag.sx, e.clientY - vDrag.sy) < 4) return;
      E.free.yaw -= (e.clientX - vDrag.x) * .4; E.free.pitch = clamp(E.free.pitch + (e.clientY - vDrag.y) * .3, -10, 85);
      vDrag.x = e.clientX; vDrag.y = e.clientY; vDrag.moved = 'view';
      drawViewport(); if (E.pv) E.pv();
      return;
    }
    if (vDrag.t === 'look' && !vDrag.moved && Math.hypot(e.clientX - vDrag.sx, e.clientY - vDrag.sy) < 4) return;
    if (vDrag.unaim) { vDrag.unaim = false; snapshot(); E.s3.aim = null; stCache = null; toast('La cámara ya no sigue a la figura: ahora la apuntas tú.'); }
    const k = editKey();
    if (vDrag.t === 'giz') {
      const D0 = vDrag, q = k.o[D0.id]; if (!q) return;
      syncView();
      const f = r3PlaneAt(px, py, VW, VH, D0.y0), sn = e.shiftKey;
      const sv = v => sn ? Math.round(v * 4) / 4 : round2(v);
      if ((D0.axis === 'free' || D0.axis === 'x' || D0.axis === 'z') && f && D0.f0) {
        if (D0.axis !== 'z') q.x = sv(D0.x0 + f.x - D0.f0.x); else q.x = D0.x0;
        if (D0.axis !== 'x') q.z = sv(D0.z0 + f.z - D0.f0.z); else q.z = D0.z0;
      } else if (D0.axis === 'y') {
        const ob = E.s3.objs.find(o => o.id === D0.id);
        const base = D0.h0 ?? (ob && ob.kind === 'luz' ? 2 : 0);
        q.h = round2(clamp(base - (py - D0.py0) / D0.ppm, 0, ob && ob.kind === 'luz' ? 8 : 3));   // figuras: hasta 3 m (tarima, escalera, techo de un auto)
      } else if (D0.axis === 'rot' && f) {
        const a = deg(Math.atan2(f.x - D0.x0, f.z - D0.z0));
        let r = D0.rot0 + (a - D0.a0);
        if (sn) r = Math.round(r / 15) * 15;
        q.rot = Math.round(((r % 360) + 540) % 360 - 180);
      }
      vDrag.moved = true;
      edited();
      return;
    }
    if (vDrag.t === 'twist' || vDrag.t === 'curl') {
      const D0 = vDrag;
      if (!D0.moved && Math.hypot(e.clientX - D0.sx, e.clientY - D0.sy) < 3) return;
      const o = k.o[D0.id]; if (!o) return;
      const wrap = d => ((d + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      if (D0.t === 'twist') { const th = ringPick(D0.pts, [px, py]).th; D0.acc += wrap(th - D0.th); D0.th = th; }
      else { const a = Math.atan2(py - D0.c[1], px - D0.c[0]); D0.acc += wrap(a - D0.a); D0.a = a; }
      const f = (D0.t === 'twist' ? 'w' : 'f') + D0.side, v0 = D0.j0[f] || 0;
      let v;
      if (D0.t === 'twist') { const sg = D0.side === 'R' ? 1 : -1; v = clamp(v0 + sg * deg(D0.acc), -180, 180); D0.acc = sg * rad(v - v0); }
      else { v = clamp(v0 + D0.acc / FING_SPAN * 100, 0, 100); D0.acc = (v - v0) / 100 * FING_SPAN; }
      o.j = { ...(o.j || {}) };
      if (Math.round(v)) o.j[f] = Math.round(v); else delete o.j[f];
      D0.moved = true;
      edited();
      return;
    }
    if (vDrag.t === 'pose') {
      const D0 = vDrag;
      if (!D0.moved && Math.hypot(e.clientX - D0.sx, e.clientY - D0.sy) < 4) return;
      syncView();   // la figura queda sincronizada con este plano antes de medir
      const A = poseFig(R3.objs.get(D0.id)), part = POSE_PARTS[D0.key];
      if (!A || !A.fig || !part) return;
      const kf = editKey(), o = kf.o[D0.id]; if (!o) return;
      if (D0.arc) { const f = part.dof[0]; D0.j = { ...D0.j0, [f]: Math.round(arcPick(D0.arc, [px + D0.off[0], py + D0.off[1]]) * 10) / 10 }; }
      else if (D0.lin) D0.j = poseLinApply(D0.lin, D0.j0, [px - D0.px, py - D0.py]);
      else { const tg = r3DragPoint(px, py, VW, VH, D0.through, D0.cam); if (!tg) return; D0.j = poseSolveIK(A, ed.state().o[D0.id], part, tg.add(D0.off), D0.j, D0.keys); }
      o.j = { ...(o.j || {}) };
      for (const f of D0.keys || part.dof) { if (D0.j[f]) o.j[f] = D0.j[f]; else delete o.j[f]; }
      D0.moved = true;
      edited();
      return;
    }
    if (vDrag.t === 'move') {
      if (!vDrag.moved && Math.hypot(e.clientX - vDrag.sx, e.clientY - vDrag.sy) < 4) return;   // un toque no mueve la figura
      syncView();
      const f = r3FloorAt(px, py, VW, VH);
      if (f && vDrag.ok) { const p = k.o[vDrag.id]; p.x = round2(f.x - vDrag.ox); p.z = round2(f.z - vDrag.oz); }
    } else {
      const st = ed.state();
      const fov = deg(vfovFor(camFF(st.cam), ar));
      const k2 = fov / r.height;
      k.cam.yaw = round2(k.cam.yaw + (e.clientX - vDrag.x) * k2);
      k.cam.pitch = round2(clamp(k.cam.pitch + (e.clientY - vDrag.y) * k2, -89, 89));
      vDrag.x = e.clientX; vDrag.y = e.clientY;
    }
    vDrag.moved = true;
    edited();
  });
  let tap0 = 0, tapP = null, figTap = null;
  const vEnd = e => {
    const D0 = vDrag; vDrag = null;
    if (!D0) return;
    if (D0.t === 'posemenu') { if (!D0.dead && e && e.type === 'pointerup') openPoseMenu(D0.id, D0.hit); return; }
    if (D0.moved === 'view') return;   // girar la vista libre no cambia el plano
    if (D0.moved) { commit(); return; }
    if (D0.t === 'look' || D0.t === 'orbit') {
      // doble toque en un espacio vacío: la viñeta sola, a pantalla completa (o de vuelta). Con el ratón, el doble clic.
      const now = e && e.timeStamp || performance.now();
      if (e && e.pointerType !== 'mouse' && now - tap0 < 450 && tapP && Math.hypot(e.clientX - tapP[0], e.clientY - tapP[1]) < 36) { tap0 = 0; clearTimeout(E.vdesT); vpFull(); return; }
      tap0 = now; tapP = e ? [e.clientX, e.clientY] : null;
      // un toque suelta lo elegido, después de esperar un posible segundo toque (así nada se redibuja entre los dos)
      clearTimeout(E.vdesT);
      E.vdesT = setTimeout(() => { if (EDT === E && (E.sel || E.part)) { E.sel = null; E.part = null; panel(); redraw(); } }, 460);
      return;
    }
    // doble clic (o doble toque) sobre la figura: suelta la parte del cuerpo y queda elegida la figura entera
    if (D0.t === 'pose' || D0.t === 'move') {
      const now = e && e.timeStamp || performance.now(), dbl = figTap && figTap.id === D0.id && now - figTap.t < 450;
      figTap = dbl ? null : { id: D0.id, t: now };
      if (dbl) { clearTimeout(E.vdesT); E.part = null; if (E.sel !== D0.id) ed.select(D0.id); else redraw(); return; }
    }
    // un toque sobre la parte elegida la suelta
    if (D0.t === 'pose') { E.part = null; redraw(); return; }
    // un toque sobre la figura ya elegida elige la parte del cuerpo que está debajo (se tiñe y aparece su aro)
    if (D0.t === 'move' && D0.was) {
      const k = r3PickPart(D0.px, D0.py, VW, VH, D0.id);
      if (k) { E.part = { id: D0.id, key: k }; redraw(); }
    }
  };
  vpC.addEventListener('pointerup', vEnd); vpC.addEventListener('pointercancel', vEnd);
  vpC.addEventListener('dblclick', e => {
    if (!has3D || E.tab === 'draw') return;
    const [px, py] = vpPos(e);
    syncView();
    if (r3Pick(px, py, VW, VH, E.s3)) return;   // sobre una figura u objeto no
    clearTimeout(E.vdesT); vpFull();
  });
  /* la rueda mueve la cámara solo si la viñeta está «tomada» (se tocó o se hizo clic en ella), si está aislada o con
     una tecla (Mayús o Alt: lente; Ctrl: acercar): así, desplazar el panel pasando por encima ya no cambia el encuadre */
  const vpBox = $m('#vp');
  const vpTake = e => { E.vpOn = vpBox.contains(e.target); };
  addEventListener('pointerdown', vpTake, true);
  E.offTake = () => removeEventListener('pointerdown', vpTake, true);
  vpC.addEventListener('wheel', e => {
    if (!has3D) return;
    if (!E.vpOn && !E.full && !vView.classList.contains('full') && !(e.ctrlKey || e.altKey || e.shiftKey || e.metaKey)) {
      if (!E.wheelTold) { E.wheelTold = true; toast('Para mover la cámara con la rueda, haz clic primero en la viñeta (o mantén Ctrl).', 3200); }
      return;
    }
    e.preventDefault();
    if (E.free) { E.free.dist = clamp(E.free.dist * Math.exp(e.deltaY * .0012), .6, 30); drawViewport(); return; }
    const k = editKey();
    if (e.shiftKey || e.altKey) k.cam.lens = Math.round(clamp(k.cam.lens * Math.exp(-e.deltaY * .0012), 10, 400) * 10) / 10;
    else { const st = ed.state(), d = -e.deltaY * .004; k.cam.x = round2(k.cam.x - Math.sin(rad(st.cam.yaw)) * d); k.cam.z = round2(k.cam.z - Math.cos(rad(st.cam.yaw)) * d); }
    edited(); clearTimeout(E.wt); E.wt = setTimeout(commit, 300);
  }, { passive: false });

  /* ---------- flechas de cámara: mover sin ver la planta (mantener presionado = seguir) ---------- */
  const camPad = $m('#vpCam'), camHub = $m('#vpCam .c-hub');
  // solo se ve la cámara: las flechas aparecen al pasar el mouse por ella; un clic (o un toque) las deja fijas
  const paintPad = () => { camPad.hidden = !(has3D && !E.free && !E.part); };
  E.paintPad = paintPad;
  paintPad();
  const padOpen = on => { camPad.classList.toggle('open', on); camHub.setAttribute('aria-expanded', on); };
  camHub.addEventListener('click', () => padOpen(!camPad.classList.contains('open')));
  let camRun = null;
  // mover la cámara un tramo: dt en segundos (al mantener, cada cuadro; con el teclado, un paso de un cuarto de segundo)
  const camMove = (cm, dt, fast) => {
    const k = editKey(), st = ed.state(), yaw = rad(st.cam.yaw);
    const mv = 1.4 * fast * dt, hv = .7 * fast * dt, pv = 38 * fast * dt;
    if (cm === 'fwd' || cm === 'back') { const d = cm === 'fwd' ? mv : -mv; k.cam.x = round2(k.cam.x - Math.sin(yaw) * d); k.cam.z = round2(k.cam.z - Math.cos(yaw) * d); }
    if (cm === 'left' || cm === 'right') { const d = cm === 'right' ? mv : -mv; k.cam.x = round2(k.cam.x + Math.cos(yaw) * d); k.cam.z = round2(k.cam.z - Math.sin(yaw) * d); }
    if (cm === 'up' || cm === 'down') k.cam.h = round2(clamp(k.cam.h + (cm === 'up' ? hv : -hv), .1, 30));
    if (cm === 'pl' || cm === 'pr') k.cam.yaw = round2(k.cam.yaw + (cm === 'pl' ? pv : -pv));
    edited();
  };
  camPad.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-cm]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const cm = b.dataset.cm;
    if (cm === 'pad') return;   // la cámara del centro solo abre y cierra las flechas (en el clic)
    if ((cm === 'pl' || cm === 'pr') && E.s3.aim) { snapshot(); E.s3.aim = null; toast('La cámara ya no sigue a la figura: ahora la apuntas tú.'); }
    try { b.setPointerCapture(e.pointerId); } catch (er) { }
    b.classList.add('on');
    const fast = e.shiftKey ? 3 : 1;
    let last = performance.now();
    const step = now => {
      if (!camRun) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      camMove(cm, dt, fast);
      camRun = requestAnimationFrame(step);
    };
    camRun = requestAnimationFrame(step);
    const stop = () => { cancelAnimationFrame(camRun); camRun = null; b.classList.remove('on'); commit(); b.removeEventListener('pointerup', stop); b.removeEventListener('pointercancel', stop); b.removeEventListener('lostpointercapture', stop); };
    b.addEventListener('pointerup', stop); b.addEventListener('pointercancel', stop); b.addEventListener('lostpointercapture', stop);
  });
  // con el teclado (Intro o Espacio sobre una flecha): un paso por pulsación; con Mayús, el triple
  camPad.addEventListener('click', e => {
    e.stopPropagation();
    if (e.detail !== 0) return;   // el mouse y el dedo ya la movieron en pointerdown
    const b = e.target.closest('[data-cm]'); if (!b || b.dataset.cm === 'pad') return;
    const cm = b.dataset.cm;
    if ((cm === 'pl' || cm === 'pr') && E.s3.aim) { snapshot(); E.s3.aim = null; toast('La cámara ya no sigue a la figura: ahora la apuntas tú.'); }
    camMove(cm, .25, e.shiftKey ? 3 : 1); commit();
  });

  /* ---------- planta a pantalla completa (doble toque o ⤢) ---------- */
  const plBox = $m('.sx-plan'), plC = $m('#plC'), plPv = $m('#plPv');
  function planFull(on = !plBox.classList.contains('full')) {
    clearTimeout(E.deselT);
    plBox.classList.toggle('full', on);
    E.full = on;
    $m('#plFull').textContent = on ? '✕' : '⤢';
    $m('#plFull').setAttribute('aria-label', on ? 'Cerrar la planta a pantalla completa' : 'Planta a pantalla completa');
    $m('#plFull').title = on ? 'Volver al editor (Esc)' : 'Ver la planta sola, a pantalla completa (doble toque en la planta)';
    requestAnimationFrame(() => { plan.fit(); redraw(); });
  }
  E.planFull = planFull;
  const vView = $m('.sx-view');
  const insp = $m('.sx-insp'), inspHome = insp && insp.parentNode;
  function vpFull(on = !vView.classList.contains('full')) {
    vView.classList.toggle('full', on);
    if (insp) {
      if (on && matchMedia('(max-width:760px)').matches) vView.appendChild(insp);
      else if (insp.parentNode !== inspHome) inspHome.appendChild(insp);
    }
    const b = $m('#vpFull');
    b.innerHTML = on ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
    b.setAttribute('aria-label', on ? 'Volver al editor' : 'Viñeta a pantalla completa');
    b.title = on ? 'Volver al editor (Esc · doble toque en un espacio vacío)' : 'Ver la viñeta sola (doble toque en un espacio vacío)';
    requestAnimationFrame(() => { sizeViewport(); redraw(); });
  }
  E.vpFull = vpFull;
  $m('#vpFull').onclick = () => vpFull();
  $m('#vpFree').onclick = () => freeOn(!E.free);
  {
    const cv = $m('#vpCube');
    let cd = null;
    cv.addEventListener('pointerdown', e => { if (!E.free) return; e.preventDefault(); e.stopPropagation(); cv.setPointerCapture(e.pointerId); cd = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false }; });
    cv.addEventListener('pointermove', e => {
      if (!E.free) return;
      if (cd) {
        if (!cd.moved && Math.hypot(e.clientX - cd.sx, e.clientY - cd.sy) < 4) return;
        cd.moved = true; E.freeAnim = null;
        E.free.yaw -= (e.clientX - cd.x) * .6; E.free.pitch = clamp(E.free.pitch + (e.clientY - cd.y) * .45, -10, 85);
        cd.x = e.clientX; cd.y = e.clientY; drawViewport(); return;
      }
      const k = cubeAt(cv, e); if (k !== E.cubeHover) { E.cubeHover = k; cv.style.cursor = k ? 'pointer' : 'grab'; drawCube(); }
    });
    const up = e => { const c = cd; cd = null; if (!c || c.moved || !E.free) return; const k = cubeAt(cv, e); if (k) freeAngle(k); };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', () => { cd = null; });
    cv.addEventListener('pointerleave', () => { if (!cd && E.cubeHover) { E.cubeHover = null; drawCube(); } });
  }
  $m('#plFull').onclick = () => planFull();
  $m('#plPvB').onclick = () => planFull(false);
  // agregar sin salir de la planta completa: lo nuevo aparece delante de la cámara, elegido, para arrastrarlo aquí mismo
  $m('.pl-add').addEventListener('click', e => {
    const b = e.target.closest('[data-pa]'); if (!b) return;
    if (E.tab === 'draw') { E.tab = 'sel'; panel(); }
    if (b.dataset.pa === 'gen') { plantaGeneral(sh.sc, { from: E }); return; }
    if (b.dataset.pa === 'exp') { const a = JSON.parse(jsonA()); plantaExportMenu(b, { id, s3: a, sc: sh.sc, live: { id, s3: a } }); return; }
    if (b.dataset.pa === 'fig') addFig({ currentTarget: b });
    else if (b.dataset.pa === 'obj') addObj({ currentTarget: b });
    else if (!E.menuOpen) lightMenu(b);
  });
  let tapAt = 0, tapXY = null, downXY = null;
  plC.addEventListener('pointerdown', e => { downXY = [e.clientX, e.clientY]; }, true);
  plC.addEventListener('pointerup', e => {
    if (!downXY || Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) > 8) { tapAt = 0; return; }
    const now = e.timeStamp;   // la hora del toque (no la de procesarlo: dibujar la escena puede demorar)
    // doble toque: abre la planta completa; dentro de ella no la cierra (se sale con la viñeta, la ✕ o Esc)
    if (E.measure) { tapAt = 0; return; }   // midiendo, dos toques seguidos son dos medidas (no la planta completa)
    if (now - tapAt < 340 && tapXY && Math.hypot(e.clientX - tapXY[0], e.clientY - tapXY[1]) < 36) { tapAt = 0; if (!plBox.classList.contains('full')) planFull(true); return; }
    tapAt = now; tapXY = [e.clientX, e.clientY];
  });
  // vista previa del plano en una esquina de la planta completa
  E.pv = () => {
    if (!plBox.classList.contains('full')) return;
    const r = plPv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(r.width * dpr), h = Math.round(w / ar);
    if (plPv.width !== w || plPv.height !== h) { plPv.width = w; plPv.height = h; }
    const g = plPv.getContext('2d');
    // el plano se dibuja directo en la vista previa (copiar la viñeta tapada salía en blanco en algunos teléfonos)
    if (!has3D || !r3Draw(g, E.s3, E.t, w, h, { labels: E.form.names, part: E.part })) g.drawImage(vpC, 0, 0, w, h);
  };
  $m('#vpPart').addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b || !E.part) return;
    if (b.dataset.p === 'reset') {
      const part = POSE_PARTS[E.part.key], id = E.part.id;
      snapshot(); E.custom = true;
      const clear = o => { if (!o || !o.j) return; o.j = { ...o.j }; for (const f of [...part.dof, ...(part.extra || [])]) delete o.j[f]; if (!Object.keys(o.j).length) delete o.j; };
      E.s3.keys.forEach(k => clear(k.o[id])); if (E.tmp) clear(E.tmp.o[id]);
      commit(); redraw();
    } else if (b.dataset.p === 'j') {
      // girar la mano o doblar la muñeca de a poco (lo mismo que el aro, para quien no lo encuentra)
      const f = b.dataset.f, lim = f[0] === 'w' ? 180 : 80, sg = f[0] === 'w' && f[1] === 'L' ? -1 : 1;
      const k = editKey(), o = k.o[E.part.id]; if (!o) return;
      o.j = { ...(o.j || {}) }; o.j[f] = clamp((o.j[f] || 0) + sg * +b.dataset.v, -lim, lim);
      stCache = null; edited(); commit(); redraw();
    } else { E.part = null; redraw(); }
  });
  // la lista de posturas se cierra sola con el primer toque fuera; se anota antes si estaba abierta (para que el ▾ la cierre)
  const poseWas = () => { const p = document.querySelector('#pop.pop-pose'); E.poseOpen = p ? p.dataset.id : null; E.exprOpen = !!document.querySelector('#pop.pop-expr'); E.menuOpen = !!document.querySelector('#pop.pop-sx'); };
  addEventListener('pointerdown', poseWas, true);
  const escPose = e => { if (e.key === 'Escape' && EDT === E && !m.hidden && document.querySelector('#pop.pop-pose, #pop.pop-face, #pop.pop-expr')) { e.preventDefault(); e.stopImmediatePropagation(); tryClosePop(); } };
  addEventListener('keydown', escPose, true);
  const escPart = e => { if (e.key === 'Escape' && E.part && EDT === E && !m.hidden && !(plBox && plBox.classList.contains('full'))) { e.preventDefault(); e.stopImmediatePropagation(); E.part = null; redraw(); } };
  addEventListener('keydown', escPart, true);
  const escMeas = e => { if (e.key === 'Escape' && E.measure && EDT === E && !m.hidden && !document.querySelector('#pop')) { e.preventDefault(); e.stopImmediatePropagation(); measMode(false); } };
  addEventListener('keydown', escMeas, true);
  const escFull = e => {
    if (e.key !== 'Escape' || EDT !== E || m.hidden) return;
    if (document.querySelector('#pop')) return;   // con un menú abierto (Exportar, Luz…), Esc cierra solo el menú
    if (plBox.classList.contains('full')) { e.preventDefault(); e.stopImmediatePropagation(); planFull(false); }
    else if (vView.classList.contains('full') && !E.part) { e.preventDefault(); e.stopImmediatePropagation(); vpFull(false); }
  };
  addEventListener('keydown', escFull, true);

  /* ---------- dibujo sobre la viñeta ---------- */
  let aDraw = null, aSnap = null;
  const anPos = e => { const r = anC.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * anC.width, (e.clientY - r.top) / r.height * anC.height]; };
  anC.addEventListener('pointerdown', e => {
    if (E.tab !== 'draw') return;
    e.preventDefault(); anC.setPointerCapture(e.pointerId);
    const D2 = E.draw;
    D2.undo.push(actx.getImageData(0, 0, anC.width, anC.height)); if (D2.undo.length > 25) D2.undo.shift();
    const [x, y] = anPos(e);
    aDraw = { x0: x, y0: y, lx: x, ly: y }; aSnap = actx.getImageData(0, 0, anC.width, anC.height);
    actx.globalCompositeOperation = D2.tool === 'erase' ? 'destination-out' : 'source-over';
    actx.strokeStyle = actx.fillStyle = D2.color; actx.lineWidth = (D2.tool === 'erase' ? D2.w * 4 : D2.w) * anC.width / 960; actx.lineCap = actx.lineJoin = 'round';
    if (D2.tool === 'pen' || D2.tool === 'erase') { actx.beginPath(); actx.arc(x, y, actx.lineWidth / 2, 0, Math.PI * 2); actx.fill(); }
    E.annoDirty = true;
  });
  anC.addEventListener('pointermove', e => {
    if (!aDraw) return;
    const [x, y] = anPos(e), D2 = E.draw;
    if (D2.tool === 'pen' || D2.tool === 'erase') { actx.beginPath(); actx.moveTo(aDraw.lx, aDraw.ly); actx.lineTo(x, y); actx.stroke(); aDraw.lx = x; aDraw.ly = y; }
    else {
      actx.putImageData(aSnap, 0, 0);
      if (D2.tool === 'line') { actx.beginPath(); actx.moveTo(aDraw.x0, aDraw.y0); actx.lineTo(x, y); actx.stroke(); }
      if (D2.tool === 'arrow') arrow(actx, aDraw.x0, aDraw.y0, x, y, actx.lineWidth, D2.color);
      if (D2.tool === 'rect') actx.strokeRect(aDraw.x0, aDraw.y0, x - aDraw.x0, y - aDraw.y0);
    }
  });
  const aEnd = () => { const was = !!aDraw; aDraw = null; aSnap = null; actx.globalCompositeOperation = 'source-over'; if (was) paintTop(); };
  anC.addEventListener('pointerup', aEnd); anC.addEventListener('pointercancel', aEnd);

  /* ---------- línea de tiempo ---------- */
  let TW = 0;
  /* con una acción copiada de otro plano, la línea de tiempo muestra también lo que queda fuera del plano
     (a los lados, sombreado) y una barra «Acción» que se arrastra para elegir qué parte entra */
  const tlAct = () => !!E.s3.from;
  const TLH = () => tlAct() ? 64 : 46;
  function sizeTimeline() { const r = tlC.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1); TW = r.width; tlC.style.height = TLH() + 'px'; tlC.width = Math.round(r.width * dpr); tlC.height = Math.round(TLH() * dpr); }
  function tlView() {
    if (E.tlView) return E.tlView;
    let v0 = 0, v1 = E.dur;
    if (tlAct()) {
      const ok = objKeys(E.s3);
      v0 = Math.min(0, ok[0].t); v1 = Math.max(E.dur, ok[ok.length - 1].t);
    }
    // claves que quedaron después del final (al acortar el plano): también se ven
    const lastK = E.s3.keys.length ? E.s3.keys[E.s3.keys.length - 1].t : 0;
    if (lastK > v1) v1 = lastK;
    const pad = (v1 - v0) * .03; if (v0 < 0) v0 -= pad; if (v1 > E.dur) v1 += pad;
    return [v0, v1];
  }
  const tx = t => { const [a, b] = tlView(); return 12 + (t - a) / Math.max(.1, b - a) * (TW - 24); };
  const xt = x => { const [a, b] = tlView(); return clamp(a + (x - 12) / (TW - 24) * (b - a), 0, E.dur); };
  function drawTimeline() {
    tlAria();
    if (!TW || Math.round(tlC.height / (tlC.width / Math.max(1, TW))) !== TLH()) sizeTimeline();
    const dpr = tlC.width / TW, H = TLH(), act = tlAct();
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(m);
    const ink = css.getPropertyValue('--ink').trim() || '#17202B', muted = css.getPropertyValue('--muted').trim() || '#5A6573', line = css.getPropertyValue('--line').trim() || '#D2D8DF', acc = css.getPropertyValue('--accent').trim() || '#2C47CF', panelC = css.getPropertyValue('--panel').trim() || '#F4F6F7';
    tctx.clearRect(0, 0, TW, H);
    tctx.fillStyle = panelC; tctx.fillRect(0, 0, TW, H);
    const [v0, v1] = tlView();
    if (act || v1 > E.dur + 1e-3) {
      // fuera del plano: sombreado con rayas; los bordes del plano en el color de acento
      tctx.save();
      for (const [a, b] of [[v0, 0], [E.dur, v1]]) {
        if (b - a < 1e-3) continue;
        const xa = Math.max(0, tx(a)), xb = Math.min(TW, tx(b));
        tctx.fillStyle = 'rgba(110,116,128,.13)'; tctx.fillRect(xa, 0, xb - xa, H);
        tctx.beginPath(); tctx.rect(xa, 0, xb - xa, H); tctx.clip();
        tctx.strokeStyle = 'rgba(110,116,128,.18)'; tctx.lineWidth = 1;
        for (let x = xa - H; x < xb; x += 7) { tctx.beginPath(); tctx.moveTo(x, H); tctx.lineTo(x + H, 0); tctx.stroke(); }
        tctx.restore(); tctx.save();
      }
      tctx.restore();
      tctx.strokeStyle = acc; tctx.lineWidth = 1.5;
      for (const t of [0, E.dur]) { const x = tx(t); tctx.beginPath(); tctx.moveTo(x, 0); tctx.lineTo(x, H); tctx.stroke(); }
      tctx.lineWidth = 1;
    }
    tctx.strokeStyle = line; tctx.fillStyle = muted; tctx.font = '600 10px Archivo, Arial, sans-serif'; tctx.textAlign = 'center';
    const span = v1 - v0, step = span > 20 ? 5 : span > 8 ? 2 : 1;
    for (let s = Math.ceil(v0 * 2) / 2; s <= v1 + .001; s += .5) {
      const x = tx(s), major = Math.abs(s / step - Math.round(s / step)) < 1e-6;
      tctx.beginPath(); tctx.moveTo(x, 0); tctx.lineTo(x, major ? 10 : 5); tctx.stroke();
      if (major) tctx.fillText((s < 0 ? '−' : '') + Math.abs(Math.round(s * 10) / 10) + 's', x, 21);
    }
    const ks = E.s3.keys, ck = act ? camKeys(E.s3) : ks;
    const dia = (x, y, on) => { tctx.fillStyle = on ? acc : ink; tctx.beginPath(); tctx.moveTo(x, y - 7); tctx.lineTo(x + 6, y); tctx.lineTo(x, y + 7); tctx.lineTo(x - 6, y); tctx.closePath(); tctx.fill(); };
    // tramo animado (cámara, o todo si no hay acción copiada)
    if (ck.length > 1) { tctx.fillStyle = typeof themeDark === 'function' && themeDark(ls.get('theme', 'auto')) ? 'rgba(255,255,255,.09)' : 'rgba(44,71,207,.14)'; tctx.fillRect(tx(ck[0].t), 28, tx(Math.min(E.dur, ck[ck.length - 1].t)) - tx(ck[0].t), 10); }
    ck.forEach(k => { const out = k.t > E.dur + 1e-6; if (out) tctx.globalAlpha = .4; dia(tx(k.t), 33, Math.abs(k.t - E.t) < .02); tctx.globalAlpha = 1; });
    if (act) {
      // barra de la acción copiada: de su primera a su última clave
      const ok = objKeys(E.s3), a = tx(ok[0].t), b = Math.max(a + 24, tx(ok[ok.length - 1].t));
      tctx.fillStyle = 'rgba(223,60,19,.16)'; tctx.strokeStyle = 'rgba(223,60,19,.6)';
      tctx.beginPath(); tctx.roundRect ? tctx.roundRect(a, 44, b - a, 16, 5) : tctx.rect(a, 44, b - a, 16); tctx.fill(); tctx.stroke();
      ok.forEach(k => { const x = tx(k.t); tctx.fillStyle = '#C4320C'; tctx.beginPath(); tctx.moveTo(x, 47); tctx.lineTo(x + 4, 52); tctx.lineTo(x, 57); tctx.lineTo(x - 4, 52); tctx.closePath(); tctx.fill(); });
      const src = P.shots[E.s3.from.id], lab = `Acción${src ? ' de ' + (D.code[src.id] || '') : ''} · desde su ${(E.s3.from.off || 0).toFixed(1)} s`;
      tctx.save(); tctx.beginPath(); tctx.rect(Math.max(a, 0), 44, Math.min(b, TW) - Math.max(a, 0), 16); tctx.clip();
      tctx.fillStyle = '#9A2A0C'; tctx.textAlign = 'left'; tctx.font = '650 10px Archivo, Arial, sans-serif'; tctx.fillText(lab, Math.max(a, 0) + 8, 55.5); tctx.restore();
    }
    const px = tx(E.t);
    tctx.strokeStyle = '#C8382C'; tctx.lineWidth = 2; tctx.beginPath(); tctx.moveTo(px, 0); tctx.lineTo(px, H); tctx.stroke(); tctx.lineWidth = 1;
    $m('#tlTime').textContent = `${E.t.toFixed(1)} s`;
    const onK = ks.findIndex(k => Math.abs(k.t - E.t) < .02), kb = $m('#tlKey'), first = onK >= 0 && ks[onK] === camKeys(E.s3)[0];
    kb.setAttribute('aria-pressed', onK >= 0); kb.disabled = first;
    kb.title = onK < 0 ? 'Poner una clave aquí' : first ? 'Clave inicial (no se quita)' : 'Quitar esta clave';
    const ev = (ks[onK >= 0 ? onK : s3At(E.s3, E.t).key] || ks[0]).ease || 'suave', eb = $m('#tlEase');
    if (eb.dataset.v !== ev || !eb.innerHTML) { eb.dataset.v = ev; eb.innerHTML = ev === 'lineal' ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19 20 5"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19c7 0 9-14 16-14"/></svg>'; eb.title = `Curva hacia la clave siguiente: ${ev} (toca para ${ev === 'lineal' ? 'suave' : 'lineal'})`; }
  }
  let tDrag = null;
  tlC.addEventListener('pointerdown', e => {
    e.preventDefault(); tlC.setPointerCapture(e.pointerId);
    const r = tlC.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    // la barra de la acción: arrastrarla corre toda la animación copiada (la cámara se queda)
    if (tlAct() && y > 42) { snapshot(); E.tlView = tlView(); tDrag = { act: true, x0: x, done: 0 }; return; }
    const first = camKeys(E.s3)[0], pool = tlAct() ? camKeys(E.s3) : E.s3.keys;
    const k = pool.find(k => k !== first && Math.abs(tx(k.t) - x) < 7);
    tDrag = k ? { k } : { scrub: true };
    if (k) snapshot();
    setTime(k ? k.t : xt(x));
  });
  tlC.addEventListener('pointermove', e => {
    if (!tDrag) return;
    const x = e.clientX - tlC.getBoundingClientRect().left;
    if (tDrag.act) {
      const [a, b] = tlView(), dt = Math.round((x - tDrag.x0) / Math.max(1, TW - 24) * (b - a) * 10) / 10, step = round2(dt - tDrag.done);
      if (Math.abs(step) < .05) return;
      s3ShiftAction(E.s3, step); E.s3.from.off = round2((E.s3.from.off || 0) - step); tDrag.done = dt; E.custom = true; stCache = null; redraw();
      return;
    }
    let t = Math.round(xt(x) * 10) / 10;
    if (tDrag.k) { tDrag.k.t = Math.max(.1, t); E.s3.keys.sort((a, b) => a.t - b.t); E.custom = true; }
    setTime(t);
  });
  const tEnd = () => { if (tDrag && tDrag.act) { E.tlView = null; commit(); redraw(); } else if (tDrag && tDrag.k) commit(); tDrag = null; };
  tlC.addEventListener('pointerup', tEnd); tlC.addEventListener('pointercancel', tEnd);
  function setTime(t) { E.t = clamp(t, 0, E.dur); stCache = null; redraw(); if (E.tab === 'sel' || E.tab === 'cam') panel(); tlAria(); }
  // la línea de tiempo con el teclado: ← → de a 0,1 s (con Mayús, 1 s), Inicio y Fin
  function tlAria() { const t = (+E.t || 0).toFixed(1), d = (+E.dur || 0).toFixed(1); tlC.setAttribute('aria-valuemax', d); tlC.setAttribute('aria-valuenow', t); tlC.setAttribute('aria-valuetext', `${t.replace('.', ',')} s de ${d.replace('.', ',')} s`); }
  tlC.addEventListener('keydown', e => {
    const d = e.shiftKey ? 1 : .1;
    const t = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? E.t + d : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? E.t - d : e.key === 'Home' ? 0 : e.key === 'End' ? E.dur : null;
    if (t == null) return;
    e.preventDefault(); e.stopPropagation();
    setTime(Math.round(t * 10) / 10);
  });
  tlAria();
  $m('#tlPlay').onclick = () => {
    E.playing = !E.playing;
    { const pb = $m('#tlPlay'); pb.textContent = E.playing ? '❚❚' : '▶'; pb.setAttribute('aria-label', E.playing ? 'Pausar' : 'Reproducir'); }
    if (!E.playing) return;
    if (E.t >= E.dur - .01) E.t = 0;
    let last = performance.now();
    const step = now => {
      if (!E.playing || EDT !== E) return;
      E.t += (now - last) / 1000; last = now;
      if (E.t >= E.dur) { E.t = E.dur; E.playing = false; $m('#tlPlay').textContent = '▶'; $m('#tlPlay').setAttribute('aria-label', 'Reproducir'); }
      stCache = null; redraw();
      if (E.playing) requestAnimationFrame(step); else panel();
    };
    requestAnimationFrame(step);
  };
  /* cambiar la duración: cada clave se queda en su segundo (acortar corta el final; alargar deja quieto lo último).
     Las claves que quedan después del final se conservan (se ven atenuadas) por si se vuelve a alargar.
     «Estirar la animación», en el aviso, reparte las claves en el nuevo largo, como antes. */
  $m('#tlDur').addEventListener('change', e => {
    const od = E.dur, nd = clamp(num(e.target.value) || E.dur, .5, 600);
    if (Math.abs(nd - od) < 1e-6) return;
    snapshot();
    E.dur = nd; E.durSet = true; E.t = Math.min(E.t, nd); stCache = null; commit(); redraw();
    const after = E.s3.keys.filter(k => k.t > nd + 1e-6 && !(E.s3.from && k.oo));
    const msg = after.length ? `Duración ${nd} s. ${after.length === 1 ? `La clave de ${after[0].t.toFixed(1)} s queda` : `${after.length} claves quedan`} después del final: se ${after.length === 1 ? 'conserva' : 'conservan'} por si vuelves a alargar el plano.` : `Duración ${nd} s. Las claves se quedan en su segundo.`;
    const moving = E.s3.keys.length > 1 && E.s3.keys.some(k => k.t > 1e-6 && !(E.s3.from && k.oo));
    toast(msg, 6000, moving ? { label: 'Estirar la animación', fn: () => {
      if (EDT !== E) return;
      const r = nd / od;
      snapshot();
      E.s3.keys.forEach(k => { if (!(E.s3.from && k.oo)) k.t = round2(k.t * r); });   // la acción copiada no se estira: solo cambia cuánto entra
      E.s3.keys.sort((a, b) => a.t - b.t); E.custom = true; stCache = null; commit(); redraw();
      toast(`Animación repartida en ${nd} s.`);
    } } : undefined);
  });
  $m('#tlAuto').onclick = e => { E.autokey = !E.autokey; e.currentTarget.setAttribute('aria-pressed', E.autokey); e.currentTarget.classList.toggle('rec', E.autokey); };
  $m('#tlKey').onclick = () => {
    const i = E.s3.keys.findIndex(k => Math.abs(k.t - E.t) < .02);
    if (i >= 0) { if (E.s3.keys[i] === camKeys(E.s3)[0]) return; snapshot(); E.s3.keys.splice(i, 1); commit(); redraw(); toast('Clave quitada'); return; }
    snapshot(); E.custom = true; s3KeyAt(E.s3, E.t, true); commit(); redraw(); toast('Clave en ' + E.t.toFixed(1) + ' s');
  };
  /* el máster de la escena (lote U): qué dice el panel Plano y cómo volver a seguirlo */
  function masterHint() {
    if (isMaster(sh)) return '<p class="hint" style="margin:0">Máster de la escena: los demás planos toman de aquí dónde está cada personaje, el escenario y la hora; cada uno pone su cámara.</p>';
    const mo = masterOf({ ...sh, s3: null }); if (!mo) return '';
    const code = esc(D.code[mo.id] || '');
    return E.custom ? `<p class="hint" style="margin:0">Ajustado a mano: no sigue al máster (${code}). <button type="button" class="linkbtn" data-o="refollow">Volver a seguir al máster</button></p>`
      : `<p class="hint" style="margin:0">Sigue al máster (${code}): los personajes, el escenario y la hora vienen de ahí; aquí cambia la cámara. Si mueves algo, este plano queda con lo suyo.</p>`;
  }
  const refollow = () => {
    const mo = masterOf({ ...sh, s3: null }); if (!mo) return;
    snapshot(); E.s3 = s3Follow({ ...sh, ...E.form, lens: '', s3: null }, s3Of(mo)); E.custom = false; E.refollow = true;
    E.sel = null; E.part = null; E.tmp = null; E.t = 0; stCache = null;
    sizeTimeline(); E.gesture = false; panel(); paintTop(); redraw();
    toast(`El plano vuelve a seguir al máster (${D.code[mo.id] || ''}).`);
  };
  /* usar este plano como máster (o dejar de usarlo). Lo que se ve en él queda como la puesta en escena de la escena */
  const toggleMaster = () => {
    const on = !isMaster(sh), code = D.code[id] || '';
    histNote(on ? `Usar el plano ${code} como máster` : `Dejar de usar el plano ${code} como máster`, null, 'board');
    if (on && !sh.s3) { sh.s3 = JSON.parse(E.s3_0); s3SyncShot(sh); }
    if (on) E.custom = true;
    setMaster(sh, on);
    changed('data'); derive(); render(); panel();
    toast(on ? `El plano ${code} es el máster de la escena ${sh.sc}: los planos que no ajustaste a mano toman de aquí la ubicación de los personajes y el escenario.` : `El plano ${code} ya no es el máster de la escena.`, 5200);
  };
  /* copiar el plano anterior: su puesta en escena y la animación de sus figuras y objetos; la cámara no */
  const copyPrev = () => {
    const prev = i > 0 && list[i - 1]; if (!prev) return;
    snapshot(); E.custom = true;
    E.s3 = s3CopyAction(E.s3, s3Of(prev), prev.id, 0);
    E.sel = null; E.part = null; E.tmp = null; stCache = null;
    sizeTimeline(); commit(); redraw();
    toast(`Escena de ${D.code[prev.id] || 'el plano anterior'} copiada con su animación; la cámara de este plano no cambió. Arrastra la barra «Acción» para elegir qué parte entra.`);
  };
  $m('#tlEase').onclick = e => { const st = s3At(E.s3, E.t); const i = E.s3.keys.findIndex(k => Math.abs(k.t - E.t) < .02); const k = E.s3.keys[i >= 0 ? i : st.key]; if (k) { snapshot(); k.ease = e.currentTarget.dataset.v === 'lineal' ? 'suave' : 'lineal'; commit(); redraw(); toast('Curva ' + k.ease); } };

  /* ---------- panel lateral ---------- */
  $m('.sx-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { E.tab = b.dataset.tab; panel(); } });
  function rangeRow(label, key, val, min, max, step, unit, dis) {
    return `<label class="rr"><span>${label}</span><input type="range" min="${ea(min)}" max="${ea(max)}" step="${ea(step)}" value="${ea(val)}" data-k="${ea(key)}" data-u="${ea(unit)}" style="--p:${ea(rangePct(val, min, max))}%" ${dis ? 'disabled' : ''}><output class="tnum">${(+val).toFixed(step < 1 ? (step < .1 ? 2 : 1) : 0)}${unit}</output></label>`;
  }
  const rangePct = (v, a, b) => Math.round(clamp((v - a) / ((b - a) || 1), 0, 1) * 1000) / 10;
  const sws = (list, attr, cur, extra = '') => `<div class="sws">${list.map(c => `<button class="sw" style="--sw:${ea(c)}" ${attr} data-v="${ea(c)}" aria-pressed="${ea(String(c).toLowerCase() === String(cur || '').toLowerCase())}" aria-label="Color ${ea(colorName(c))}"></button>`).join('')}${extra}</div>`;
  /* muestras de color con un selector libre al final */
  const swsPick = (list, f, cur, label) => {
    const hex = /^#[0-9a-f]{6}$/i.test(cur || '') ? cur : '#808080', own = !list.some(c => c.toLowerCase() === hex.toLowerCase());
    return sws(list, `data-lk="${ea(f)}"`, cur, `<label class="sw sw-pick" style="--sw:${ea(hex)}" aria-pressed="${ea(own)}" title="Otro color"><input type="color" data-lkc="${ea(f)}" value="${ea(hex)}" aria-label="${ea(label)}: otro color"></label>`);
  };
  const chips = (list, attr, cur) => `<div class="chipset">${list.map(([k, n]) => `<button class="chip" ${attr} data-v="${k}" aria-pressed="${ea(k === cur)}">${n}</button>`).join('')}</div>`;
  const deg180 = v => Math.round(((v + 540) % 360) - 180);
  /* íconos del panel */
  const SXI = {
    car: '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2 4h8L6 9z" fill="currentColor"/></svg>',
    reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.2v4.6h4.6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 3.5l17 17"/><path d="M10.4 5.7A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.6M6.6 6.7A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.3-1.1"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9.5 7V4.5h5V7"/></svg>',
    follow: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="7" width="12" height="10" rx="2.4"/><path d="M14.5 10.6 19 8v8l-4.5-2.6"/><circle cx="8.5" cy="12" r="1.6"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/></svg>',
    card: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16.2c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h4M14.5 13.5h3"/></svg>',
    pose: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.6" r="2"/><path d="M12 7.5v6.5M12 9.5l-4.5 3M12 9.5l4.5-2.5M12 14l-3 6.5M12 14l3.5 6"/></svg>',
    hanger: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5V7.6a2.1 2.1 0 1 0-2.1-2.1"/><path d="M12 8.5 3.5 15a1.6 1.6 0 0 0 1 2.9h15a1.6 1.6 0 0 0 1-2.9z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  };
  /* posición: tres casillas en una fila (en la viñeta y la planta se arrastra y se gira con el aro) */
  const posRow = p => `<div class="fp-pos"><label title="A lo ancho (m)"><span>X</span><input type="number" step="0.1" data-o="x" value="${ea(round2(p.x))}"></label><label title="En profundidad (m)"><span>Z</span><input type="number" step="0.1" data-o="z" value="${ea(round2(p.z))}"></label><label title="Giro (°)"><span>Giro</span><input type="number" step="5" data-o="rot" value="${ea(deg180(p.rot || 0))}"></label></div>`;
  /* un menú del panel que se rehace solo tras cada cambio (accesorios, posición) */
  function panelMenu(btn, cls, html, opts = {}) {
    const r = btn.getBoundingClientRect();
    const pp = popover(r, html(), q => {
      q.classList.add('pop-sx', cls);
      q.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        if (opts.close && opts.close(b)) closePop();
        onPanelBtn(b, true);
        if (q.isConnected && opts.live) q.querySelector('.sxm-body').innerHTML = html(true);
      });
      q.addEventListener('change', e => { onPanelChange(e.target); });
    });
    popPlace(pp, r);
    return pp;
  }
  function actorPanel(ob, p) {
    const castAll = Object.values(P.elements).filter(e => e.cat === 'cast').sort((a, b) => (D.castNum[a.id] || 99) - (D.castNum[b.id] || 99));
    const lk = lookOf(ob);
    const faceless = !!(S3_BODY[lk.body] || {}).faceless;
    const el = ob.el && P.elements[ob.el];
    // fila 1: el personaje (o figura genérica), su ficha y el menú ⋯ (posición, seguir, quitar)
    const head = `<div class="fp-head"><span class="fdot" style="--c:${ea(lk.color)}">${el ? D.castNum[el.id] || '' : ''}</span><select data-o="el" aria-label="Personaje"><option value="">Figura genérica</option>${castAll.map(c => `<option value="${ea(c.id)}" ${c.id === ob.el ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>${el ? `<button class="icbtn" data-o="ficha" title="Ficha: ${esc(lookSummary(el))} · cuerpo, estatura, tallas, fotos, tono y pelo" aria-label="Ficha del personaje">${SXI.card}</button>` : ''}<button class="icbtn" data-o="objmenu" aria-haspopup="menu" title="Posición, seguir con la cámara, quitar" aria-label="Más">${SXI.more}</button></div>`;
    // una figura genérica guarda su aspecto en el plano (plegado)
    const look = el ? '' : `<details class="joints figlook" ${E.lookOpen ? 'open' : ''}><summary>Aspecto · ${esc((S3_BODY[lk.body] || {}).name || '')}</summary>
          <div class="fld"><span>Cuerpo</span>${chips(Object.entries(S3_BODY).map(([k, v]) => [k, v.name]), 'data-lk="body"', lk.body)}</div>
          <div class="fld lk-bars"><span>Proporciones</span>
            ${rangeRow('Estatura', 'lk:height', lk.height.toFixed(2), .8, 2.2, .01, ' m')}
            ${rangeRow('Contextura', 'lk:bw', Math.round(lk.w * 100), 75, 140, 1, '%')}
            ${S3_PROP.map(([f, n, a, b]) => rangeRow(n, 'lk:' + f, lk[f], a, b, 1, '%')).join('')}
            <div class="chipset">${[['delgada', 'Delgada'], ['media', 'Media'], ['robusta', 'Robusta']].map(([k, n]) => `<button class="chip" data-lk="build" data-v="${k}" aria-pressed="${ea(!num(lk.bw) && lk.build === k)}">${n}</button>`).join('')}<button class="chip" data-o="propreset">Restablecer</button></div></div>
          <div class="fld"><span>Tono del cuerpo</span>${sws(S3_TONOS, 'data-lk="tono"', lk.tono)}</div>
          <div class="fld"><span>Pelo</span>${peloPicker(lk, 'data-lk="pelo"')}</div>
          <div class="fld"><span>Color del pelo</span>${peloColors(lk, 'data-lk="peloColor"')}</div>
          <div class="fld"><span>Color en la planta</span>${swsPick(S3_COLORS, 'color', lk.color, 'Color en la planta')}</div></details>`;
    // fila 2: expresión y postura (cada una abre su lista) y restablecer lo doblado a mano
    const cur = p.expr || 'neutral', bent = p.j && Object.keys(p.j).length;
    const ep = `<div class="fp-ep${ea(faceless ? ' one' : '')}">${faceless ? '' : `<button class="pose-btn" data-o="exprmenu" aria-haspopup="listbox" title="Expresión: elegir o dibujar una"><span class="pb-l"><img src="${ea(exprIcon(faceKeyFor(lk, cur)))}" alt="">${esc(exprLabel(cur, lk))}</span>${SXI.car}</button>`}
      <div class="pose-row"><button class="pose-btn" data-o="posemenu" aria-haspopup="listbox" title="Postura (también desde el ▾ junto al nombre en la viñeta). Para doblar un brazo o una pierna, tócalo en la viñeta y arrástralo."><span class="pb-l">${SXI.pose}${esc(poseDef(p.pose).name)}</span>${SXI.car}</button><button class="icbtn" data-o="jreset" title="Restablecer la postura: borra lo que se dobló a mano" aria-label="Restablecer pose" ${bent ? '' : 'disabled'}>${SXI.reset}</button></div></div>`;
    // fila 3: accesorios dibujados (la lista se abre en un menú)
    const n = (lk.acc || []).length;
    // fila 3: vestuario (prendas y ropa dibujada) y, a su lado, modificar el personaje (su ficha; en una figura genérica, su aspecto)
    const vest = FIG3D.has(lk.body) ? `<button class="pose-btn fp-acc" data-o="accmenu" aria-haspopup="menu" title="Vestuario: prendas, ropa y accesorios dibujados; la figura los lleva en todos los planos"><span class="pb-l">${SXI.hanger}Vestuario${n ? `<b class="fp-n">${n}</b>` : ''}</span>${SXI.car}</button>` : '';
    const mod = el ? `<button class="pose-btn fp-mod" data-o="ficha" title="Modificar personaje: cuerpo, proporciones, tono, pelo, fotos y expresiones (vale en todos sus planos)"><span class="pb-l">${SXI.card}Modificar personaje</span></button>`
      : `<button class="pose-btn fp-mod" data-o="lookopen" aria-expanded="${ea(!!E.lookOpen)}" title="Modificar la figura: cuerpo, proporciones, tono y pelo (solo en este plano)"><span class="pb-l">${SXI.card}Modificar figura</span>${SXI.car}</button>`;
    const acc = `<div class="fp-ep${ea(vest ? '' : ' one')}">${vest}${mod}</div>`;
    return `${head}${ep}${acc}${look}`;
  }
  /* menú de accesorios: cada uno con editar, ocultar y borrar; y dibujar uno nuevo */
  /* menú de vestuario: lo que lleva puesto (editar, ocultar, borrar), conjuntos listos, prendas sueltas y
     dibujar un accesorio */
  function accMenuHTML() {
    const ob = selOb(); if (!ob) return '';
    // sin conjuntos listos: prendas sueltas y, sobre todo, ropa dibujada a medida
    const L = lookOf(ob).acc || [], tab = E.vestTab === 'items' || (!E.vestTab && !L.length) ? 'items' : 'mine';
    const tabs = `<div class="seg vest-tabs">${[['mine', 'Puesto' + (L.length ? ` · ${L.length}` : '')], ['items', 'Prendas']].map(([k, n]) => `<button data-o="vesttab" data-v="${k}" aria-pressed="${ea(k === tab)}">${n}</button>`).join('')}</div>`;
    const draw = `<div class="vest-draw"><button class="btn sm sxm-add" data-o="accnew" data-k="ropa" title="Dibuja la prenda sobre el cuerpo de frente, de lado y atrás: con simetría, polígono para bordes rectos, guías del cuerpo y zoom">${SXI.hanger}Dibujar ropa</button><button class="btn sm sxm-add" data-o="accnew" title="Sombrero, mochila, lentes… dibujado de frente, de lado y desde arriba: se arma en 3D">${SXI.plus}Dibujar un accesorio</button></div>`;
    if (tab === 'items') return tabs + VEST_GROUPS.map(([g, ks]) => `<div class="pose-h">${g}</div><div class="vest-grid">${ks.map(k => `<button class="vest-it" data-o="vestadd" data-v="${k}" aria-pressed="${ea(L.some(a => a.preset === k))}" title="${ea(L.some(a => a.preset === k) ? 'Puesto: tócalo para quitarlo' : 'Ponérselo')}"><i style="background:${ea(VEST[k].color)}"></i>${esc(VEST[k].name)}</button>`).join('')}</div>`).join('') + draw;
    return tabs + (L.length ? '' : '<p class="vest-note">Todavía nada: elige prendas o dibuja la ropa a medida.</p>') + `${L.map(a => `<div class="accrow${ea(a.hide ? ' off' : '')}"><button class="icbtn ly-eye" data-o="acchide" data-v="${ea(a.id)}" title="${ea(a.hide ? 'Volver a mostrarlo' : 'Ocultarlo sin borrarlo')}" aria-label="${ea(a.hide ? 'Mostrar' : 'Ocultar')} ${esc(a.name)}">${a.hide ? SXI.eyeOff : SXI.eye}</button><i class="ly-th" style="background:${esc(a.color)}"></i><button class="acc-nm" data-o="accedit" data-v="${ea(a.id)}" title="Editar «${esc(a.name)}»"><b>${esc(a.name)}</b></button><span class="ly-v">${a.preset ? (VEST[a.preset] && VEST[a.preset].piece ? 'Pieza' : 'Prenda') : a.kind === 'ropa' ? 'Dibujada' : a.kind === 'pelo' ? 'Cabello' : esc((ACC_PARTS[a.part] || ACC_PARTS.cabeza).name)}</span><button class="icbtn danger ly-del" data-o="accdel" data-v="${ea(a.id)}" title="Eliminar" aria-label="Eliminar ${esc(a.name)}">${SXI.x}</button></div>`).join('')}${draw}`;
  }
  /* editar una prenda lista: color, estampado, material y lo ajustada u holgada */
  function openVestEdit(btn, ob, id) {
    const cur = () => (lookOf(ob).acc || []).find(a => a.id === id);
    const set = (patch, quiet) => { const list = (lookOf(ob).acc || []).map(a => a.id === id ? { ...a, ...patch, v: (a.v || 0) + (patch.vol != null ? 1 : 0) } : a); E.lookOpen = true; setLook(ob, 'acc', list, quiet); };
    const html = () => {
      const a = cur(); if (!a) return '';
      const V = VEST[a.preset] || {}, hex = /^#[0-9a-f]{6}$/i.test(a.color || '') ? a.color : '#808080', own = !VEST_COLORS.some(c => c.toLowerCase() === hex.toLowerCase());
      const cloth = !V.piece;
      return `<div class="pose-h">${esc(a.name)}</div>
        <div class="fld"><span>Color</span>${sws(VEST_COLORS, 'data-ve="color"', a.color, `<label class="sw sw-pick" style="--sw:${ea(hex)}" aria-pressed="${ea(own)}" title="Otro color"><input type="color" data-vc="color" value="${ea(hex)}" aria-label="Otro color"></label>`)}</div>
        ${cloth ? `<div class="fld"><span>Estampado</span>${chips(VEST_PAT, 'data-ve="pattern"', a.pattern || '')}</div>
        ${a.pattern ? `<div class="fld"><span>Segundo color</span>${sws(VEST_COLORS, 'data-ve="color2"', a.color2 || '#1E1B19')}</div>` : ''}` : ''}
        <div class="fld"><span>Material</span>${chips(ACC_MATS, 'data-ve="mat"', a.mat || 'tela')}</div>
        ${cloth ? `<label class="fld"><span>Ajustada … holgada</span><input type="range" min="-1" max="1" step=".05" value="${ea(a.vol || 0)}" data-vv="vol" style="--p:${ea(rangePct(a.vol || 0, -1, 1))}%"></label>` : ''}
        <button class="btn sm danger" data-ve="del">Quitar</button>`;
    };
    const r = btn.getBoundingClientRect();
    const pp = popover(r, html(), q => {
      q.classList.add('pop-sx', 'pop-vest');
      const repaint = () => { if (q.isConnected && cur()) q.innerHTML = html(); };
      q.addEventListener('click', e => {
        const b = e.target.closest('[data-ve]'); if (!b) return;
        const k = b.dataset.ve;
        if (k === 'del') { const list = (lookOf(ob).acc || []).filter(a => a.id !== id); closePop(); E.lookOpen = true; setLook(ob, 'acc', list); return; }
        if (k === 'pattern') { const v = b.dataset.v; set(v ? { pattern: v, color2: cur().color2 || (v === 'camuflaje' ? '#434C30' : '#1E1B19') } : { pattern: '' }); }
        else set({ [k]: b.dataset.v });
        repaint();
      });
      q.addEventListener('input', e => { const el = e.target; if (el.dataset.vc) { el.parentElement.style.setProperty('--sw', el.value); set({ color: el.value }, true); } if (el.dataset.vv) el.style.setProperty('--p', rangePct(+el.value, -1, 1) + '%'); });
      q.addEventListener('change', e => { const el = e.target; if (el.dataset.vc) { set({ color: el.value }); repaint(); } if (el.dataset.vv) { set({ vol: +el.value }); repaint(); } });
    });
    popPlace(pp, r);
  }
  /* menú ⋯ de lo elegido: posición exacta, seguir con la cámara y quitar */
  function objMenuHTML() {
    const ob = selOb(), p = ob && ed.state().o[ob.id]; if (!p) return '';
    const who = esc(ob.name || (S3_PROPS[ob.kind] || {}).name || 'esto');
    return `${ob.hold ? '' : posRow(p)}
      <div class="menu">${ob.kind === 'actor' ? `<button data-o="aimme">${SXI.follow}La cámara sigue a ${who}</button>` : ''}<button data-o="del" class="danger">${SXI.trash}Quitar del plano</button></div>`;
  }
  /* lista de expresiones (junto al botón del panel): la biblioteca de la figura y, debajo, editar la que
     tiene puesta o dibujar una nueva */
  function openExprMenu(ob, btn) {
    const p = ed.state().o[ob.id]; if (!p) return;
    const lk = lookOf(ob), cur = p.expr || 'neutral', el = ob.el && P.elements[ob.el];
    const faces = (el && el.look && el.look.faces) || {}, who = el ? titleCase(el.name) : '';
    const b1 = x => `<button data-o="expr" data-v="${esc(x.k)}" aria-pressed="${ea(cur === x.k)}" title="${esc(x.n)}${x.own && x.kind === 'pre' ? ` (versión de ${esc(who)})` : ''}"><img src="${ea(exprIcon(faceKeyFor(lk, x.k)))}" alt=""><span>${esc(x.n)}</span>${x.own && x.kind === 'pre' ? '<i class="ex-own" aria-hidden="true"></i>' : ''}</button>`;
    const canDel = (cur.slice(0, 2) === 'c:' && faces[cur]) || (cur.slice(0, 2) === 'f:' && customFace(cur.slice(2)));
    const html = `<div class="pose-h">Expresión · ${esc(ob.name || 'Figura')}</div><div class="exprs">${exprEntries(lk, cur).map(b1).join('')}</div>
      <div class="ex-gl"><span>Lentes</span>${FACE_GLASSES.map(([g2, n]) => `<button class="chip" data-o="faceglasses" data-v="${ea(g2)}" aria-pressed="${ea((lk.glasses || '') === g2)}">${n}</button>`).join('')}</div>
      <div class="ex-acts"><button class="btn sm" data-o="faceedit" title="Dibujar sobre la expresión que tiene ${el ? `(queda en la ficha de ${esc(who)})` : '(queda en el proyecto)'}">${SXI.edit}Editar esta expresión</button><button class="btn sm" data-o="facenew" title="Dibujar una expresión nueva">${SXI.plus}Nueva</button>
        ${el && faces[cur] && cur.slice(0, 2) !== 'c:' ? `<button class="btn sm ghost" data-o="facereset" title="Quitar el dibujo de ${esc(who)} y volver a la predefinida" aria-label="Volver a la predefinida">${SXI.reset}</button>` : ''}
        ${canDel ? `<button class="btn sm ghost" data-o="facedel" data-v="${esc(cur)}" title="Borrar esta expresión" aria-label="Borrar esta expresión">${SXI.trash}</button>` : ''}</div>`;
    const r = btn.getBoundingClientRect();
    const pp = popover(r, html, q => {
      q.classList.add('pop-expr');
      q.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        closePop();
        const anchor = $m('[data-o="exprmenu"]') || btn;
        if (b.dataset.o === 'facenew') { exprEdit(anchor, ob, 'new'); return; }
        if (b.dataset.o === 'faceedit') { exprEdit(anchor, ob, 'cur'); return; }
        if (b.dataset.o === 'facereset' || b.dataset.o === 'facedel') { exprDelete(ob, cur); return; }
        if (b.dataset.o === 'faceglasses') { exprGlasses(ob, b.dataset.v); return; }
        onPanelBtn(b);
      });
    });
    popPlace(pp, r);
  }
  /* lista de objetos por grupos (vehículos, animales, muebles…) */
  const propOptions = cur => S3_PROP_CATS.map(([c, n]) => {
    const L = Object.entries(S3_PROPS).filter(([, v]) => (v.cat || 'objeto') === c);
    return L.length ? `<optgroup label="${n}">${L.map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</optgroup>` : '';
  }).join('');
  function propPanel(ob, p) {
    const fp = S3_PROPS[ob.kind] || {};
    const actors = E.s3.objs.filter(o => o.kind === 'actor');
    let extra = '';
    if (ob.kind === 'puerta' || ob.kind === 'ventana') extra = rangeRow('Apertura', 'o:open', Math.round(p.open || 0), 0, 110, 1, '°');
    if (ob.kind === 'detalle') extra = `<select data-o="dmodel" aria-label="Se ve como">${DETAIL_MODELS.map(([k, n]) => `<option value="${k}" ${k === detailModel(ob) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    if (fp.small) extra = `<label class="fld"><span>Lo sostiene</span><select data-o="hold"><option value="">Nadie</option>${actors.map(a => `<option value="${ea(a.id)}" ${ob.hold && ob.hold.a === a.id ? 'selected' : ''}>${esc(a.name || 'Figura')}</option>`).join('')}</select></label>
      ${ob.hold ? chips([['R', 'Mano derecha'], ['L', 'Mano izquierda'], ['pecho', 'Pecho']], 'data-o="holdat"', ob.hold.at || 'R') : rangeRow('Altura', 'o:h', round2(p.h || 0), 0, 2.2, .01, ' m') + '<div class="chipset"><button class="chip" data-o="hset" data-v="0">Suelo</button><button class="chip" data-o="hset" data-v="0.77">Sobre mesa</button><button class="chip" data-o="hset" data-v="1.03">Sobre mostrador</button></div>'}`;
    // color del vehículo o del pelaje
    if (fp.paint || VEH_KINDS.has(ob.kind)) {
      const list = isAnimal(ob.kind) ? ANI_COLORS : VEH_COLORS, cur = ob.paint || VEH_PAINT[ob.kind] || '#7D8C9C';
      const hex = /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#808080', own = !list.some(c => c.toLowerCase() === hex.toLowerCase());
      extra += `<div class="fld"><span>${isAnimal(ob.kind) ? 'Pelaje' : 'Color'}</span>${sws(list, 'data-o="paint"', cur, `<label class="sw sw-pick" style="--sw:${ea(hex)}" aria-pressed="${ea(own)}" title="Otro color"><input type="color" data-opc="1" value="${ea(hex)}" aria-label="Otro color"></label>`)}</div>`;
    }
    return `<div class="fp-head"><select data-o="kind" aria-label="Objeto" title="${ea(fp.wall && E.s3.set === 'int' ? 'Arrástralo en la planta hasta un muro: se encaja y abre un vano' : 'Tipo de objeto')}">${propOptions(ob.kind)}</select><button class="icbtn" data-o="objmenu" aria-haspopup="menu" title="Posición y quitar" aria-label="Más">${SXI.more}</button></div>
      ${extra}`;
  }
  /* extras en grupo: cuántos, en qué situación, qué tan juntos y la ropa; «Mezclar» los reacomoda */
  function gentePanel(ob) {
    genteNorm(ob);
    const lod = ob.n <= GENTE_SIMPLE ? 'figuras simples' : 'siluetas';
    return `<div class="fp-head"><span class="fdot gn-dot" aria-hidden="true"></span><b class="gn-t">${esc(ob.name || 'Extras')}</b><button class="icbtn" data-o="objmenu" aria-haspopup="menu" title="Posición y quitar" aria-label="Posición y quitar">${SXI.more || '⋯'}</button></div>
      <label class="fld"><span>Cantidad</span><input type="number" class="gn-n" min="1" max="${GENTE_MAX}" step="1" value="${ea(ob.n)}" data-o="gn-n" aria-label="Cantidad de extras"></label>
      ${chips([[10, '10'], [25, '25'], [50, '50'], [100, '100'], [200, '200']], 'data-o="gn-nq"', ob.n)}
      <label class="fld"><span>Situación</span><select data-o="gn-sit" aria-label="Situación">${GENTE_SITS.map(([k, n]) => `<option value="${k}" ${k === ob.sit ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <div class="fld"><span>Qué tan juntos</span>${chips(Object.entries(GENTE_DENS).map(([k, v]) => [k, v[1]]), 'data-o="gn-dens"', ob.dens)}</div>
      <div class="fld"><span>Ropa</span>${chips([['', 'Variada'], ['gris', 'Gris']], 'data-o="gn-ropa"', ob.ropa || '')}</div>
      <div class="fp-quick"><button class="btn sm" data-o="gn-mix" title="Otro acomodo, con las mismas personas">Mezclar</button></div>
      <p class="hint" style="margin:0">Detalle: ${lod} (hasta ${GENTE_SIMPLE}, figuras con su postura; más, siluetas). En la planta, muévelo y gíralo entero; su frente es la flecha.</p>`;
  }
  function lightPanel(st) {
    const LS = E.s3.light || { mode: 'previs', amb: .22, rig: true, wb: 4300 };
    const lights = E.s3.objs.filter(o => o.kind === 'luz');
    const ob = lights.find(o => o.id === E.sel), p = ob && st.o[ob.id];
    const actors = E.s3.objs.filter(o => o.kind === 'actor');
    const sim = LS.mode === 'sim', S = sim && lights.length ? luzSolve(E.s3, st) : null, X = S ? S.X : luzExp(E.s3);
    const opt = (list, cur, fmt) => list.map(v => `<option value="${ea(v)}" ${+cur === v ? 'selected' : ''}>${fmt(v)}</option>`).join('');
    const nm = id => esc((E.s3.objs.find(o => o.id === id) || {}).name || 'Figura');
    let h = `<label class="opt" style="padding:8px 10px" title="Apaga la luz neutra de previsualización: solo tus equipos, con su potencia real, caída con la distancia y sombras"><input type="checkbox" data-ls="sim" ${sim ? 'checked' : ''}><span><b>Simular la luz</b></span></label>`;
    if (S) {
      const R = S.ref && S.read[S.ref];
      h += `<div class="lx-box"><div class="lx-h"><b>Exposición</b><span class="lx-ic"><label class="lx-auto" title="Diafragma automático"><input type="checkbox" data-lx="auto" ${X.auto ? 'checked' : ''}> Auto</label>
          <button class="icbtn" data-l="meter" aria-pressed="${ea(LS.meter !== false)}" title="Fotómetro sobre las figuras: luz incidente en la cara, hacia la cámara (verde bien expuesta, naranja sobre, azul bajo)" aria-label="Fotómetro"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l4-5"/><circle cx="12" cy="16" r="1.4"/></svg></button>
          <button class="icbtn" data-l="fc" aria-pressed="${ea(!!LS.fc)}" title="Color falso" aria-label="Color falso"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="1.5"/><path d="M9.2 6v12M14.8 6v12"/></svg></button></span></div>
        <div class="lx-grid"><label class="fld"><span>ISO</span><select data-lx="iso">${opt(LUX_ISO, X.iso, v => v)}</select></label>
        <label class="fld"><span>Obturador</span><select data-lx="sh">${opt(LUX_SH, X.sh, v => '1/' + v + (v === 48 || v === 50 ? ' · 180°' : ''))}</select></label>
        <label class="fld"><span>Diafragma</span><select data-lx="f">${opt(LUX_F, fRound(X.f), v => fTxt(v))}</select></label>
        <label class="fld"><span>ND</span><select data-lx="nd">${opt(LUX_ND, X.nd, v => v ? v.toFixed(1) + ' (−' + Math.round(v / .3) + ')' : 'Sin ND')}</select></label></div>
        <p class="hint" style="margin:0">El gris medio pide <b>${Math.round(S.mid)} lux</b>.${R ? ` ${nm(S.ref)} recibe ${Math.round(R.E)} lux: ${fTxt(fRound(R.f))} (${stopTxt(R.d)}).` : ''}</p>
        ${LS.fc ? `<div class="lx-fc">${LUX_FC.map(([a, b, c, n]) => `<span><i style="background:rgb(${ea(c.join(','))})"></i>${n}</span>`).join('')}</div>` : ''}</div>`;
    }
    h += `${rangeRow('Ambiente', 'ls:amb', LS.amb ?? .22, 0, 1, .01, '')}${sim ? `<p class="hint" style="margin:-4px 0 0">≈ ${Math.round(luzAmb(LS)).toLocaleString('es-PE')} lux de cielo, ventanas o rebote del lugar.</p>` : ''}
      <div class="rr rr-s"><span>Balance</span><span class="rr-pick"><select data-ls="wb" aria-label="Balance de blancos de la cámara" title="Balance de blancos de la cámara">${[[2700, '2700 K · cálido'], [3200, '3200 K · tungsteno'], [4300, '4300 K · neutro'], [5600, '5600 K · día'], [6500, '6500 K · nublado']].map(([k, n]) => `<option value="${k}" ${(LS.wb || 4300) == k ? 'selected' : ''}>${n}</option>`).join('')}</select><button class="icbtn" data-l="rig" aria-pressed="${ea(LS.rig !== false)}" title="${ea(LS.rig !== false ? 'Ocultar' : 'Mostrar')} trípodes y equipos en la viñeta" aria-label="Trípodes en la viñeta"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="6" rx="1.5"/><path d="M12 9v4M12 13l-5 8M12 13l5 8M12 13v8"/></svg></button></span></div>
      <div class="ly-h"><b>${lights.length ? 'Luces del plano' : 'Sin luces'}</b><button class="icbtn" data-l="addmenu" aria-haspopup="menu" title="Agregar una luz" aria-label="Agregar una luz"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>`;
    const lrow = o => { const q = st.o[o.id] || {}, B = isBoard(o); return `<div class="ly${ea(o.id === E.sel ? ' on' : '')}" data-l="pick" data-v="${ea(o.id)}" role="button" tabindex="0" aria-pressed="${ea(o.id === E.sel)}"><span></span><i class="ly-th ly-dot" style="background:${ea(o.type === 'bandera' ? '#1D1E21' : o.type === 'rebote' ? '#F3F1EA' : kelvinHex(q.k || 3200))}"></i><span class="ly-nm">${esc(o.name)}</span><span class="ly-v">${B ? esc((S3_FIXTURES[fxKey(o)] || {}).name || '') : Math.round(q.int ?? 60) + ' %'}</span></div>`; };
    h += `<div class="ly-list">${lights.map(o => lrow(o) + (o === ob && p ? '<!--LX-->' : '')).join('')}</div>`;
    if (ob && p) {
      const T = ob.type, F = fxOf(ob), board = isBoard(ob);
      const fams = [...new Set(Object.values(S3_FIXTURES).map(x => x.fam))];
      const fxSel = `<select data-o="lfx">${fams.map(fm => `<optgroup label="${esc(fm)}">${Object.entries(S3_FIXTURES).filter(([, x]) => x.fam === fm).map(([k, x]) => `<option value="${k}" ${k === fxKey(ob) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}</select>`;
      let lx = `<div class="lightbox ly-x"><div class="grid2"><label class="fld"><span>Nombre</span><input type="text" data-o="lname" value="${esc(ob.name || '')}"></label>
        <label class="fld"><span>Equipo</span>${fxSel}</label></div>`;
      if (T === 'fresnel' || T === 'panel') lx += `<label class="fld"><span>Modificador</span><select data-o="lmod">${Object.entries(S3_MODS).map(([k, m]) => `<option value="${k}" ${k === (S3_MODS[ob.mod] ? ob.mod : 'no') ? 'selected' : ''}>${esc(m.name)}${m.loss ? ' · −' + stopTxt(m.loss).slice(1) : ''}</option>`).join('')}</select></label>`;
      if (!board) {
        lx += rangeRow(sim ? 'Dímer' : 'Intensidad', 'o:int', Math.round(p.int ?? 60), 0, 100, 1, '%');
        lx += F.k && F.k[0] !== F.k[1] ? rangeRow('Temperatura', 'o:k', Math.round(clamp(p.k || 3200, F.k[0], F.k[1])), F.k[0], F.k[1], 50, 'K') + `<div class="chipset">${[2700, 3200, 4300, 5600, 6500].filter(k => k >= F.k[0] && k <= F.k[1]).map(k => `<button class="chip" data-o="kset" data-v="${k}" aria-pressed="${Math.round(p.k) === k}">${k}</button>`).join('')}</div>`
          : `<p class="hint" style="margin:0">Temperatura del equipo: ${F.k ? F.k[0] : 5600} K${T !== 'sol' ? ' (para cambiarla, una gelatina CTB o CTO)' : ''}.</p>`;
        if (F.beam && F.beam[0] !== F.beam[1]) lx += rangeRow('Haz (spot ↔ flood)', 'o:ang', Math.round(clamp(p.ang || F.ref, F.beam[0], F.beam[1])), F.beam[0], F.beam[1], 1, '°');
      }
      lx += T === 'sol' ? rangeRow('Elevación', 'o:tilt', Math.round(p.tilt || 40), 3, 89, 1, '°') : rangeRow('Altura', 'o:h', round2(p.h ?? 2), .2, 8, .05, ' m');
      if (T !== 'practica') lx += `<label class="fld"><span>Apuntar a</span><select data-o="laim"><option value="">Manual</option>${actors.map(a => `<option value="${ea(a.id)}" ${a.id === ob.aim ? 'selected' : ''}>${esc(a.name || 'Figura')}</option>`).join('')}</select></label>`;
      if (!ob.aim || T === 'sol') lx += rangeRow(T === 'sol' ? 'Dirección' : 'Giro', 'rot', deg180(p.rot || 0), -180, 180, 1, '°');
      if (!ob.aim && T !== 'sol' && T !== 'practica') lx += rangeRow('Inclinación', 'o:tilt', Math.round(p.tilt || 0), -20, 89, 1, '°');
      if (S) {
        // qué hace esta luz en la figura a la que apunta (o en la de referencia)
        const tid = ob.aim && S.read[ob.aim] ? ob.aim : S.ref, R = tid && S.read[tid], part = R && R.parts.find(q => q.id === ob.id);
        const on = part ? `${Math.round(part.E).toLocaleString('es-PE')} lux en ${nm(tid)} (${stopTxt(Math.log2(part.E / S.mid))} respecto del gris medio)` : tid ? `no llega a ${nm(tid)}` : '';
        if (T === 'rebote') { const B = S.bounce[ob.id]; lx += `<p class="lx-info">${B && B.E >= 1 ? `Recibe ${Math.round(B.E).toLocaleString('es-PE')} lux y devuelve ${on || 'luz difusa'}.` : 'No le llega luz: ponlo dentro del haz de una luz (o abre el haz de la principal) para que devuelva relleno.'}</p>`; }
        else if (T === 'bandera') lx += `<p class="lx-info">Tapa la luz que la cruza (corta el haz o quita relleno).</p>`;
        else lx += `<p class="lx-info">${on ? on.charAt(0).toUpperCase() + on.slice(1) + '.' : ''}${F.w ? ` Consumo: ${F.w.toLocaleString('es-PE')} W · ${luzAmps(F.w, F.pf).toFixed(1)} A a ${LUX_V} V.` : ''}</p>`;
      }
      lx += `<div class="ly-acts"><button class="btn ghost sm danger" data-o="del">Eliminar</button></div></div>`;
      h = h.replace('<!--LX-->', lx);
    }
    if (lights.length) {
      const n = luzCount(E.s3), W = luzWatts(n);
      h += `<details class="lx-box lx-eq" ${E.eqOpen ? 'open' : ''}><summary class="lx-h"><b>Equipos del plano</b><span class="tnum">${W ? W.toLocaleString('es-PE') + ' W' : ''}</span></summary><ul class="lx-list">${Object.entries(n).map(([k, q]) => `<li><span>${q} × ${esc(S3_FIXTURES[k].name)}</span><span class="tnum">${S3_FIXTURES[k].w ? (S3_FIXTURES[k].w * q).toLocaleString('es-PE') + ' W' : ''}</span></li>`).join('')}</ul>
        <p class="hint" style="margin:0">${W ? `${W.toLocaleString('es-PE')} W · ${luzAmps(W).toFixed(1)} A a ${LUX_V} V. ${esc(luzGen(W).txt)}.` : 'Sin consumo eléctrico.'}</p>
        <button class="btn sm" data-l="list">Lista de luces del proyecto…</button></details>`;
    }
    return h;
  }
  /* lista de luces de todo el proyecto: cuántas de cada una hacen falta a la vez, consumo y generador; va al presupuesto */
  function lightList(btn) {
    const L = luzProjectList(P, { id, s3: E.s3 }), g = luzGen(L.peak);
    const html = `<h5>Luces y grip del proyecto</h5><p class="hint" style="margin:0 6px">${L.shots} ${L.shots === 1 ? 'plano' : 'planos'} con luces. Cantidad: lo máximo que se usa a la vez en un plano.</p>
      <table class="lx-tbl"><thead><tr><th>Equipo</th><th>Cant.</th><th>Planos</th><th>W</th></tr></thead><tbody>${L.items.map(it => { const F = S3_FIXTURES[it.k]; return `<tr><td>${esc(F.name)}</td><td class="tnum">${it.q}</td><td class="tnum">${it.shots}</td><td class="tnum">${F.w ? (F.w * it.q).toLocaleString('es-PE') : '—'}</td></tr>`; }).join('')}</tbody></table>
      <p class="hint" style="margin:0 6px">Pico en un plano: <b>${L.peak.toLocaleString('es-PE')} W</b> · ${luzAmps(L.peak).toFixed(1)} A a ${LUX_V} V. ${esc(g.txt)}.</p>
      <p class="hint" style="margin:0 6px">Valores fotométricos y de consumo aproximados: confírmalos con la ficha de cada equipo.</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;padding:0 4px 4px"><button class="btn sm primary" data-lb="bud">Llevar al presupuesto</button></div>`;
    popover(btn, html, pp => {
      pp.classList.add('pop-set', 'pop-lx');
      pp.querySelector('[data-lb="bud"]').onclick = () => {
        if (typeof canEditSec === 'function' && !canEditSec('presupuesto')) { toast('No tienes permiso para editar el presupuesto.'); return; }
        if (typeof budProtected === 'function' && budProtected() && !budOpen()) { toast('El presupuesto está bloqueado: ábrelo con tu código en la pestaña Presupuesto.'); return; }
        const n = luzBudget(P, L);
        closePop(); toast(n ? `Presupuesto: ${n} ${n === 1 ? 'línea' : 'líneas'} en «Cámara, luces y grip» (días de rodaje enlazados; falta la tarifa).` : 'El presupuesto ya tenía estas luces.');
      };
    });
  }
  /* desenfoque (profundidad de campo): encenderlo, el diafragma y a quién se enfoca; debajo, lo que queda nítido */
  function dofRows(st) {
    const on = !!E.s3.dof;
    let h = `<label class="opt" style="padding:6px 10px" title="Desenfoca la viñeta como el lente real: con el diafragma, el lente, el sensor y la distancia de foco"><input type="checkbox" data-c="dof" ${on ? 'checked' : ''}><span><b>Desenfoque</b> (profundidad de campo)</span></label>`;
    if (!on) return h;
    const f = fRound(dofF(E.s3)), fp = dofFocus(E.s3, st), c = st.cam;
    const subj = E.s3.objs.filter(o => o.kind === 'actor' || (o.kind !== 'luz' && !o.hold));
    h += `<label class="rr rr-s"><span>Diafragma</span><select data-c="dofF" class="rr-sel" aria-label="Diafragma">${LUX_F.filter(v => v >= 1.4).map(v => `<option value="${ea(v)}" ${v === f ? 'selected' : ''}>${fTxt(v)}</option>`).join('')}</select></label>
      <label class="rr rr-s" title="A quién se enfoca: a sus ojos"><span>Foco en</span><select data-c="focus" class="rr-sel" aria-label="Foco en"><option value="">Automático${fp && !E.s3.focus ? ' · ' + esc((E.s3.objs.find(o => o.id === fp.id) || {}).name || 'Figura') : ''}</option>${subj.map(o => `<option value="${ea(o.id)}" ${E.s3.focus === o.id ? 'selected' : ''}>${esc(o.name || 'Figura')}</option>`).join('')}</select></label>`;
    if (fp) {
      const s = Math.hypot(fp.x - c.x, fp.z - c.z, fp.y - c.h), Z = dofOf(clamp(c.lens, 8, 600), dofF(E.s3), c.sw || 36, s);
      h += `<p class="hint rr-eq">Foco a ${measFmt(s)} · nítido de ${dofFmt(Z.near)} a ${dofFmt(Z.far)} m${isFinite(Z.far) ? '' : ' (pasada la hiperfocal)'}.</p>`;
    }
    return h;
  }
  function camPanel(st) {
    const c = st.cam, aim = E.s3.aim, L = Math.round(c.lens), lens = [18, 24, 35, 50, 85, 135];
    const tr = (k, v, t, d) => `<button class="icbtn" data-tr="${k}" data-v="${ea(v)}" title="${ea(t)}" aria-label="${ea(t)}"><svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg></button>`;
    const m = E.trM || 2;
    // dos cámaras en el mismo plano: cuál se edita (la otra se ve tenue en la planta) o agregar la B
    const ab = s3HasB(E.s3) ? `<div class="rr rr-ab"><span>Cámara</span><span class="seg cam-ab" role="group" aria-label="Cámara que se edita"><button data-c="camab" data-v="a" aria-pressed="${ea(E.cam === 'a')}">A</button><button data-c="camab" data-v="b" aria-pressed="${ea(E.cam === 'b')}">B</button></span><button class="btn sm ghost" data-c="delb" title="El plano queda con una sola cámara (la A)">Quitar B</button></div>`
      : `<div class="rr rr-ab"><span>Cámara</span><button class="btn sm" data-c="addb" title="Una segunda cámara en el mismo plano, con su posición, lente, altura, movimiento y viñeta">+ Cámara B</button></div>`;
    // filas parejas: nombre · deslizador · valor (se escribe al tocarlo); el lente, como valor con su menú
    return ab + `<label class="rr"><span>Lente</span><input type="range" min="10" max="200" step="1" value="${ea(L)}" data-k="lens" data-u="mm" style="--p:${ea(rangePct(L, 10, 200))}%"><select data-c="lensp" class="rr-sel" aria-label="Lente">${lens.includes(L) ? '' : `<option value="${ea(L)}" selected>${L} mm</option>`}${lens.map(l => `<option value="${ea(l)}" ${l === L ? 'selected' : ''}>${l} mm</option>`).join('')}</select></label>
      <label class="rr rr-s" title="El tamaño del sensor de la cámara: con uno más chico, el mismo lente encuadra más cerrado"><span>Sensor</span><select data-c="sensor" class="rr-sel rr-sens" aria-label="Tamaño del sensor">${SENSORS.map(([k, n, , w]) => `<option value="${ea(k)}" ${sensorOf(E.s3)[0] === k ? 'selected' : ''}>${esc(n)}${k === 'ff' ? '' : ` · ${String(w).replace('.', ',')} mm`}</option>`).join('')}</select></label>
      ${sensorOf(E.s3)[0] === 'ff' ? '' : `<p class="hint rr-eq">${L} mm en ${esc(sensorOf(E.s3)[1])} encuadra como ${Math.round(camFF(c))} mm en full frame.</p>`}
      ${dofRows(st)}
      ${rangeRow('Altura', 'h', round2(c.h), .1, 20, .05, ' m')}
      <label class="rr rr-s" title="La cámara gira sola para seguir a una figura"><span>Seguir</span><span class="rr-pick"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg><select data-c="aim" aria-label="Seguir a"><option value="">Nadie · cámara libre</option>${E.s3.objs.filter(o => o.kind === 'actor').map(o => `<option value="${ea(o.id)}" ${o.id === aim ? 'selected' : ''}>A ${esc(o.name || 'la figura')}</option>`).join('')}</select></span></label>
      ${aim ? rangeRow('Ajuste de tilt', 'aimTilt', E.s3.aimTilt || 0, -30, 30, 1, '°') : rangeRow('Paneo', 'yaw', deg180(c.yaw), -180, 180, 1, '°') + rangeRow('Tilt', 'pitch', Math.round(c.pitch), -89, 89, 1, '°')}
      <div class="rr rr-trk"><span title="Cada toque suma a la clave final; con la cámara libre no gira">Recorrido</span><span class="trk-btns">
        ${tr('lateral', -1, 'Travelling a la izquierda', '<path d="M10 7l-5 5 5 5M5 12h14"/>')}${tr('lateral', 1, 'Travelling a la derecha', '<path d="M14 7l5 5-5 5M19 12H5"/>')}
        ${tr('dolly', 1, 'Avanzar (dolly in)', '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M3 3l4 4M21 3l-4 4M3 21l4-4M21 21l-4-4"/>')}${tr('dolly', -1, 'Retroceder (dolly out)', '<rect x="9" y="9" width="6" height="6" rx="1"/><path d="M8 8 4 4M16 8l4-4M8 16l-4 4M16 16l4 4"/>')}
        ${tr('ped', 1, 'Subir', '<path d="M12 19V5M7 10l5-5 5 5"/>')}${tr('ped', -1, 'Bajar', '<path d="M12 5v14M7 14l5 5 5-5"/>')}</span>
        <span class="rr-step" title="Metros por toque"><button class="icbtn" data-c="trm" data-v="-1" aria-label="Menos metros por toque">−</button><output class="tnum" id="trMo">${m} m</output><button class="icbtn" data-c="trm" data-v="1" aria-label="Más metros por toque">+</button></span></div>
      <div class="fp-two"><button class="btn sm ghost fp-ib" data-c="frame" title="Recoloca la cámara con ${esc(E.form.size)} · ${esc(E.form.angle)} (pestaña Plano)"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>Reencuadrar</button>
      <button class="btn sm ghost fp-ib" data-c="move" title="Anima el movimiento del plano: ${esc(E.form.move || 'Fijo')}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14l11-7z"/></svg>Animar: ${esc(E.form.move || 'Fijo')}</button></div>
      <details class="joints" ${E.camMore ? 'open' : ''} data-more="cam"><summary>Holandés y cámara en mano</summary>
        ${rangeRow('Holandés', 'roll', Math.round(c.roll), -45, 45, 1, '°')}
        ${rangeRow('En mano', 'shake', E.s3.shake || 0, 0, 1.5, .05, '')}</details>`;
  }
  /* escena: el lugar (escenario o plano de planta), la atmósfera, la lluvia y el sol o la luna */
  function scenePanel() {
    const R = roomOf(E.s3);
    const pls = Object.values(P.plans || {}), curPl = planOf(E.s3);
    const A = S3_ATMS[atmOf(E.s3)], extEnv = !envOf(E.s3).int && !envOf(E.s3).studio;
    const d3 = set3dOf(E.s3);
    // el color del vehículo (solo la carrocería): los mismos de los vehículos del menú y uno a elección
    const car = E.s3.set === 'auto' ? carOf(E.s3) : null, own = car && !VEH_COLORS.some(c => c.toLowerCase() === car.c.toLowerCase());
    return `<label class="fld"><span>Escenario</span><select data-c="set">${setOptions().map(([k, n]) => `<option value="${ea(k)}" ${k === setCur() ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      ${car ? `<div class="fld"><span>Color</span>${sws(VEH_COLORS, 'data-c="carpaint"', car.c, `<label class="sw sw-pick" style="--sw:${ea(car.c)}" aria-pressed="${ea(own)}" title="Otro color"><input type="color" data-cpc="1" value="${ea(car.c)}" aria-label="Otro color"></label>`)}</div>` : ''}
      ${d3 ? `<div class="e3-info"><span><b>${esc(d3.n)}</b><small>${set3dM((d3.b[2] - d3.b[0]) * escOf(d3))} × ${set3dM((d3.b[3] - d3.b[1]) * escOf(d3))} m · ${bsIs(d3) ? (d3.int !== false ? 'construido, interior' : 'construido, exterior') : d3.int ? 'interior' : 'exterior'}${P.locSet3d && P.locSet3d[s.loc] === d3.id ? ' · de toda la locación' : ''}</small></span>
        <button class="btn sm ghost" data-c="edit3d">${bsIs(d3) ? (sbCanBuild() && sbCanEdit() ? 'Editar…' : 'Ver…') : 'Ajustar…'}</button><button class="btn sm ghost" data-c="del3d" title="Quitar este escenario del proyecto">Quitar</button></div>
        ${set3dRoofy(d3) ? '<p class="hint e3-warn">¿El piso quedó en el techo? Muévelo en Piso (Ajustar…).</p>' : ''}` : ''}
      ${E.s3.set === 'vacio' ? '' : `<div class="grid2"><label class="fld"><span>Atmósfera</span><select data-c="atm">${S3_ATM.map(([k, n]) => `<option value="${k}" ${k === atmOf(E.s3) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="opt" style="padding:6px 10px;align-self:end"><input type="checkbox" data-c="rain" ${A.rain || E.s3.rain ? 'checked' : ''} ${A.rain ? 'disabled' : ''}><span><b>Lluvia</b></span></label></div>
      ${A.sun && extEnv ? rangeRow(A.sun.moon ? 'Dirección de la luna' : 'Dirección del sol', 'sunAz', Math.round(deg180(E.s3.sunAz ?? A.sun.az)), -180, 180, 1, '°') : ''}`}
      ${E.s3.set === 'plano' && curPl ? `<div class="grid2"><label class="fld"><span>Plano</span><select data-c="planId">${pls.map(p => `<option value="${ea(p.id)}" ${p.id === E.s3.planId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <label class="fld"><span>Alto de muros (m)</span><input type="number" step="0.05" min="2" max="8" data-c="planH" value="${ea(curPl.wallH || 2.6)}"></label></div>
        <label class="opt" style="padding:6px 10px"><input type="checkbox" data-c="planFloor" ${E.s3.planFloor !== false ? 'checked' : ''}><span><b>Ver el dibujo del plano en el piso</b></span></label>
        <label class="opt" style="padding:6px 10px" title="Oculta los muros que se interponen entre la cámara y las figuras, como al retirar una pared del set"><input type="checkbox" data-c="wild" ${E.s3.wildWalls ? 'checked' : ''}><span><b>Muros móviles</b></span></label>
        <button class="btn sm" data-c="caminside">Meter la cámara dentro del plano</button>` : ''}
      ${escRow()}
      <button class="btn sm" data-c="importplan">Importar plano de planta…</button>
      <button class="btn sm" data-c="import3d" title="Un modelo 3D de la locación: .glb, .kmz (SketchUp), .dae, .obj, .gltf o .fbx">Importar escenario 3D…</button>
      ${E.s3.set === 'int' ? `<div class="grid3"><label class="fld"><span>Ancho (m)</span><input type="number" min="1" max="40" step="0.1" data-c="rw" value="${ea(R.w)}"></label><label class="fld"><span>Fondo (m)</span><input type="number" min="1" max="40" step="0.1" data-c="rd" value="${ea(R.d)}"></label><label class="fld"><span>Alto (m)</span><input type="number" min="2" max="12" step="0.1" data-c="rh" value="${ea(R.h)}"></label></div>` : ''}`;
  }
  function panel() {
    $$('.sx-tabs button', m).forEach(b => b.setAttribute('aria-pressed', b.dataset.tab === E.tab));
    $m('#vp').classList.toggle('drawing', E.tab === 'draw');
    const P2 = $m('#sxPanel');
    const st = ed.state();
    let h = '';
    if (E.tab === 'sel') {
      const ob = E.s3.objs.find(o => o.id === E.sel), p = ob && st.o[ob.id];
      if (!ob || ob.kind === 'luz' || !p) h = `<p class="hint" style="margin:0">Toca una figura u objeto en la viñeta o en la planta para ajustarlo.</p>
        <div class="fp-quick"><button class="btn sm" data-o="addfig">+ Figura</button><button class="btn sm" data-o="addobj">+ Objeto</button>${i > 0 && list[i - 1] ? `<button class="btn sm" data-o="copyprev" title="Figuras, objetos, luces y su animación del plano ${esc(D.code[list[i - 1].id] || 'anterior')}; la cámara de este plano no cambia">Copiar escena anterior</button>` : ''}</div>`;
      else h = ob.kind === 'actor' ? actorPanel(ob, p) : ob.kind === 'gente' ? gentePanel(ob, p) : propPanel(ob, p);
    } else if (E.tab === 'cam') h = camPanel(st);
    else if (E.tab === 'esc') h = scenePanel();
    else if (E.tab === 'luz') h = lightPanel(st);
    else if (E.tab === 'shot') {
      const f = E.form;
      const paraOpts = sel => { let o = ''; for (let i = s.p0; i < s.p1; i++) { const p = P.paras[i]; const t = (p.t === 'c' ? p.x.toUpperCase() : p.x).slice(0, 60); o += `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(PTYPE_LABEL[p.t] || '')}: ${esc(t)}</option>`; } return o; };
      h = `<div class="grid2">
          <label class="fld"><span>Tamaño</span><select data-f="size">${SIZES.map(([k, n]) => `<option value="${k}" ${k === f.size ? 'selected' : ''}>${k} · ${n}</option>`).join('')}</select></label>
          <label class="fld"><span>Ángulo</span><select data-f="angle">${ANGLES.map(a => `<option ${a === f.angle ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
          <label class="fld"><span>Movimiento</span><select data-f="move">${MOVES.map(a => `<option ${a === f.move ? 'selected' : ''}>${a}</option>`).join('')}${MOVES.includes(f.move) ? '' : `<option selected>${esc(f.move)}</option>`}</select></label>
          <label class="fld"><span>Soporte</span><select data-f="support"><option value=""></option>${SUPPORTS.map(a => `<option ${a === f.support ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
          <label class="fld" title="Para la hoja de llamado y el reporte de sonido: se graba sonido directo, solo ambiente o nada (MOS)"><span>Sonido</span><select data-f="snd">${SND_OPTS.map(([k, t]) => `<option value="${k}" ${(f.snd || '') === k ? 'selected' : ''}>${k ? t : 'Sin definir'}</option>`).join('')}</select></label></div>
        ${E.custom ? '<p class="hint" style="margin:0">Para aplicar estos datos a la escena 3D: «Reencuadrar» o «Animar» en Cámara.</p>' : ''}${masterHint()}
        <label class="fld"><span>Descripción del plano</span><textarea data-f="desc" rows="2" placeholder="Qué se ve y qué pasa en el cuadro">${esc(f.desc)}</textarea></label>
        <div class="grid2"><label class="fld"><span>Desde</span><select data-f="p0">${paraOpts(f.p0)}</select></label><label class="fld"><span>Hasta</span><select data-f="p1">${paraOpts(f.p1)}</select></label></div>
        <label class="fld"><span>Notas (sonido, arte, continuidad)</span><textarea data-f="notes" rows="2">${esc(f.notes)}</textarea></label>
        <label class="opt" style="padding:8px 10px" title="Lleva el sello «Rodado» en el storyboard y en la hoja de script"><input type="checkbox" data-f="done" ${f.done ? 'checked' : ''}><span><b>Rodado</b></span></label>`;
    } else {
      const D2 = E.draw, I = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
      const TOOLS = [['pen', 'Lápiz', '<path d="M4 20h4L19 9l-4-4L4 16z"/>'], ['line', 'Línea', '<path d="M5 19 19 5"/>'], ['arrow', 'Flecha', '<path d="M5 19 19 5M10 5h9v9"/>'], ['rect', 'Marco', '<rect x="4" y="6" width="16" height="12" rx="1.5"/>'], ['erase', 'Borrador', '<path d="M8 20h12M5.5 14.5 14 6l5 5-8.5 8.5H8z"/>']];
      h = `<div class="fp-sh"><span>Dibujo sobre la viñeta</span><button class="btn sm primary" data-d="done">Listo</button></div>
        <div class="dr-row" role="toolbar" aria-label="Herramientas">${TOOLS.map(([k, n, d]) => `<button class="icbtn" data-d="tool" data-v="${k}" aria-pressed="${ea(D2.tool === k)}" title="${n}" aria-label="${n}">${I(d)}</button>`).join('')}<i class="dr-sep"></i>${[[2, 'Fino', 3], [4, 'Medio', 6], [8, 'Grueso', 10]].map(([v, n, dd]) => `<button class="icbtn dr-w" data-d="w" data-v="${ea(v)}" aria-pressed="${ea(D2.w == v)}" title="${n}" aria-label="${n}"><i style="--d:${ea(dd)}px"></i></button>`).join('')}</div>
        <div class="dr-row">${['#C8382C', '#2C47CF', '#1C8448', '#2B2B2B', '#FFFFFF'].map(c => `<button class="sw" style="--sw:${ea(c)}" data-d="color" data-v="${ea(c)}" aria-pressed="${ea(D2.color === c)}" aria-label="Color ${ea(colorName(c))}"></button>`).join('')}<i class="dr-sep"></i>
          <button class="icbtn" data-d="undo" title="Deshacer el último trazo" aria-label="Deshacer trazo">${I('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>')}</button>
          <button class="icbtn danger" data-d="clear" title="Borrar todo el dibujo" aria-label="Borrar dibujo">${SXI.trash}</button>
          <button class="icbtn" data-d="guides" aria-pressed="${ea(!!E.gd.size)}" aria-haspopup="menu" title="Líneas guía: tercios, cuadrícula, centro, diagonales, proporción áurea…" aria-label="Líneas guía">${I('<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M9.2 5v14M14.8 5v14M3.5 9.7h17M3.5 14.3h17"/>')}</button>
          <button class="icbtn" data-d="ref" title="${ea(E.ref ? 'Cambiar la imagen de referencia' : 'Imagen de referencia (p. ej. una foto de locación): detrás de las figuras o delante de la escena')}" aria-label="Imagen de referencia">${I('<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>')}</button>
          ${E.ref ? `<button class="icbtn danger" data-d="noref" title="Quitar la imagen y volver al 3D" aria-label="Volver al 3D">${SXI.x}</button>` : ''}</div>
        ${E.ref ? `<div class="dr-ref"><span>Imagen de referencia</span><div class="seg" role="group" aria-label="Lugar de la imagen de referencia">
          <button data-d="refpos" data-v="back" aria-pressed="${ea(E.refBack)}" title="La foto es el fondo: las figuras y los objetos se ven encima, con sus sombras">${I('<rect x="7.5" y="3.5" width="13" height="11" rx="1.5"/><path d="M3.5 9.5v9.5a1.5 1.5 0 0 0 1.5 1.5h9.5"/>')}Detrás</button>
          <button data-d="refpos" data-v="front" aria-pressed="${ea(!E.refBack)}" title="La foto tapa la escena 3D">${I('<rect x="3.5" y="9.5" width="13" height="11" rx="1.5"/><path d="M7.5 6.5V5A1.5 1.5 0 0 1 9 3.5h10A1.5 1.5 0 0 1 20.5 5v10a1.5 1.5 0 0 1-1.5 1.5h-1.5"/>')}Delante</button></div></div>` : ''}`;
    }
    P2.innerHTML = h;
  }
  const panelEl = $m('#sxPanel');
  const selOb = () => E.s3.objs.find(o => o.id === E.sel);
  /* quiet: aplica sin rehacer el panel (mientras se arrastra el selector de color) */
  function setLook(ob, f, v, quiet) {
    const bound = ob.el && P.elements[ob.el];
    if (!bound) { if (!E.gesture) snapshot(); E.custom = true; }
    const tgt = bound ? P.elements[ob.el] : ob;
    const lk = tgt.look = { ...(tgt.look || {}), [f]: v };
    if (f === 'body') {
      const B = S3_BODY[v];
      lk.hairStyle = B.hair; if (!bound || !lk.hairSet || B.faceless) lk.hair = B.hc;
      // el extra lleva su piel gris; al volver a un cuerpo con rostro, piel natural
      if (B.faceless) lk.skin = B.skin;
      else if (lk.skin === S3_BODY.extra.skin) lk.skin = S3_SKIN[2];
    }
    if (bound && (f === 'hair' || f === 'hairStyle')) lk.hairSet = true;
    if (f === 'build') delete lk.bw;
    if (!bound && f === 'color') ob.color = v;
    if (bound) E.lookDirty = true;
    stCache = null;
    if (quiet) { redraw(); return; }
    if (!bound) commit();
    panel(); redraw();
  }
  function resetProps(ob) {
    const bound = ob.el && P.elements[ob.el];
    if (!bound) { snapshot(); E.custom = true; }
    const tgt = bound ? P.elements[ob.el] : ob;
    tgt.look = { ...(tgt.look || {}) };
    for (const [f] of S3_PROP) delete tgt.look[f];
    delete tgt.look.bw; tgt.look.build = 'media';   // la estatura no se toca: suele venir de las medidas reales
    if (bound) E.lookDirty = true; else commit();
    stCache = null; panel(); redraw();
  }
  panelEl.addEventListener('toggle', e => { const c = e.target.classList; if (!c) return; if (e.target.dataset.more === 'cam') E.camMore = e.target.open; else if (c.contains('lx-eq')) E.eqOpen = e.target.open; else if (c.contains('figlook')) E.lookOpen = e.target.open; else if (c.contains('joints')) E.jointsOpen = e.target.open; }, true);
  panelEl.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.lkc) { const ob = selOb(); if (ob) { el.parentElement.style.setProperty('--sw', el.value); setLook(ob, el.dataset.lkc, el.value, true); } return; }
    if (el.dataset.opc) { const ob = selOb(); if (ob) { el.parentElement.style.setProperty('--sw', el.value); ob.paint = el.value; redraw(); } return; }
    // el color del vehículo a elección: se ve mientras se elige; al soltar queda (y se puede deshacer)
    if (el.dataset.cpc) { if (E.carC0 === undefined) E.carC0 = (E.s3.car || {}).c || null; el.parentElement.style.setProperty('--sw', el.value); carSet(E.s3, 'c', el.value); redraw(); return; }
    if (el.type !== 'range') return;
    el.style.setProperty('--p', rangePct(+el.value, +el.min, +el.max) + '%');
    const out = el.parentElement.querySelector('output'), key = el.dataset.k, v = +el.value;
    if (out) out.textContent = (el.step < 1 ? v.toFixed(el.step < .1 ? 2 : 1) : v) + (el.dataset.u || '');
    if (key === 'shake') { snapshot(); E.s3.shake = v; E.custom = true; edited(); return; }
    if (key === 'sunAz') { snapshot(); E.s3.sunAz = v; E.custom = true; edited(); return; }
    if (key === 'aimTilt') { snapshot(); E.s3.aimTilt = v; E.custom = true; edited(); return; }
    if (key === 'esc') { const k = escFromSlider(v); if (out) out.textContent = Math.round(k * 100) + ' %'; escSet(k); return; }   // lote W
    if (key.startsWith('lk:')) {
      const ob = selOb(); if (!ob) return;
      if (ob.el && P.elements[ob.el]) { const el = P.elements[ob.el]; el.look = { ...(el.look || {}), [key.slice(3)]: v }; E.lookDirty = true; }
      else { if (!E.gesture) snapshot(); E.custom = true; ob.look = { ...(ob.look || {}), [key.slice(3)]: v }; }
      stCache = null; redraw(); return;
    }
    if (key.startsWith('ls:')) { snapshot(); E.s3.light = { mode: 'sim', amb: .22, rig: true, ...(E.s3.light || {}), [key.slice(3)]: v }; E.custom = true; edited(); return; }
    const k = editKey();
    if (key.startsWith('j:')) { const o = k.o[E.sel]; o.j = { ...(o.j || {}), [key.slice(2)]: v }; }
    else if (key.startsWith('o:')) k.o[E.sel][key.slice(2)] = v;
    else if (key === 'rot') k.o[E.sel].rot = v;
    else k.cam[key] = v;
    edited();
  });
  panelEl.addEventListener('change', e => onPanelChange(e.target));
  function onPanelChange(el) {
    if (el.dataset.c === 'lensp') { const k = editKey(); k.cam.lens = +el.value; edited(); commit(); return; }
    // el sensor es del plano entero (todas sus claves); el lente no cambia: cambia lo que abarca
    if (el.dataset.c === 'sensor') { snapshot(); if (el.value && el.value !== 'ff') E.s3.sensor = el.value; else delete E.s3.sensor; E.custom = true; stCache = null; E.tmp = null; redraw(); commit(); return; }
    if (el.dataset.lkc) { const ob = selOb(); if (ob) setLook(ob, el.dataset.lkc, el.value); return; }
    if (el.dataset.opc) { const ob = selOb(); if (ob) { snapshot(); ob.paint = el.value; E.custom = true; commit(); panel(); redraw(); } return; }
    if (el.dataset.cpc) { if (E.carC0 !== undefined) carSet(E.s3, 'c', E.carC0); delete E.carC0; snapshot(); carSet(E.s3, 'c', el.value); E.custom = true; commit(); panel(); redraw(); return; }
    if (el.dataset.k === 'esc') { escSet(escFromSlider(+el.value), true); return; }   // lote W · la escala del escenario
    if (el.type === 'range') { commit(); return; }
    if (el.dataset.lks) { const ob = selOb(); if (ob && ob.el) { const e2 = P.elements[ob.el]; e2.look = { ...(e2.look || {}), sizes: { ...((e2.look || {}).sizes || {}), [el.dataset.lks]: el.value.trim() } }; E.lookDirty = true; } return; }
    if (el.id === 'trM') { E.trM = clamp(num(el.value) || 2, .1, 50); return; }
    if (el.dataset.ls) {
      snapshot(); E.custom = true;
      const L = E.s3.light = { mode: 'previs', amb: .22, rig: true, wb: 4300, ...(E.s3.light || {}) };
      if (el.dataset.ls === 'sim') L.mode = el.checked ? 'sim' : 'previs';
      if (el.dataset.ls === 'rig') L.rig = el.checked;
      if (el.dataset.ls === 'wb') L.wb = +el.value;
      if (el.dataset.ls === 'meter') L.meter = el.checked;
      if (el.dataset.ls === 'fc') L.fc = el.checked;
      commit(); redraw(); return;
    }
    if (el.dataset.lx) {
      snapshot(); E.custom = true;
      const L = E.s3.light = { mode: 'sim', amb: .22, rig: true, wb: 4300, ...(E.s3.light || {}) }, cur = luzSolve(E.s3, ed.state()).X, k = el.dataset.lx;
      const X = { iso: cur.iso, sh: cur.sh, f: cur.f, nd: cur.nd, auto: cur.auto };
      if (k === 'auto') X.auto = el.checked;
      else { X[k] = +el.value; if (k === 'f') X.auto = false; }
      L.exp = X;
      commit(); redraw(); return;
    }
    if (el.dataset.o) {
      const ob = selOb(); if (!ob) return;
      snapshot(); E.custom = true;
      const f = el.dataset.o;
      if (f === 'el') { ob.el = el.value || null; ob.name = el.value ? P.elements[el.value].name : 'Figura'; }
      if (f === 'kind') { ob.kind = el.value; delete ob.paint; if ((S3_PROPS[el.value] || {}).wall && E.s3.set === 'int') { const k = editKey(); snapToWall(E.s3, k.o[ob.id]); edited(); } if (!(S3_PROPS[el.value] || {}).small) delete ob.hold; }
      if (f === 'x' || f === 'z') { const k = editKey(); k.o[ob.id][f] = num(el.value); edited(); }
      if (f === 'rot') { const k = editKey(); k.o[ob.id].rot = Math.round(num(el.value)); edited(); }
      if (f === 'dmodel') ob.model = el.value;
      if (f === 'gn-n' || f === 'gn-sit') {
        if (f === 'gn-n') ob.n = clamp(Math.round(num(el.value)) || ob.n || 20, 1, GENTE_MAX); else ob.sit = el.value;
        genteNorm(ob); commit(); panel(); redraw(); return;
      }
      if (f === 'hold') { if (el.value) ob.hold = { a: el.value, at: (ob.hold && ob.hold.at) || (ob.kind === 'guitarra' ? 'pecho' : 'R') }; else delete ob.hold; }
      if (f === 'lname') ob.name = el.value.trim() || ob.name;
      if (f === 'ltype') { ob.type = el.value; const L = S3_LIGHTS[el.value]; E.s3.keys.forEach(k => { if (k.o[ob.id]) Object.assign(k.o[ob.id], { ang: L.ang, tilt: L.tilt, h: L.h }); }); if (el.value === 'sol' || el.value === 'practica') ob.aim = el.value === 'sol' ? ob.aim : null; }
      if (f === 'laim') ob.aim = el.value || null;
      if (f === 'lfx') {
        const F = S3_FIXTURES[el.value]; if (!F) return;
        if (F.type !== ob.type) {
          ob.type = F.type; const L = S3_LIGHTS[F.type];
          E.s3.keys.forEach(k => { if (k.o[ob.id]) Object.assign(k.o[ob.id], { ang: L.ang, tilt: L.tilt, h: L.h }); });
          if (F.type === 'practica') ob.aim = null;
          if (F.type !== 'fresnel' && F.type !== 'panel') delete ob.mod;
        }
        ob.fx = el.value;
        E.s3.keys.forEach(k => { const q = k.o[ob.id]; if (!q) return; if (F.k) q.k = clamp(q.k || F.k[0], F.k[0], F.k[1]); if (F.beam) q.ang = clamp(q.ang || F.ref, F.beam[0], F.beam[1]); });
        if (!isBoard(ob) && /^(Luz|Fresnel|Panel|Práctica|Sol|Rebote|Bandera)/.test(ob.name || '')) ob.name = F.name.split(' (')[0];
      }
      if (f === 'lmod') { if (el.value === 'no') delete ob.mod; else ob.mod = el.value; }
      commit(); redraw(); return;
    }
    if (el.dataset.c === 'set') {
      if (el.value === 'plano' && !Object.keys(P.plans || {}).length) { el.value = setCur(); importPlan(); return; }
      if (el.value === 'modelo:+') { el.value = setCur(); import3d(); return; }
      if (el.value === 'modelo:+c') { el.value = setCur(); build3d(); return; }   // lote W · «Construir uno nuevo…»
      pickSet(el.value, true); return;
    }
    if (el.dataset.c === 'atm') { snapshot(); E.s3.atm = el.value; delete E.s3.sunAz; E.custom = true; commit(); redraw(); return; }
    if (el.dataset.c === 'rain') { snapshot(); if (el.checked) E.s3.rain = true; else delete E.s3.rain; E.custom = true; commit(); redraw(); return; }
    if (el.dataset.c === 'planId') { snapshot(); E.s3.planId = el.value; E.custom = true; commit(); redraw(); plan.fit(); return; }
    if (el.dataset.c === 'wild') { snapshot(); E.s3.wildWalls = el.checked; E.custom = true; commit(); redraw(); return; }
    if (el.dataset.c === 'planFloor') { snapshot(); E.s3.planFloor = el.checked; E.custom = true; commit(); redraw(); return; }
    if (el.dataset.c === 'planH') { const pl = planOf(E.s3); if (pl) { pl.wallH = clamp(num(el.value) || 2.6, 2, 8); pl.v = Date.now(); changed('data'); stCache = null; redraw(); } return; }
    if (['rw', 'rd', 'rh'].includes(el.dataset.c)) {
      snapshot(); E.custom = true;
      const R = E.s3.room = roomOf(E.s3), R0 = { ...R };
      const f = { rw: 'w', rd: 'd', rh: 'h' }[el.dataset.c];
      R[f] = clamp(num(el.value) || R[f], f === 'h' ? 2 : 1, f === 'h' ? 12 : 40);
      // los muebles del ambiente se vuelven a acomodar contra los muros nuevos
      if (ROOM_KINDS[R.kind]) roomRelayout(E.s3);
      // las puertas y ventanas siguen pegadas a su muro
      for (const ob of E.s3.objs) if ((S3_PROPS[ob.kind] || {}).wall) E.s3.keys.forEach(k => { if (k.o[ob.id]) { const p = k.o[ob.id], hw = R.w / 2, hd = R.d / 2; if (p.rot === 0) p.z = -hd; else if (p.rot === 180) p.z = hd; else if (p.rot === 90) p.x = -hw; else if (p.rot === -90) p.x = hw; } });
      commit(); redraw(); plan.fit(); return;
    }
    if (el.dataset.c === 'dof' || el.dataset.c === 'dofF' || el.dataset.c === 'focus') {
      snapshot(); E.custom = true;
      if (el.dataset.c === 'dof') { if (el.checked) E.s3.dof = true; else delete E.s3.dof; }
      // el diafragma es el mismo de Luz › Exposición (elegirlo a mano quita el automático)
      if (el.dataset.c === 'dofF') { const L = E.s3.light = { mode: 'previs', amb: .22, rig: true, wb: 4300, ...(E.s3.light || {}) }; L.exp = { ...luzExp(E.s3), f: +el.value, auto: false }; }
      if (el.dataset.c === 'focus') { if (el.value) E.s3.focus = el.value; else delete E.s3.focus; }
      commit(); redraw(); panel(); return;
    }
    if (el.dataset.c === 'aim') {
      snapshot(); E.custom = true;
      if (!el.value) freeCam(); else E.s3.aim = el.value;
      commit(); redraw(); return;
    }
    if (el.dataset.f) {
      const f = el.dataset.f;
      E.form[f] = f === 'done' || f === 'names' ? el.checked : (f === 'p0' || f === 'p1') ? +el.value : el.value;
      if (f === 'names') { drawViewport(); return; }
      // sin puesta propia se vuelve a armar sola (desde el máster de la escena si lo sigue; con sus personajes)
      if (['size', 'angle', 'move'].includes(f) && !E.custom) { const mo = masterOf({ ...sh, s3: null }); E.s3 = s3Auto({ ...sh, ...E.form, lens: '', chars: mo ? sh.chars : actorEls(), s3: null }); stCache = null; redraw(); }
      if (f === 'size' || f === 'angle' || f === 'move') panel();
      return;
    }
  }
  function importPlan() {
    openPlanImporter({ loc: s.loc, name: titleCase(s.loc) }, (pid, applyLoc) => {
      snapshot(); E.custom = true; E.s3.set = 'plano'; E.s3.planId = pid; s3CamInside(E.s3);
      if (applyLoc) for (const o of Object.values(P.shots)) { const os = sceneOfKey(o.sc); if (o.id !== id && o.s3 && os && os.loc === s.loc) { o.s3.set = 'plano'; o.s3.planId = pid; s3CamInside(o.s3); } }
      changed('data'); commit(); stCache = null; redraw(); plan.fit(); panel();
      toast(`Plano «${P.plans[pid].name}» importado con ${P.plans[pid].rects.length} tramos de muro.`);
    });
  }
  /* un escenario 3D de la locación (escenarios-3d.js): nuevo, o ajustar el que se usa (edit: su id) */
  function import3d(edit) {
    openSet3dImporter({ loc: s.loc, name: titleCase(s.loc), int: s.ie !== 'EXT', edit }, (sid, applyLoc) => {
      snapshot(); E.custom = true;
      useSet3d(E.s3, sid);
      if (applyLoc) for (const o of Object.values(P.shots)) { const os = sceneOfKey(o.sc); if (o.id !== id && o.s3 && os && os.loc === s.loc) useSet3d(o.s3, sid); }
      if (typeof THUMB3 !== 'undefined') THUMB3.clear();
      changed('data'); commit(); stCache = null; redraw(); plan.fit(); panel(); paintTop();
      toast(edit ? `Escenario «${P.sets3d[sid].n}» ajustado.` : `Escenario «${P.sets3d[sid].n}» importado${applyLoc ? ': los planos de esta locación lo usan' : ''}.`);
    });
  }
  // el plano pasa al escenario 3D; sus figuras siguen donde estaban (el centro de la escena es el punto de la acción)
  function useSet3d(s3, sid) {
    const hadRoom = s3.objs.some(o => o.room);
    s3.set = 'modelo'; s3.set3d = sid; delete s3.planId;
    if (hadRoom) roomFurnish(s3, '');
    bsLights(s3, P.sets3d[sid]);   // lote W · las luces de un escenario construido entran al plano (las de otro se van)
  }
  /* lote W · el constructor de escenarios: uno nuevo para la locación de este plano o editar el que se usa (edit: su id) */
  function build3d(edit) {
    openSetBuilder({ id: edit, loc: s.loc, name: titleCase(s.loc), int: s.ie !== 'EXT' }, (sid, applyLoc) => {
      snapshot(); E.custom = true;
      useSet3d(E.s3, sid);
      if (applyLoc) for (const o of Object.values(P.shots)) { const os = sceneOfKey(o.sc); if (o.id !== id && o.s3 && os && os.loc === s.loc) useSet3d(o.s3, sid); }
      stCache = null; commit(); redraw(); plan.fit(); panel(); paintTop();
    });
  }
  /* ---------- lote W · la escala del escenario ----------
     La guarda el escenario, no el plano: el importado o construido (P.sets3d), el plano de planta (P.plans) y la calle,
     los jardines y los paisajes, por locación (P.envEsc). Todos los planos que lo usan lo ven del mismo tamaño; las
     figuras no cambian. La barra va de 25 % a 400 % con el 100 % al medio (es logarítmica) */
  function escTarget() {
    const s3 = E.s3, d3 = s3.set === 'modelo' ? set3dOf(s3) : null, pl = s3.set === 'plano' ? planOf(s3) : null;
    const put = o => v => { if (v === 1) delete o.esc; else o.esc = v; };
    if (d3) return { v: escOf(d3), put: put(d3) };
    if (pl) return { v: escOf(pl), put: put(pl) };
    if (typeof ENV_ESC_SETS !== 'undefined' && ENV_ESC_SETS.includes(s3.set)) {
      const k = envEscKey(s.loc, s3.set);
      return { v: envEscOf(s3), put: v => { const o = P.envEsc = P.envEsc || {}; if (v === 1) delete o[k]; else o[k] = v; if (!Object.keys(o).length) delete P.envEsc; } };
    }
    return null;
  }
  // (cerca de un número redondo, se queda en él: 150 %, no 149 %)
  const escFromSlider = v => { if (Math.abs(v) < .04) return 1; const k = Math.pow(2, v), r = Math.round(k * 20) / 20; return escClamp(Math.abs(k - r) < .012 ? r : k); };
  function escRow() {
    const T = escTarget(); if (!T) return '';
    const pc = Math.round(T.v * 100), lv = Math.round(Math.log2(T.v) * 100) / 100;
    return `<label class="rr"><span>Escala</span><input type="range" min="-2" max="2" step="0.01" value="${ea(lv)}" data-k="esc" style="--p:${ea(rangePct(lv, -2, 2))}%" aria-label="Escala del escenario" aria-valuetext="${ea(pc + ' %')}" ${UI.readOnly ? 'disabled' : ''}><output class="tnum">${pc} %</output></label>
      <div class="esc-row"><span class="hint esc-h">${pc !== 100 ? 'En todos los planos con este escenario. Las figuras no cambian.' : ''}</span><button class="btn sm ghost" data-c="escreset" ${pc === 100 || UI.readOnly ? 'disabled' : ''}>Tamaño original</button></div>`;
  }
  /* mientras se arrastra se ve; al soltar queda (un paso del proyecto, con «Deshacer» en el aviso) */
  function escSet(v, done) {
    const T = escTarget(); if (!T || UI.readOnly) return;
    v = escClamp(v);
    if (E.esc0 === undefined) { E.esc0 = T.v; histNote('Escala del escenario', null, 'board'); }
    T.put(v); stCache = null; redraw(); plan.draw();
    if (!done) return;
    const v0 = E.esc0; delete E.esc0;
    plan.fit(); panel();
    if (v0 === v) return;
    changed('data');
    const back = () => { T.put(v0); changed('data'); if (EDT === E) { stCache = null; redraw(); plan.fit(); panel(); } else render(); };
    toast(v === 1 ? 'El escenario volvió a su tamaño original.' : `Escenario al ${Math.round(v * 100)} %.`, 5000, { label: 'Deshacer', fn: back });
  }
  /* quitar el escenario del proyecto: los planos que lo usan vuelven al escenario que dice el guion */
  function del3d() {
    const d3 = set3dOf(E.s3); if (!d3) return;
    const users = Object.values(P.shots).filter(o => o.s3 && o.s3.set === 'modelo' && o.s3.set3d === d3.id);
    // también los planos sin cambios de la locación, que lo traen solos
    const n = new Set([id, ...users.map(o => o.id), ...Object.values(P.shots).filter(o => !o.s3 && set3dForLoc((sceneOfKey(o.sc) || {}).loc) === d3.id).map(o => o.id)]).size;
    const built = bsIs(d3);   // lote W · un escenario construido son solo datos: quitarlo se puede deshacer
    confirmBox(built ? 'Quitar el escenario' : 'Quitar el escenario 3D', `«${esc(d3.n)}» se quita del proyecto${n > 1 ? ` y los ${n} planos que lo usan vuelven al escenario del guion` : ''}.${built ? '' : ' No se puede deshacer.'}`, 'Quitar', () => {
      if (built) histNote(`Quitar el escenario «${d3.n}»`, null, 'board');
      snapshot(); E.custom = true;
      const back = s3x => { const os = Object.values(P.shots).find(o => o.s3 === s3x), sc0 = os ? sceneOfKey(os.sc) : s; s3x.set = envFromScene(sc0).set || 'ext'; delete s3x.set3d; };
      for (const o of users) if (o.s3 !== E.s3) back(o.s3);
      back(E.s3);
      delete P.sets3d[d3.id];
      for (const [l, v] of Object.entries(P.locSet3d || {})) if (v === d3.id) delete P.locSet3d[l];
      if (!bsIs(d3)) for (const k of [m3Key('s', d3.id), set3dPicKey(d3.id)]) { delete FRAMES[k]; IMGS.delete(k); Store.saveFrame(P.id, k, null).catch(() => { }); }
      for (const o of users) bsLights(o.s3, null); bsLights(E.s3, null);   // lote W · las luces de un escenario construido
      const e = M3.tpl.get(m3Key('s', d3.id)); M3.tpl.delete(m3Key('s', d3.id));
      if (R3.sets.modelo) { R3.sets.modelo.userData.key = ''; if (R3.sets.modelo.userData.hold) { R3.sets.modelo.remove(R3.sets.modelo.userData.hold); R3.sets.modelo.userData.hold = null; } }
      if (e && e.t) m3Dispose(e.t);
      if (typeof THUMB3 !== 'undefined') THUMB3.clear();
      changed('data'); commit(); stCache = null; redraw(); plan.fit(); panel(); paintTop();
      if (built) toastUndo(`Escenario «${d3.n}» quitado del proyecto.`); else toast(`Escenario «${d3.n}» quitado del proyecto.`);
    });
  }
  /* congela la orientación actual en cada clave y suelta el seguimiento */
  function freeCam() {
    E.s3.keys.forEach(k => { const sk = s3At(E.s3, k.t); k.cam.yaw = round2(sk.cam.yaw); k.cam.pitch = round2(sk.cam.pitch); });
    E.s3.aim = null;
  }
  function lightSpot(type) {
    const st = ed.state(), c = st.cam;
    const a = E.s3.objs.find(o => o.id === E.sel && o.kind === 'actor') || E.s3.objs.find(o => o.kind === 'actor');
    const L = S3_LIGHTS[type];
    if (type === 'sol') return { pos: { x: c.x, z: c.z - 6, rot: Math.round(c.yaw + 150), tilt: 40 }, aim: null };
    if (a && st.o[a.id]) {
      // rebote: del lado del relleno; bandera: entre la luz principal y la figura
      const p = st.o[a.id], toCam = Math.atan2(c.x - p.x, c.z - p.z) + rad(type === 'practica' ? -70 : type === 'rebote' ? -50 : 40);
      const d = type === 'practica' ? 1.4 : type === 'rebote' ? 1.5 : type === 'bandera' ? 1.1 : 2.6, x = p.x + Math.sin(toCam) * d, z = p.z + Math.cos(toCam) * d;
      return { pos: { x, z, rot: deg(Math.atan2(p.x - x, p.z - z)), h: L.h }, aim: type === 'practica' ? null : a.id };
    }
    return { pos: { x: c.x - Math.sin(rad(c.yaw)) * 3 + 1.5, z: c.z - Math.cos(rad(c.yaw)) * 3, rot: Math.round(c.yaw + 180) }, aim: null };
  }
  panelEl.addEventListener('click', e => { const b = e.target.closest('button') || e.target.closest('.ly[data-l]'); if (b) onPanelBtn(b); });
  panelEl.addEventListener('keydown', e => { const r = e.target.closest && e.target.closest('.ly[data-l]'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPanelBtn(r); } });
  /* agregar una luz: el menú del panel Luz y el de la planta a pantalla completa */
  function lightMenu(b) {
    return popover(b, `<div class="menu">${Object.entries(S3_LIGHTS).map(([k, v]) => `<button data-l="add" data-v="${k}">+ ${v.name}</button>`).join('')}<button data-l="3p">Esquema de tres puntos</button></div>`, q => { q.classList.add('pop-sx'); q.addEventListener('click', e => { const x = e.target.closest('button'); if (!x) return; closePop(); onPanelBtn(x, true); }); });
  }
  function onPanelBtn(b, fromMenu) {
    if (b.dataset.act === 'tip-x') { ACT['tip-x'](b); return; }
    if (b.dataset.o === 'accmenu' && selOb()) { if (!E.menuOpen) panelMenu(b, 'pop-acc', live => (live ? '' : '<div class="pose-h">Vestuario y accesorios</div><div class="sxm-body">') + accMenuHTML() + (live ? '' : '</div>'), { live: true, close: x => x.dataset.o === 'accnew' || x.dataset.o === 'accedit' }); return; }
    if (b.dataset.o === 'objmenu' && selOb()) { if (!E.menuOpen) panelMenu(b, 'pop-obj', live => (live ? '' : '<div class="sxm-body">') + objMenuHTML() + (live ? '' : '</div>'), { close: x => x.dataset.o === 'aimme' || x.dataset.o === 'del' }); return; }
    if (b.dataset.l === 'addmenu') {
      if (E.menuOpen) return;
      lightMenu(b);
      return;
    }
    if (b.dataset.l === 'meter' || b.dataset.l === 'fc') { snapshot(); E.custom = true; const L = E.s3.light = { mode: 'previs', amb: .22, rig: true, wb: 4300, ...(E.s3.light || {}) }; if (b.dataset.l === 'meter') L.meter = L.meter === false; else L.fc = !L.fc; commit(); redraw(); return; }
    if (b.dataset.l === 'rig') { snapshot(); E.custom = true; E.s3.light = { mode: 'previs', amb: .22, rig: true, wb: 4300, ...(E.s3.light || {}) }; E.s3.light.rig = E.s3.light.rig === false; commit(); redraw(); return; }
    if (b.dataset.d === 'w') { E.draw.w = +b.dataset.v; panel(); return; }
    if (b.dataset.d === 'guides') { guideMenu(b); return; }
    if (b.dataset.o === 'addfig') { addFig({ currentTarget: b }); return; }
    if (b.dataset.o === 'addobj') { addObj({ currentTarget: b }); return; }
    if (b.dataset.o === 'copyprev') { copyPrev(); return; }
    if (b.dataset.o === 'refollow') { refollow(); return; }
    if (b.dataset.d === 'done') { E.tab = 'sel'; panel(); redraw(); return; }
    const ob = selOb();
    if (b.dataset.o === 'exprmenu' && ob) { if (!E.exprOpen) openExprMenu(ob, b); return; }
    if (ob && ob.kind === 'gente' && /^gn-/.test(b.dataset.o || '')) {
      snapshot(); E.custom = true;
      const o = b.dataset.o, v = b.dataset.v;
      if (o === 'gn-nq') ob.n = +v;
      if (o === 'gn-dens') ob.dens = v;
      if (o === 'gn-ropa') { if (v) ob.ropa = v; else delete ob.ropa; }
      if (o === 'gn-mix') ob.seed = (Math.floor(Math.random() * 99991) + 1);
      genteNorm(ob); commit(); panel(); redraw(); return;
    }
    if (b.dataset.lk && ob) { setLook(ob, b.dataset.lk, b.dataset.v); return; }
    if (b.dataset.o === 'propreset' && ob) { resetProps(ob); return; }
    if (b.dataset.phm != null && ob && ob.el) { const e2 = P.elements[ob.el]; if (e2.look && e2.look.photo) { e2.look = { ...e2.look, photo: { ...e2.look.photo, mode: b.dataset.v } }; E.lookDirty = true; stCache = null; panel(); redraw(); } return; }
    if (b.dataset.o === 'ficha' && ob && ob.el) { const e2 = P.elements[ob.el]; openFicha(e2.id, ok => { if (ok) E.looks0[e2.id] = e2.look ? JSON.parse(JSON.stringify(e2.look)) : null; stCache = null; panel(); redraw(); }); return; }
    if (b.dataset.o === 'photos' && ob && ob.el) { const e2 = P.elements[ob.el]; openPhotoDialog(e2, () => { E.looks0[e2.id] = e2.look ? JSON.parse(JSON.stringify(e2.look)) : null; stCache = null; panel(); redraw(); }); return; }
    if (b.dataset.l === 'list') { lightList(b); return; }
    if (b.dataset.o === 'posemenu' && ob) { if (E.poseOpen !== ob.id) openPoseMenu(ob.id, b); return; }
    if (b.dataset.o === 'facedraw' && ob) { exprEdit(b, ob, 'new'); return; }
    if (b.dataset.o === 'vesttab') { E.vestTab = b.dataset.v; return; }
    if (b.dataset.o === 'lookopen') { E.lookOpen = !E.lookOpen; panel(); return; }
    if (b.dataset.o === 'vestadd' && ob) {
      // tocar una prenda puesta la quita; si no, se pone (en lugar de la que ocupa su lugar)
      const k = b.dataset.v, L0 = lookOf(ob).acc || [], on = L0.some(a => a.preset === k);
      E.vestTab = 'items';   // la lista sigue a la vista para poner o quitar otra
      E.lookOpen = true; setLook(ob, 'acc', on ? L0.filter(a => a.preset !== k) : vestApply(L0, [vestNew(k)], false));
      toast(`${VEST[k].name}: ${on ? 'quitado' : 'puesto'}.`);
      return;
    }
    if (b.dataset.o === 'accedit' && ob && ((lookOf(ob).acc || []).find(a => a.id === b.dataset.v) || {}).preset) { openVestEdit(fromMenu && b.isConnected ? b : $m('[data-o="accmenu"]') || b, ob, b.dataset.v); return; }
    if ((b.dataset.o === 'accnew' || b.dataset.o === 'accedit') && ob) {
      const lk = lookOf(ob), cur = b.dataset.o === 'accedit' ? (lk.acc || []).find(a => a.id === b.dataset.v) : null;
      openAccEditor({ look: lk, acc: cur, kind: b.dataset.k, onSave: a => {
        const list = (lookOf(ob).acc || []).filter(x => x.id !== a.id); list.push(a);
        E.lookOpen = true; setLook(ob, 'acc', list);
        toast(cur ? `«${a.name}» guardado.` : `«${a.name}» agregado a ${ob.name || 'la figura'}: lo lleva en todos los planos.`);
      } });
      return;
    }
    if ((b.dataset.o === 'acchide' || b.dataset.o === 'accdel') && ob) {
      const list = (lookOf(ob).acc || []).map(a => ({ ...a })), i = list.findIndex(a => a.id === b.dataset.v); if (i < 0) return;
      if (b.dataset.o === 'accdel') { const n = list[i].name; list.splice(i, 1); toast(`«${n}» borrado.`); } else list[i].hide = !list[i].hide;
      E.lookOpen = true; setLook(ob, 'acc', list);
      return;
    }
    if (b.dataset.o === 'faceedit' && ob) { exprEdit(b, ob, 'cur'); return; }
    if (b.dataset.o === 'facedel' && ob) { exprDelete(ob, b.dataset.v); return; }
    if ((b.dataset.o === 'expr' || b.dataset.o === 'pose') && ob) { const k = editKey(); k.o[ob.id][b.dataset.o] = b.dataset.v; edited(); commit(); }
    if (b.dataset.o === 'jreset' && ob) { snapshot(); E.custom = true; E.s3.keys.forEach(k => { if (k.o[ob.id]) delete k.o[ob.id].j; }); if (E.tmp && E.tmp.o[ob.id]) delete E.tmp.o[ob.id].j; commit(); redraw(); }
    if (b.dataset.o === 'paint' && ob) { snapshot(); ob.paint = b.dataset.v; E.custom = true; commit(); panel(); redraw(); }
    if (b.dataset.o === 'holdat' && ob && ob.hold) { snapshot(); ob.hold.at = b.dataset.v; E.custom = true; commit(); redraw(); }
    if (b.dataset.o === 'hset' && ob) { const k = editKey(); k.o[ob.id].h = +b.dataset.v; edited(); commit(); }
    if (b.dataset.o === 'kset' && ob) { const k = editKey(); k.o[ob.id].k = +b.dataset.v; edited(); commit(); }
    if (b.dataset.o === 'del' && ob) { snapshot(); s3DelObj(E.s3, ob.id); E.s3.objs.forEach(o => { if (o.hold && o.hold.a === ob.id) delete o.hold; if (o.aim === ob.id) o.aim = null; }); E.sel = null; E.custom = true; commit(); redraw(); }
    if (b.dataset.o === 'aimme' && ob) { snapshot(); E.s3.aim = ob.id; E.custom = true; E.tab = 'cam'; commit(); redraw(); }
    if (b.dataset.l === 'add') { snapshot(); E.custom = true; const sp = lightSpot(b.dataset.v); E.sel = s3AddLight(E.s3, b.dataset.v, sp.pos, { aim: sp.aim }); commit(); redraw(); }
    if (b.dataset.l === '3p') {
      const a = E.s3.objs.find(o => o.id === E.sel && o.kind === 'actor') || E.s3.objs.find(o => o.kind === 'actor');
      if (!a) { toast('Agrega una figura para iluminarla.'); return; }
      snapshot(); E.custom = true; E.t = 0; s3ThreePoint(E.s3, a.id, E.s3.keys[0].cam); commit(); redraw(); toast('Principal, relleno y contraluz para ' + (a.name || 'la figura') + '.');
    }
    if (b.dataset.l === 'pick') { E.sel = b.dataset.v; panel(); redraw(); }
    if (b.dataset.c === 'camab') { camSwitch(b.dataset.v); return; }
    if (b.dataset.c === 'addb') {
      snapshot(); E.custom = true; E.tmp = null; s3AddB(E.s3); commit(); camSwitch('b');
      toast('Cámara B agregada al lado de la A: muévela en la viñeta o en la planta. A y B arriba la cambian.', 4600); return;
    }
    if (b.dataset.c === 'delb') {
      snapshot(); E.tmp = null; if (E.cam === 'b') { s3SwapB(E.s3); E.cam = 'a'; }
      s3DelB(E.s3); stCache = null; commit(); redraw(); camBadge(); toast('Cámara B quitada: el plano queda con una cámara.'); return;
    }
    if (b.dataset.c === 'importplan') { importPlan(); return; }
    if (b.dataset.c === 'import3d') { import3d(); return; }
    if (b.dataset.c === 'edit3d') { const d3 = set3dOf(E.s3); if (d3) { if (bsIs(d3)) build3d(d3.id); else import3d(d3.id); } return; }
    if (b.dataset.c === 'del3d') { del3d(); return; }
    if (b.dataset.c === 'escreset') { escSet(1, true); return; }   // lote W · «Tamaño original»
    if (b.dataset.c === 'carpaint') { snapshot(); E.custom = true; carSet(E.s3, 'c', b.dataset.v); commit(); panel(); redraw(); return; }
    if (b.dataset.c === 'caminside') { snapshot(); E.custom = true; const n = s3CamInside(E.s3); commit(); redraw(); toast(n ? 'Cámara movida delante del muro; el lente se ajustó para mantener el encuadre.' : 'Ningún muro tapa a la figura.'); return; }
    if (b.dataset.c === 'free') { snapshot(); E.custom = true; freeCam(); commit(); redraw(); toast('Cámara libre: ya puedes hacer travellings sin que gire.'); }
    if (b.dataset.tr) { snapshot(); E.custom = true; const end = s3Track(E.s3, b.dataset.tr, (+b.dataset.v) * (E.trM || 2), E.dur); commit(); E.t = end.t; stCache = null; redraw(); panel(); }
    if (b.dataset.c === 'lensp') { const k = editKey(); k.cam.lens = +b.dataset.v; edited(); commit(); }
    if (b.dataset.c === 'trm') { const STEP = [.25, .5, 1, 2, 3, 5, 10, 20], i = STEP.findIndex(x => x >= (E.trM || 2) - 1e-6); E.trM = STEP[clamp((i < 0 ? STEP.length - 1 : i) + (+b.dataset.v), 0, STEP.length - 1)]; const o = $m('#trMo'); if (o) o.textContent = E.trM + ' m'; }
    // reencuadrar: en una escena con máster, del lado de su cámara (regla de los 180°) y por encima del hombro en un diálogo
    if (b.dataset.c === 'frame') { snapshot(); E.custom = true; E.t = 0; E.s3.keys = [E.s3.keys[0]]; const mo = masterOf({ ...sh, s3: null }); if (mo) s3FrameFollow(E.s3, { ...sh, ...E.form, lens: '' }, { ...camKeys(s3Of(mo))[0].cam }); else s3Frame(E.s3, E.form.size, E.form.angle, 0); s3ApplyMove(E.s3, E.form.move, E.dur, E.form.desc); s3CamInside(E.s3); commit(); redraw(); toast('Cámara recolocada.'); }
    if (b.dataset.c === 'move') {
      snapshot(); E.custom = true; E.t = 0; s3ApplyMove(E.s3, E.form.move, E.dur, E.form.desc);
      // un dolly hacia atrás no puede terminar dentro de un muro o de un edificio
      const near = E.s3.keys.length > 1 && s3CamInside(E.s3);
      commit(); redraw();
      toast(E.s3.keys.length > 1 ? 'Movimiento animado en ' + E.dur + ' s' + (near ? '; la cámara se acercó para no quedar dentro de un muro' : '') + '. Pulsa ▶.' : 'Plano fijo: sin claves.', near ? 4000 : undefined);
    }
    if (b.dataset.d === 'tool') { E.draw.tool = b.dataset.v; panel(); }
    if (b.dataset.d === 'color') { E.draw.color = b.dataset.v; if (E.draw.tool === 'erase') E.draw.tool = 'pen'; panel(); }
    if (b.dataset.d === 'undo' && E.draw.undo.length) { actx.putImageData(E.draw.undo.pop(), 0, 0); E.annoDirty = true; paintTop(); }
    if (b.dataset.d === 'clear') { E.draw.undo.push(actx.getImageData(0, 0, anC.width, anC.height)); actx.clearRect(0, 0, anC.width, anC.height); E.annoDirty = true; paintTop(); }
    if (b.dataset.d === 'noref') { E.ref = null; E.refDirty = true; panel(); redraw(); }
    if (b.dataset.d === 'refpos') { E.refBack = b.dataset.v === 'back'; panel(); redraw(); }
    if (b.dataset.d === 'ref') {
      const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*';
      fi.onchange = () => {
        const file = fi.files[0]; if (!file) return;
        const img = new Image();
        img.onload = () => {
          const [W, H] = frameDims(1024); const c = document.createElement('canvas'); c.width = W; c.height = H;
          const r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r;
          c.getContext('2d').drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
          if (!E.ref) E.refBack = true;   // una foto nueva va detrás de las figuras (se puede pasar delante)
          E.ref = imgUrl(c); E.refDirty = true; $m('#vpRef').src = E.ref; URL.revokeObjectURL(img.src); panel(); redraw();
        };
        img.src = URL.createObjectURL(file);
      };
      fi.click();
    }
  }
  const actorEls = () => [...new Set(E.s3.objs.filter(o => o.kind === 'actor' && o.el).map(o => o.el))];

  /* ---------- añadir figuras y objetos ---------- */
  const addFig = ev => {
    const inShot = new Set(actorEls());
    const opts = sceneCast(s.idx).filter(e => !inShot.has(e.id));
    const anchor = ev.currentTarget;
    popover(anchor, `<div class="menu">${opts.map(e => `<button data-el="${ea(e.id)}">${esc(e.name)}</button>`).join('')}<button data-el="">Figura genérica</button><button data-el="" data-extra="1">Extras (sin rostro)…</button></div>`, p => p.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      closePop();
      if (b.dataset.extra) { setTimeout(() => extrasForm(anchor), 0); return; }
      snapshot(); E.custom = true;
      const el = b.dataset.el ? P.elements[b.dataset.el] : null;
      const n = E.s3.objs.filter(o => o.kind === 'actor').length;
      const id = 'a' + uid();
      const st = ed.state(), c = st.cam;
      const d = 2.5;
      s3AddObj(E.s3, { id, kind: 'actor', el: el ? el.id : null, name: el ? el.name : 'Figura', color: S3_COLORS[n % S3_COLORS.length] },
        { x: round2(c.x - Math.sin(rad(c.yaw)) * d + (n % 2 ? .6 : -.6)), z: round2(c.z - Math.cos(rad(c.yaw)) * d), rot: Math.round(c.yaw), expr: 'neutral', pose: 'pie' });
      E.sel = id; E.tab = 'sel'; commit(); redraw();
    }));
  };
  /* extras: cuántos y en qué situación. Pocos (hasta 6) van como figuras sueltas completas; más, un grupo que se
     mueve entero y pierde detalle a medida que crece (figuras simples, luego siluetas) */
  const extrasForm = anchor => {
    const last = ls.get('extrasLast', { n: 12, sit: 'concierto', dens: 'normal' });
    const pp = popover(anchor, `<h5>Extras</h5><div class="gn-form">
      <label class="fld"><span>Cantidad</span><input type="number" min="1" max="${GENTE_MAX}" step="1" value="${ea(last.n)}" id="gnN" aria-label="Cantidad de extras"></label>
      <label class="fld"><span>Situación</span><select id="gnS">${GENTE_SITS.map(([k, n]) => `<option value="${k}" ${k === last.sit ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <div class="fld"><span>Qué tan juntos</span><div class="seg" role="group" id="gnD">${Object.entries(GENTE_DENS).map(([k, v]) => `<button type="button" data-v="${k}" aria-pressed="${ea(k === last.dens)}">${v[1]}</button>`).join('')}</div></div>
      <p class="hint" style="margin:0">Hasta ${GENTE_SUELTOS}: figuras sueltas, cada una editable. Más: un grupo con menos detalle mientras más sean.</p>
      <button class="btn primary sm" id="gnOk">Agregar</button></div>`, q => {
      q.classList.add('pop-gn');
      q.addEventListener('click', e => { const d = e.target.closest('#gnD [data-v]'); if (d) $$('#gnD [data-v]', q).forEach(x => x.setAttribute('aria-pressed', x === d)); });
      const go = () => {
        const n = clamp(Math.round(num($('#gnN', q).value)) || 1, 1, GENTE_MAX), sit = $('#gnS', q).value, dens = ($('#gnD [aria-pressed="true"]', q) || {}).dataset ? $('#gnD [aria-pressed="true"]', q).dataset.v : 'normal';
        ls.set('extrasLast', { n, sit, dens });
        closePop(); addExtras(n, sit, dens);
      };
      $('#gnOk', q).onclick = go;
      $('#gnN', q).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      setTimeout(() => { const i = $('#gnN', q); if (i) { i.focus(); i.select(); } }, 30);
    });
    return pp;
  };
  const addExtras = (n, sit, dens) => {
    snapshot(); E.custom = true;
    const st = ed.state(), c = st.cam, yaw = Math.round(c.yaw);
    const seed = Math.floor(Math.random() * 99991) + 1;
    const L = genteLayout({ n, sit, dens, seed });
    // delante de la cámara, de frente a ella, a la distancia justa para que entre el grupo
    const dist = Math.max(3, L.d / 2 + 2.5 + (n > GENTE_SUELTOS ? L.w * .25 : 0));
    const cx = c.x - Math.sin(rad(c.yaw)) * dist, cz = c.z - Math.cos(rad(c.yaw)) * dist;
    if (n <= GENTE_SUELTOS) {
      const X = S3_BODY.extra;
      let nx = E.s3.objs.filter(o => o.look && o.look.body === 'extra').length, last = null;
      const ca = Math.cos(rad(yaw)), sa = Math.sin(rad(yaw));
      for (const m of L.pts) {
        const id = 'a' + uid(); nx++;
        s3AddObj(E.s3, { id, kind: 'actor', el: null, name: 'Extra ' + nx, color: '#8D949E', look: { body: 'extra', hairStyle: X.hair, hair: X.hc, skin: X.skin, color: '#8D949E', pants: '#5E626B' } },
          { x: round2(cx + m.x * ca + m.z * sa), z: round2(cz - m.x * sa + m.z * ca), rot: Math.round(yaw + m.rot), expr: 'neutral', pose: m.pose });
        last = id;
      }
      E.sel = last;
    } else {
      const id = 'g' + uid(), k = E.s3.objs.filter(o => o.kind === 'gente').length;
      s3AddObj(E.s3, { id, kind: 'gente', name: k ? 'Extras ' + (k + 1) : 'Extras', n, sit, dens, seed }, { x: round2(cx), z: round2(cz), rot: yaw });
      E.sel = id;
    }
    E.tab = 'sel'; commit(); panel(); redraw();
  };
  /* catálogo de «+ Objeto»: grupos, búsqueda y lista. Con una figura elegida, lo que se lleva en la mano
     (cuchillo, taza, pistola…) aparece en su mano derecha */
  const addObj = ev => {
    const cur = () => ls.get('objCat', 'objeto');
    const list = (cat, qq) => {
      const k = qq ? deaccent(qq.toLowerCase()) : '';
      const L = Object.entries(S3_PROPS).filter(([kk, v]) => k ? deaccent(v.name.toLowerCase()).includes(k) || kk.includes(k) : (v.cat || 'objeto') === cat);
      return L.length ? L.map(([kk, v]) => `<button data-k="${ea(kk)}">${esc(v.name)}</button>`).join('') : '<p class="po-none">Nada con ese nombre.</p>';
    };
    const html = `<input class="po-q" type="search" placeholder="Buscar: taxi, perro, laptop…" aria-label="Buscar objeto">
      <div class="po-cats" role="tablist">${S3_PROP_CATS.map(([c, n]) => `<button class="chip" role="tab" data-pc="${ea(c)}" aria-pressed="${ea(c === cur())}">${n}</button>`).join('')}</div>
      <div class="menu po-list">${list(cur())}</div>`;
    popover(ev.currentTarget, html, p => {
      p.classList.add('pop-add');
      const L = p.querySelector('.po-list'), Q = p.querySelector('.po-q');
      const mark = c => p.querySelectorAll('[data-pc]').forEach(b => b.setAttribute('aria-pressed', b.dataset.pc === c));
      Q.addEventListener('input', () => { const v = Q.value.trim(); L.innerHTML = list(cur(), v); mark(v ? '' : cur()); L.scrollTop = 0; });
      p.addEventListener('click', e => {
        const c = e.target.closest('[data-pc]');
        if (c) { ls.set('objCat', c.dataset.pc); Q.value = ''; L.innerHTML = list(c.dataset.pc); mark(c.dataset.pc); L.scrollTop = 0; return; }
        const b = e.target.closest('button[data-k]'); if (!b) return;
        closePop(); snapshot(); E.custom = true;
        const kind = b.dataset.k, fp = S3_PROPS[kind] || {};
        const id = 'o' + uid(), c2 = ed.state().cam, d = Math.max(3.2, Math.max(fp.w || 1, fp.d || 1) * .9 + 1.5);
        const pos = { x: round2(c2.x - Math.sin(rad(c2.yaw)) * d + (d > 4 ? 0 : .8)), z: round2(c2.z - Math.cos(rad(c2.yaw)) * d), rot: 0 };
        if (fp.wall && E.s3.set === 'int') { snapToWall(E.s3, pos) || (pos.z = -roomOf(E.s3).d / 2, pos.rot = 0); pos.open = 0; }
        if (fp.small) pos.h = 0;
        const ob = { id, kind }, who = E.s3.objs.find(o => o.id === E.sel && o.kind === 'actor');
        if (who && fp.small && GRIP[kind]) ob.hold = { a: who.id, at: kind === 'guitarra' || kind === 'mochila' ? 'pecho' : 'R' };
        s3AddObj(E.s3, ob, pos);
        E.sel = id; E.tab = 'sel'; commit(); redraw();
      });
    });
  };
  $m('#plFit').onclick = () => plan.fit();
  /* medir: el botón de la regla lo prende y lo apaga; mientras está prendido, arrastrar en la planta traza una medida */
  function measUi() {
    const b = $m('#plMed'), on = !!E.measure; if (!b) return;
    b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on);
    $m('#plMh').hidden = !on; $m('#plMclr').hidden = !(E.s3.meas && E.s3.meas.length);
    $m('#plC').classList.toggle('measuring', on);
  }
  function measMode(on = !E.measure) {
    E.measure = on; if (!on) plan.cancelMeas();
    if (on && E.sel) ed.select(null);
    measUi(); redraw();
  }
  $m('#plMed').onclick = () => measMode();
  $m('#plMclr').onclick = () => ed.measSet([]);
  /* ---------- barra superior de la viñeta: deshacer, rehacer, agregar, entorno, atmósfera y nombres ---------- */
  /* el escenario elegido: «int:cocina» es la habitación amueblada como cocina */
  function setCur() { return E.s3.set === 'int' && ROOM_KINDS[roomOf(E.s3).kind] ? 'int:' + roomOf(E.s3).kind : E.s3.set === 'modelo' ? 'modelo:' + (E.s3.set3d || '') : E.s3.set === 'auto' && carOf(E.s3).m !== 'sedan' ? 'auto:' + carOf(E.s3).m : E.s3.set; }
  /* los escenarios de la lista: los de siempre, los escenarios 3D importados (después del plano) y la opción de importar uno */
  function setOptions(menu) {
    const L = [...S3_SETS], i = L.findIndex(([k]) => k === 'plano') + 1, M = set3dList().map(d => ['modelo:' + d.id, (bsIs(d) ? 'Escenario construido: ' : 'Escenario 3D: ') + d.n]);
    if (!menu) M.push(['modelo:+', 'Importar escenario 3D…']);
    L.splice(i, 0, ...M);
    if (!menu && !UI.readOnly) L.push(['modelo:+c', 'Construir uno nuevo…']);   // lote W · el constructor de escenarios
    return L;
  }
  function pickSet(k, fromPanel) {
    const [set, kind] = k.split(':');
    if (set === 'modelo') { if (!P.sets3d || !P.sets3d[kind]) { import3d(); return; } snapshot(); E.custom = true; useSet3d(E.s3, kind); commit(); redraw(); plan.fit(); paintTop(); return; }
    snapshot(); E.custom = true;
    const hadRoom = E.s3.objs.some(o => o.room) || roomOf(E.s3).kind, wasCar = E.s3.set === 'auto';
    E.s3.set = set; delete E.s3.set3d;
    bsLights(E.s3, null);   // lote W · las luces del escenario construido se van con él
    // el ambiente trae sus muebles; al cambiar de ambiente o salir de la habitación, los de antes se van
    if (kind && set === 'int') { roomFurnish(E.s3, kind); toast(kind === 'ascensor' ? 'Ascensor: las puertas, la botonera y los pasamanos son parte de la cabina. Las figuras quedan adentro.' : `${ROOM_KINDS[kind].name}: los muebles quedan como objetos, se mueven o se quitan como cualquier otro.`); }
    else if (hadRoom) roomFurnish(E.s3, '');
    // el interior de vehículo: el modelo elegido (el color se queda); al salir, las figuras bajan de los asientos altos
    if (set === 'auto') {
      carSet(E.s3, 'm', kind || 'sedan'); envSeatCar(E.s3); if (E.s3.keys.length === 1) envCarCam(E.s3);
      if (fromPanel) toast((kind === 'bus' ? 'Las figuras van de pasajeras; el chofer es de relleno.' : 'Las figuras se sentaron en el vehículo: la primera maneja.') + (E.s3.keys.length > 1 ? ' «Reencuadrar» acomoda la cámara.' : ''));
    } else if (wasCar) { delete E.s3.car; for (const ob of E.s3.objs) if (ob.kind === 'actor') for (const k of E.s3.keys) if (k.o[ob.id]) delete k.o[ob.id].h; }
    if (set === 'plano' && !planOf(E.s3)) E.s3.planId = (P.locPlans && P.plans[P.locPlans[s.loc]] && P.locPlans[s.loc]) || Object.keys(P.plans)[0];
    commit(); redraw(); if (set === 'plano' || set === 'auto' || kind) plan.fit();
  }
  const ENV_SHORT = { jardin_d: 'Frente de casa', jardin_t: 'Patio trasero', int: 'Habitación', plano: 'Plano', auto: 'Vehículo', ext: 'Exterior', calle: 'Calle', parque: 'Parque', bosque: 'Bosque', montana: 'Montaña', playa: 'Playa', mar: 'Mar', desierto: 'Desierto', canaveral: 'Cañaveral', vacio: 'Estudio' };
  const ATM_SHORT = { dia: 'Día', amanecer: 'Amanecer', dorada: 'Hora dorada', atardecer: 'Atardecer', noche: 'Noche', nublado: 'Nublado', lluvia: 'Lluvia', niebla: 'Niebla' };
  // íconos de la barra para el entorno y la atmósfera elegidos (el nombre va en la ayuda al pasar el mouse)
  const VT_IC = {
    ext: '<path d="M3 19.5 9 10l4 5.5 2.5-3.5 5.5 7.5z"/><circle cx="16.5" cy="6.5" r="2"/>',
    int: '<path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
    auto: '<path d="M4 15.5V12l2-4.5h12l2 4.5v3.5z"/><circle cx="8" cy="16.5" r="1.6"/><circle cx="16" cy="16.5" r="1.6"/><path d="M4 12h16"/>',
    vacio: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 15h16"/>',
    modelo: '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
    dia: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    amanecer: '<path d="M4 17h16M7 17a5 5 0 0 1 10 0"/><path d="M12 6v3M5.5 10.5l1.6 1.2M18.5 10.5l-1.6 1.2M3 20.5h18"/>',
    dorada: '<path d="M4 17h16M7 17a5 5 0 0 1 10 0"/><path d="M12 6v3M5.5 10.5l1.6 1.2M18.5 10.5l-1.6 1.2M3 20.5h18"/>',
    atardecer: '<path d="M4 17h16M7 17a5 5 0 0 1 10 0"/><path d="M12 9V5.5M10 7.5l2 2 2-2M3 20.5h18"/>',
    noche: '<path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z"/>',
    nublado: '<path d="M7 18.5h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.2A3.5 3.5 0 0 0 7 18.5z"/>',
    lluvia: '<path d="M7 14.5h10a3.6 3.6 0 0 0 .4-7.2 5 5 0 0 0-9.6 1A3.2 3.2 0 0 0 7 14.5z"/><path d="M8.5 17.5 7.5 20M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
    niebla: '<path d="M4 9h16M3 13h18M5 17h14M8 5h8"/>',
  };
  const vtIcon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${VT_IC[k] || VT_IC.dia}</svg>`;
  function paintTop() {
    const T = $m('#vpTop'); if (!T) return;
    // también al dibujar sobre la viñeta: ahí deshacer es del trazo y el lápiz vuelve a la escena
    const dr = E.tab === 'draw';
    T.classList.toggle('off', !has3D);
    T.querySelector('[data-vt="undo"]').disabled = dr ? !E.draw.undo.length : !E.hist.length;
    T.querySelector('[data-vt="redo"]').disabled = dr || !E.fut.length;
    const pb = T.querySelector('[data-vt="draw"]'); pb.classList.toggle('on', dr); pb.setAttribute('aria-pressed', dr);
    const gb = T.querySelector('[data-vt="guides"]'); gb.classList.toggle('on', !!E.gd.size);
    const en = (E.s3.set === 'int' && (ROOM_KINDS[roomOf(E.s3).kind] || {}).name) || (set3dOf(E.s3) || {}).n || ENV_SHORT[E.s3.set] || 'Entorno';
    $m('#vtEnv').textContent = en; const eb = $m('[data-vt="env"]'); eb.title = 'Entorno: ' + en; eb.setAttribute('aria-label', 'Entorno: ' + en);
    $m('#vtEnvI').innerHTML = vtIcon(E.s3.set === 'modelo' ? 'modelo' : E.s3.set === 'int' || /^jardin/.test(E.s3.set) ? 'int' : E.s3.set === 'vacio' ? 'vacio' : E.s3.set === 'auto' ? 'auto' : 'ext');
    const at = $m('[data-vt="atm"]'); at.hidden = E.s3.set === 'vacio';
    const an = ATM_SHORT[atmOf(E.s3)] || 'Atmósfera'; $m('#vtAtm').textContent = an; at.title = 'Atmósfera: ' + an; at.setAttribute('aria-label', 'Atmósfera: ' + an);
    $m('#vtAtmI').innerHTML = vtIcon(atmOf(E.s3));
    T.querySelector('[data-vt="names"]').classList.toggle('off', !E.form.names);
    measUi();   // «Borrar todas» de la planta, también después de deshacer
  }
  /* ---------- líneas guía ----------
     Se eligen varias a la vez desde un menú de íconos; solo se ven en el editor (no salen en la viñeta guardada) */
  const GUIDE_DEFS = [
    ['tercios', 'Tercios', '<rect x="3.5" y="5" width="17" height="14" rx="1"/><path d="M9.2 5v14M14.8 5v14M3.5 9.7h17M3.5 14.3h17"/>'],
    ['cuadricula', 'Cuadrícula', '<rect x="3.5" y="5" width="17" height="14" rx="1"/><path d="M7.8 5v14M12 5v14M16.2 5v14M3.5 8.5h17M3.5 12h17M3.5 15.5h17"/>'],
    ['centro', 'Centro', '<rect x="3.5" y="5" width="17" height="14" rx="1"/><path d="M12 9v6M9 12h6"/>'],
    ['diagonales', 'Diagonales', '<rect x="3.5" y="5" width="17" height="14" rx="1"/><path d="m3.5 5 17 14M20.5 5l-17 14"/>'],
    ['aurea', 'Proporción áurea', '<rect x="3.5" y="5" width="17" height="14" rx="1"/><path d="M10 5v14M14 5v14M3.5 10.3h17M3.5 13.7h17"/><circle cx="10" cy="10.3" r="1.1"/><circle cx="14" cy="10.3" r="1.1"/><circle cx="10" cy="13.7" r="1.1"/><circle cx="14" cy="13.7" r="1.1"/>'],
    ['espiral', 'Espiral áurea', '<rect x="3.5" y="5" width="17" height="14" rx="1"/><path d="M14 19A10.5 14 0 0 1 3.5 5M14 19a6.5 6.5 0 0 0 6.5-6.5A4 4 0 0 0 16.5 8.5 2.5 2.5 0 0 0 14 11"/>'],
    ['triangulos', 'Triángulos', '<rect x="3.5" y="5" width="17" height="14" rx="1"/><path d="M3.5 19 20.5 5M3.5 5l6.9 8.3M20.5 19l-6.9-8.3"/>'],
    ['segura', 'Zona segura', '<rect x="3.5" y="5" width="17" height="14" rx="1"/><rect x="6" y="7.2" width="12" height="9.6" stroke-dasharray="2 1.6"/>'],
    ['horizonte', 'Horizonte', '<rect x="3.5" y="5" width="17" height="14" rx="1"/><path d="M3.5 12.6h17" stroke-dasharray="3 2"/><circle cx="12" cy="12.6" r="1.4"/>'],
  ];
  function guideMenu(btn) {
    const r = btn.getBoundingClientRect();
    const html = () => `<div class="pose-h">Líneas guía</div><div class="gd-grid">${GUIDE_DEFS.map(([k, n, d]) => `<button data-g="${k}" aria-pressed="${ea(E.gd.has(k))}" title="${n}"><svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg><span>${n}</span></button>`).join('')}</div>
      <div class="gd-ft"><button class="btn sm ghost" data-g="none" ${E.gd.size ? '' : 'disabled'}>Ocultar todas</button></div>`;
    const pp = popover(btn, html(), q => {
      q.classList.add('pop-gd');
      q.addEventListener('click', e => {
        const b = e.target.closest('[data-g]'); if (!b || b.disabled) return;
        if (b.dataset.g === 'none') E.gd.clear(); else if (E.gd.has(b.dataset.g)) E.gd.delete(b.dataset.g); else E.gd.add(b.dataset.g);
        ls.set('guias', [...E.gd]);
        q.innerHTML = html(); paintGuides(); paintTop(); if (E.tab === 'draw') panel();
      });
    });
    popPlace(pp, r);
  }
  let _gdKey = '';
  function paintGuides() {
    const el = $m('#vpG'); if (!el) return;
    el.hidden = !E.gd.size;
    if (!E.gd.size) { _gdKey = ''; return; }
    const W = 100 * ar, H = 100, has = k => E.gd.has(k);
    // horizonte: donde la mirada horizontal de la cámara corta la viñeta
    // (todo punto a la altura de la cámara cae en el horizonte: basta con dos cercanos, y así se ve también si la cámara está inclinada)
    let hy = null;
    if (has('horizonte') && has3D && typeof R3 !== 'undefined' && R3.cam) {
      const c = R3.cam, f = new THREE.Vector3(); c.getWorldDirection(f); f.y = 0;
      if (f.lengthSq() > 1e-6) {
        f.normalize(); const rt = new THREE.Vector3(-f.z, 0, f.x), d = Math.max(c.near * 4, .5);
        const pr = k => { const q = c.position.clone().addScaledVector(f, d).addScaledVector(rt, k * d).project(c); return [(q.x + 1) / 2 * W, (1 - q.y) / 2 * H]; };
        const [a1, a2] = [pr(-.3), pr(.3)];
        if (Math.abs(a2[0] - a1[0]) > 1e-6) { const m = (a2[1] - a1[1]) / (a2[0] - a1[0]), r1 = v => Math.round(v * 10) / 10; hy = [r1(a1[1] - m * a1[0]), r1(a1[1] + m * (W - a1[0]))]; }
      }
    }
    const key = [...E.gd].sort().join() + '|' + ar + '|' + hy;
    if (key === _gdKey) return; _gdKey = key;
    const L = (x1, y1, x2, y2, c = '') => `<line x1="${ea(x1)}" y1="${ea(y1)}" x2="${ea(x2)}" y2="${ea(y2)}" ${c}/>`;
    let g = '';
    if (has('tercios')) for (const t of [1 / 3, 2 / 3]) g += L(W * t, 0, W * t, H) + L(0, H * t, W, H * t);
    if (has('cuadricula')) for (const t of [.25, .5, .75]) g += L(W * t, 0, W * t, H, 'class="lt"') + L(0, H * t, W, H * t, 'class="lt"');
    if (has('centro')) g += L(W / 2 - 4, H / 2, W / 2 + 4, H / 2) + L(W / 2, H / 2 - 4, W / 2, H / 2 + 4) + `<circle cx="${ea(W / 2)}" cy="${ea(H / 2)}" r="1.6"/>`;
    if (has('diagonales')) g += L(0, 0, W, H) + L(W, 0, 0, H);
    if (has('aurea')) for (const t of [.382, .618]) g += L(W * t, 0, W * t, H, 'class="au"') + L(0, H * t, W, H * t, 'class="au"');
    if (has('triangulos')) {
      // diagonal y las perpendiculares desde las otras esquinas (simetría dinámica)
      const d2 = W * W + H * H, px = W * H * H / d2, py = H * W * W / d2;
      g += L(0, H, W, 0) + L(0, 0, W - px, H - py) + L(W, H, px, py);
    }
    if (has('espiral')) {
      // espiral áurea ajustada a la viñeta: cuartos de círculo en los cuadrados que se van cortando
      let x = 0, y = 0, w = W, h = H, d = '', dir = 0;
      d += `M${0} ${H}`;
      for (let i = 0; i < 9; i++) {
        if (dir % 2 === 0) { const s2 = w / 1.618; if (dir === 0) { d += ` A${s2} ${h} 0 0 1 ${x + s2} ${y}`; x += s2; w -= s2; } else { d += ` A${s2} ${h} 0 0 1 ${x + w - s2} ${y + h}`; w -= s2; } }
        else { const s2 = h / 1.618; if (dir === 1) { d += ` A${w} ${s2} 0 0 1 ${x + w} ${y + s2}`; y += s2; h -= s2; } else { d += ` A${w} ${s2} 0 0 1 ${x} ${y + h - s2}`; h -= s2; } }
        dir = (dir + 1) % 4;
      }
      g += `<path d="${ea(d)}" class="au" fill="none"/>`;
    }
    if (has('segura')) g += `<rect x="${ea(W * .05)}" y="${ea(H * .05)}" width="${ea(W * .9)}" height="${ea(H * .9)}" class="ds" fill="none"/><rect x="${ea(W * .1)}" y="${ea(H * .1)}" width="${ea(W * .8)}" height="${ea(H * .8)}" class="ds lt" fill="none"/>`;
    if (hy && (hy[0] > 0 || hy[1] > 0) && (hy[0] < H || hy[1] < H)) g += L(0, hy[0], W, hy[1], 'class="hz"') + '';
    const lab = hy && hy[0] > 6 && hy[0] < H - 2 ? `<span class="hz-l" style="top:${ea(hy[0])}%">Horizonte</span>` : '';
    el.innerHTML = `<svg viewBox="0 0 ${ea(W)} ${ea(H)}" preserveAspectRatio="none" aria-hidden="true">${g}</svg>${lab}`;
  }
  // lista corta junto al botón (5 a la vista, el resto deslizando), con el mismo estilo de la de posturas
  function vpList(btn, title, items, cur, pick) {
    const html = `<div class="pose-h">${esc(title)}</div><div class="pose-list" role="listbox">${items.map(([k, n]) => `<button role="option" data-k="${esc(k)}" aria-selected="${ea(k === cur)}"><span>${esc(n)}</span>${k === cur ? '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}</button>`).join('')}</div>`;
    const r = btn.getBoundingClientRect();
    const p = popover(r, html, pp => {
      pp.classList.add('pop-pose');
      const L = pp.querySelector('.pose-list'), sel = L.querySelector('[aria-selected="true"]');
      const fade = () => pp.classList.toggle('more-dn', L.scrollTop + L.clientHeight < L.scrollHeight - 2);
      if (sel) L.scrollTop = Math.max(0, sel.offsetTop - L.clientHeight / 2 + sel.offsetHeight / 2);
      fade(); L.addEventListener('scroll', fade, { passive: true });
      L.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
      L.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; closePop(); pick(b.dataset.k); });
    });
    popPlace(p, r);
    if (matchMedia('(max-width:760px)').matches) for (const k of ['left', 'top']) p.style.setProperty(k, p.style[k], 'important');
  }
  $m('#vpTop').addEventListener('click', e => {
    const b = e.target.closest('[data-vt]'); if (!b || b.disabled) return;
    const v = b.dataset.vt, dr = E.tab === 'draw';
    if (v === 'guides') { guideMenu(b); return; }
    if (dr && v === 'undo') { if (E.draw.undo.length) { actx.putImageData(E.draw.undo.pop(), 0, 0); E.annoDirty = true; paintTop(); } return; }
    // lo que agrega o cambia la escena sale del dibujo
    if (dr && v !== 'draw' && v !== 'names' && v !== 'ws2d' && v !== 'l2') { E.tab = 'sel'; panel(); redraw(); }
    if (v === 'undo') histGo(-1);
    else if (v === 'redo') histGo(1);
    else if (v === 'fig') addFig({ currentTarget: b });
    else if (v === 'draw') { E.tab = dr ? 'sel' : 'draw'; E.part = null; panel(); redraw(); }
    else if (v === 'ws2d') { const w = document.querySelector('[data-ws="2d"]'); if (w) { vpFull(false); w.click(); } }
    else if (v === 'obj') addObj({ currentTarget: b });
    else if (v === 'l2') { E.l2 = !E.l2; ls.set('ed2d', E.l2); redraw(); }
    else if (v === 'names') { E.form.names = !E.form.names; toast(E.form.names ? 'Nombres visibles en este plano.' : 'Nombres ocultos en este plano (el ▾ de posturas sigue).'); panel(); redraw(); }
    else if (v === 'env') vpList(b, 'Entorno', setOptions(true).filter(([k]) => k !== 'plano' || Object.keys(P.plans || {}).length), setCur(), k => pickSet(k));
    else if (v === 'atm') vpList(b, 'Atmósfera', S3_ATM, atmOf(E.s3), k => { snapshot(); E.s3.atm = k; delete E.s3.sunAz; E.custom = true; commit(); redraw(); });
  });
  $m('#plZi').onclick = () => plan.zoom(1.25);
  $m('#plZo').onclick = () => plan.zoom(.8);

  /* ---------- teclado ---------- */
  function onKey(e) {
    if (EDT !== E || m.hidden || /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName)) return;
    if (document.querySelector('#pop.pop-face, .acc-ed')) return;   // dibujando una cara o un accesorio: sus teclas son del dibujo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
    // en la pestaña Dibujo, deshacer es del trazo (no de la escena 3D que no se está viendo)
    if (E.tab === 'draw' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); if (E.draw.undo.length) { actx.putImageData(E.draw.undo.pop(), 0, 0); E.annoDirty = true; paintTop(); } else toast('No hay trazos para deshacer.'); return; }
    if (E.tab === 'draw' && (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'z')) { e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); histGo(1); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); histGo(-1); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && E.sel && E.sel !== 'cam') { snapshot(); s3DelObj(E.s3, E.sel); E.sel = null; commit(); redraw(); }
    else if (e.key === ' ' && !(document.activeElement && document.activeElement.tagName === 'BUTTON' && document.activeElement.id !== 'tlPlay')) { e.preventDefault(); $m('#tlPlay').click(); }
  }
  addEventListener('keydown', onKey);
  /* un toque de Ctrl sola (⌘ en la Mac): pasa de la vista de la cámara a la vista libre y de vuelta, como el botón.
     Ctrl con otra tecla, la rueda o un clic siguen siendo lo de siempre; escribiendo en un campo, nada */
  let modT = 0;
  const modDown = e => { modT = e.key === MOD_KEY && !e.repeat && !e.shiftKey && !e.altKey && !(MOD_KEY === 'Meta' ? e.ctrlKey : e.metaKey) ? (e.timeStamp || performance.now()) : 0; };
  const modUp = e => {
    const t0 = modT; modT = 0;
    if (e.key !== MOD_KEY || !t0 || (e.timeStamp || performance.now()) - t0 > 600) return;
    if (EDT !== E || m.hidden || !has3D) return;
    const a = document.activeElement; if (a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable)) return;
    if (document.querySelector('#pop.pop-face, .acc-ed') || (plBox && plBox.classList.contains('full'))) return;
    freeOn(!E.free);
  };
  const modOff = () => { modT = 0; };
  addEventListener('keydown', modDown, true); addEventListener('keyup', modUp, true);
  addEventListener('pointerdown', modOff, true); addEventListener('wheel', modOff, { capture: true, passive: true }); addEventListener('blur', modOff);
  E.offMod = () => { removeEventListener('keydown', modDown, true); removeEventListener('keyup', modUp, true); removeEventListener('pointerdown', modOff, true); removeEventListener('wheel', modOff, { capture: true }); removeEventListener('blur', modOff); };

  /* ---------- guardar ---------- */
  async function save(next, to2d) {
    histNote(`Editar el plano ${D.code[id] || ''}`.trim(), null, 'board');
    if (E.from2d && !to2d) sh.ws = '3d';
    Object.assign(sh, { size: E.form.size, angle: E.form.angle, move: E.form.move, support: E.form.support, desc: E.form.desc, notes: E.form.notes, done: E.form.done });
    if (E.form.snd) sh.snd = E.form.snd; else delete sh.snd;
    if (E.form.names) delete sh.noNames; else sh.noNames = true;
    let p0 = E.form.p0, p1 = E.form.p1; if (p1 < p0) [p0, p1] = [p1, p0]; sh.p0 = p0; sh.p1 = p1;
    if (E.durSet) sh.dur = String(E.dur);
    if (E.cam === 'b') { s3SwapB(E.s3); E.cam = 'a'; }   // se guarda con la cámara A en su lugar
    if (E.custom) { sh.s3 = E.s3; s3SyncShot(sh); if (shotBlank(sh)) { if (P.meta.sbBlank) sh.blank = false; else delete sh.blank; } }   // armó la escena 3D: se ve
    else if (E.refollow) delete sh.s3;   // «Volver a seguir al máster»: sin puesta propia, se arma desde el máster
    // los personajes del plano: los de su escena 3D. Si sigue al máster, la escena trae a todos los del máster: el plano
    // conserva los suyos (a quién encuadra)
    const els = actorEls(); if (E.custom) sh.chars = els; else if (els.length && !masterOf(sh)) sh.chars = els;
    // guardado desde el 3D: si el dibujo 2D tenía la Viñeta 3D oculta, ahora se ve (opaca) debajo del dibujo
    if (!to2d && d2On(sh) && !shot3D(sh)) { d2Norm(sh, sh.d2); sh.d2.base = '3d'; sh.d2.baseOp = 1; sh.d2.rev = (sh.d2.rev || 0) + 1; }
    // la referencia o la anotación cambiaron aquí: se ven las nuevas (la capa del 2D que trajo las de antes queda como una más)
    if (E.refDirty) d2Unimp(sh, 'ref');
    if (E.annoDirty) d2Unimp(sh, 'anno');
    delete sh.auto;
    E.saved = true;
    const writes = [];
    if (E.annoDirty) {
      const blank = !actx.getImageData(0, 0, anC.width, anC.height).data.some((v, i) => i % 4 === 3 && v > 0);
      const url = blank ? null : anC.toDataURL('image/png');
      if (url) FRAMES[annoKey] = url; else delete FRAMES[annoKey];
      ANNO.delete(id); writes.push([annoKey, url]);
    }
    if (E.ref && E.refBack) sh.refBack = true; else delete sh.refBack;
    if (E.refDirty) { if (E.ref) FRAMES[id] = E.ref; else delete FRAMES[id]; writes.push([id, E.ref]); }
    closeModal();
    changed('data'); derive(); render();
    if (writes.length && !UI.readOnly) {
      if (P._sample && !P._saved) await flushSave();
      const bad = [];
      for (const [k, v] of writes) { try { await Store.saveFrame(P.id, k, v || null); } catch (e) { bad.push([k, v]); } }
      if (bad.length) { const retry = async () => { const still = []; for (const [k, v] of bad) { try { await Store.saveFrame(P.id, k, v || null); } catch (e) { still.push(k); } } if (still.length) problem('El dibujo sigue sin guardarse. Revisa la conexión o el espacio disponible.'); else toast('Dibujo guardado.'); }; problem('No se pudo guardar el dibujo del plano.', retry); }
    }
    if (to2d) openShot2D(id);
    else if (next) openShotEditor(next.id);
  }
  $m('#edSave').onclick = () => save();
  E.saveNow = () => save();   // al cerrar la app de escritorio con el editor abierto
  $m('#edPrev').onclick = () => save(list[i - 1]);
  $m('#edNext').onclick = () => save(list[i + 1]);
  const delShot = () => { E.saved = true; closeModal(); deleteShot(id); };
  $m('#edMore').onclick = ev => popover(ev.currentTarget, `<div class="menu"><button data-m="copy" ${i > 0 && list[i - 1] ? '' : 'disabled'} title="Figuras, objetos, luces y su animación; la cámara de este plano no cambia">Copiar la escena del plano anterior</button>${UI.readOnly ? '' : `<button data-m="master" title="Los demás planos de la escena toman de este la ubicación de los personajes y el escenario">${isMaster(sh) ? 'Dejar de usar como máster' : 'Usar como máster'}</button>`}<button data-m="dup">Duplicar plano</button><button data-m="del" style="color:var(--bad)">Eliminar plano</button></div>`, p => p.addEventListener('click', e2 => {
    const b = e2.target.closest('[data-m]'); if (!b || b.disabled) return; closePop();
    if (b.dataset.m === 'copy') copyPrev(); else if (b.dataset.m === 'master') toggleMaster(); else if (b.dataset.m === 'dup') dupShot(); else delShot();
  }));
  const dupShot = async () => {
    await save();
    const next = (D.shotsBy[sh.sc] || [])[(D.shotsBy[sh.sc] || []).indexOf(sh) + 1];
    const copy = { ...clone(sh), id: uid('s'), ord: next ? (sh.ord + next.ord) / 2 : sh.ord + 1, done: false };
    if (isMaster(sh) || copy.master) copy.master = false;   // un máster por escena: la copia no lo es
    P.shots[copy.id] = copy;
    await copyShotFrames(id, copy.id);
    changed('data'); derive();
    openShotEditor(copy.id, true);
  };

  sizeViewport(); sizeTimeline(); panel(); camBadge();
  $m('#vpCamAB').onclick = () => camSwitch(E.cam === 'a' ? 'b' : 'a');
  requestAnimationFrame(() => { sizeViewport(); plan.fit(); sizeTimeline(); redraw(); });
  if (has3D) setTimeout(() => { if (EDT === E && !m.hidden) coach('ed-uso', 'Arrastra en la viñeta para mover la cámara; toca una figura para elegirla. Doble toque en un espacio vacío: la viñeta sola, a pantalla completa.', $m('#vp')); }, 1400);
}
/* imágenes guardadas (referencia y anotación) cargadas para componer miniaturas */
/* al cargar, la clave de la miniatura ya cambia sola (lleva si la imagen cargó): no hace falta borrar las demás */
const IMGS = new Map();
/* mientras se dibuja una viñeta, IMG_WATCH cuenta las imágenes que existen pero aún no están listas
   (así esa viñeta no se guarda como definitiva) */
let IMG_WATCH = null;
function cachedImg(key) {
  const url = FRAMES[key];
  if (!url) { if (IMG_WATCH && frameHas(key)) IMG_WATCH.miss++; return null; }
  if (FRIDX) FR_USE.set(key, Date.now());
  let im = IMGS.get(key);
  if (!im || im._src !== url) { im = new Image(); im._src = url; im.onload = () => { if (UI.tab === 'board' || UI.tab === 'animatic') lateRender(); if (EDT && EDT.redraw) EDT.redraw(); }; im.src = url; IMGS.set(key, im); }
  if (im.complete && im.naturalWidth) return im;
  if (IMG_WATCH) IMG_WATCH.miss++;
  return null;
}
const ANNO = { delete: k => IMGS.delete(k + '~a') };
