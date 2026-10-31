/* ============================================================
   FICHA DE PERSONAJE — cuerpo, proporciones, tallas, fotos, tono, pelo y color; y sus expresiones
   Se define una vez por personaje y vale para todos los planos.
   Se abre desde Storyboard › Personajes, el desglose (nombre del personaje)
   y el editor de plano. Viaja con la sección «storyboard» del equipo.
   ============================================================ */
const fichaEditable = () => !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('storyboard'));
const castList = () => Object.values(P.elements).filter(e => e.cat === 'cast').sort((a, b) => (D.castNum[a.id] || 99) - (D.castNum[b.id] || 99) || a.name.localeCompare(b.name));
/* resumen de una línea: «Mujer · 1.62 m · camisa M» */
function lookSummary(el) {
  const lk = lookOf({ kind: 'actor', el: el.id }), sz = (el.look && el.look.sizes) || {};
  const t = [S3_BODY[lk.body] ? S3_BODY[lk.body].name : '', lk.height.toFixed(2) + ' m'];
  if (sz.camisa) t.push('camisa ' + sz.camisa); if (sz.pantalon) t.push('pantalón ' + sz.pantalon); if (sz.calzado) t.push('calzado ' + sz.calzado);
  return t.filter(Boolean).join(' · ');
}
function fichasMenu(anchor) {
  const list = castList();
  popover(anchor, `<h5>Personajes</h5>${list.length ? `<div class="menu fichas">${list.map(e => `<button data-id="${ea(e.id)}"><span class="fdot" style="--c:${ea(lookOf({ kind: 'actor', el: e.id }).color)}">${D.castNum[e.id] || ''}</span><span><b>${esc(titleCase(e.name))}</b><small>${esc(lookSummary(e))}</small></span></button>`).join('')}</div>` : '<p class="hint" style="margin:0">Marca personajes en el guion (Reparto) para crear sus fichas.</p>'}`,
    p => p.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) { closePop(); openFicha(b.dataset.id); } }));
}
/* encuadre de la cara: la cabeza tal como quedó dibujada (cuerpo, postura —el anciano va encorvado—, tamaño de
   cabeza, estatura y peinado), de la barbilla a lo alto del pelo, al centro del cuadro con un poco de cuello.
   null si la figura 3D aún no está */
function fichaFit(A, lk, vf) {
  if (!A || !A.fig || !A.bone || typeof vestLand !== 'function') return null;
  const tp = A.fig, hd = vestLand(tp).head, hb = tp.bones[tp.idx.head].h; if (!(hd.y1 > hd.y0)) return null;
  const hair = (lk.pelo || 'ninguno') === 'ninguno' ? .008 : ({ recogido: .075, coletas: .03, despeinado: .035, ondas: .03 }[lk.pelo] || .024), zc = (hd.z0 + hd.z1) / 2;
  A.root.updateMatrixWorld(true);
  const M = A.bone('head').matrixWorld, V = (y, z) => new THREE.Vector3(-hb[0], y - hb[1], z - hb[2]).applyMatrix4(M);
  const top = V(hd.y1 + hair, zc), chin = V(hd.y0, zc), c = V((hd.y0 + hd.y1) / 2, zc);
  const span = (top.y - chin.y) / .62, d = (span / 2) / Math.tan(vf / 2);
  if (!(span > .05 && span < 2)) return null;
  return { x: c.x, z: c.z + d, h: (top.y + chin.y) / 2 - span * .04, yaw: 0, pitch: 0, roll: 0, lens: 50 };
}
function openFicha(id, done) {
  const el = P.elements[id];
  if (!el) return;
  const ed = fichaEditable();
  const look0 = el.look ? JSON.parse(JSON.stringify(el.look)) : null;
  const ov = document.createElement('div');
  ov.className = 'modal fp-modal fi-modal'; ov.id = 'fichaModal';
  ov.innerHTML = `<div class="dlg wide fi-dlg" role="dialog" aria-modal="true" aria-label="Ficha de ${esc(el.name)}">
    <header><h2>Ficha de ${esc(titleCase(el.name))} <span class="hint">${D.castNum[id] ? `· reparto ${D.castNum[id]} ` : ''}· vale en todos sus planos</span></h2><button class="btn ghost sm" data-x aria-label="Cerrar">${ICO.close}</button></header>
    <div class="body"><div class="fi">
      <div class="fi-prev"><canvas id="fiC" width="360" height="480" aria-label="Vista del personaje"></canvas>
        <div class="seg fi-rot" role="group" aria-label="Vista">${[[20, 'Frente'], [90, 'Perfil'], [180, 'Espalda']].map(([r, n], i) => `<button data-rot="${ea(r)}" aria-pressed="${ea(i === 0)}">${n}</button>`).join('')}</div></div>
      <div class="fi-ctl" id="fiCtl"></div>
    </div></div>
    <footer>${ed ? '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="fiOk">Guardar</button>' : '<span class="hint" style="margin-right:auto">Solo lectura.</span><button class="btn primary" data-x>Cerrar</button>'}</footer></div>`;
  document.body.appendChild(ov);
  let rot = 20, saved = false, tab = 'body', ex = 'neutral', more = !!ls.get('fi-more', false);
  // el modelo 3D importado (personajes-3d.js): queda en FRAMES para verlo; se guarda con «Guardar»
  const k3 = m3Key('c', id), f3old = FRAMES[k3];
  let m3busy = '', m3pose = 'pie';
  const cv = $('#fiC', ov), g = cv.getContext('2d');
  const s3 = { v: 1, set: 'vacio', aim: 'a0', shake: 0, objs: [{ id: 'a0', kind: 'actor', el: id, name: el.name }],
    keys: [{ t: 0, ease: 'suave', cam: { x: 0, z: 4, h: 1.2, yaw: 0, pitch: 0, roll: 0, lens: 35 }, o: { a0: { x: 0, z: 0, rot: 20, expr: 'neutral', pose: 'pie' } } }] };
  const draw = () => {
    const o0 = s3.keys[0].o.a0, vf = vfovFor(50, cv.width / cv.height);
    o0.expr = tab === 'expr' ? ex : 'neutral';
    o0.pose = tab === 'model' ? m3pose : 'pie';
    if (tab === 'expr') {
      // la cara de cerca (de frente, de perfil o de espalda)
      o0.rot = rot === 20 ? 0 : rot;
      // de perfil, la cabeza queda delante del eje del cuerpo: la cámara (sin seguir a la figura) se corre para centrarla
      s3.aim = null;
      // encuadre con la cabeza tal como se dibuja (fichaFit): se mide una vez por figura y vista. Antes se usaba una
      // altura de ojos aproximada: en cabezas grandes o en el anciano encorvado se cortaba la coronilla
      const lk = lookOf({ kind: 'actor', el: id }), r = o0.rot * Math.PI / 180;
      const approx = { x: Math.sin(r) * .065, z: (.36 / 2) / Math.tan(vf / 2), h: eyeOf(s3, 'a0', 'pie') - .01, yaw: 0, pitch: 0, roll: 0, lens: 50 };
      const fk = [o0.rot, cv.width, cv.height, lk.body, lk.height, lk.w, lk.headk, lk.pelo, lk.s].join('|');
      if (fk !== fitK) {
        s3.keys[0].cam = approx;
        try { r3Draw(g, s3, 0, cv.width, cv.height, { labels: false }); } catch (e) { }
        fitCam = typeof R3 !== 'undefined' && R3.objs ? fichaFit(R3.objs.get('a0'), lk, vf) : null;
        if (fitCam) fitK = fk;
      }
      s3.keys[0].cam = fitCam || approx;
    } else {
      s3.aim = 'a0'; o0.rot = rot;
      // cuerpo entero llenando el cuadro vertical, cámara a media altura
      const hf = lookOf({ kind: 'actor', el: id }).height;
      s3.keys[0].cam = { x: 0, z: (hf * 1.22 / 2) / Math.tan(vf / 2), h: hf * .5, yaw: 0, pitch: 0, roll: 0, lens: 50 };
    }
    g.fillStyle = '#EEF0F2'; g.fillRect(0, 0, cv.width, cv.height);
    // de cerca (Expresión), sin el nombre encima
    try { r3Draw(g, s3, 0, cv.width, cv.height, { faceLive: FACE_LIVE.ob, labels: tab !== 'expr' }); } catch (e) { }
    // solo el cuerpo que se muestra (antes se bajaban los seis al abrir la ficha); al cambiar de tipo, el nuevo
    if (typeof FIG3D !== 'undefined' && FIG3D.ready && !FIG3D.failed) {
      const b = fig3dBody(lookOf({ kind: 'actor', el: id }).body);
      if (!FIG3D.has(b) && !askedB.has(b)) { askedB.add(b); FIG3D.ready(10000, [b]).then(() => { if (ov.isConnected) draw(); }).catch(() => { }); }
    }
  };
  const askedB = new Set();
  let fitK = '', fitCam = null;
  const rr = (label, key, val, min, max, step, unit) => `<label class="rr"><span>${label}</span><input type="range" min="${ea(min)}" max="${ea(max)}" step="${ea(step)}" value="${ea(val)}" data-fr="${ea(key)}" data-u="${ea(unit)}" style="--p:${Math.round(clamp((val - min) / ((max - min) || 1), 0, 1) * 1000) / 10}%" ${ed ? '' : 'disabled'}><output class="tnum">${(+val).toFixed(step < 1 ? 2 : 0)}${unit}</output></label>`;
  const chips = (list, f, cur) => `<div class="seg fi-seg" role="group">${list.map(([k, n]) => `<button data-fk="${ea(f)}" data-v="${k}" aria-pressed="${ea(k === cur)}" ${ed ? '' : 'disabled'}>${n}</button>`).join('')}</div>`;
  const row = (label, html, cls = '') => `<div class="fi-row${ea(cls)}"><span class="fi-l">${label}</span><div class="fi-v">${html}</div></div>`;
  const sws = (list, f, cur, extra = '') => `<div class="sws">${list.map(c => `<button class="sw" style="--sw:${ea(c)}" data-fk="${ea(f)}" data-v="${ea(c)}" aria-pressed="${ea(String(c).toLowerCase() === String(cur || '').toLowerCase())}" aria-label="Color ${ea(colorName(c))}" ${ed ? '' : 'disabled'}></button>`).join('')}${extra}</div>`;
  // pestaña «Expresión»: la biblioteca del personaje (un dibujo por expresión) y los ojos predefinidos
  const exprTab = lk => {
    const faces = lk.faces || {}, eyes = lk.eyes !== false, who = esc(titleCase(el.name));
    if (!exprEntries(lk, ex).some(x => x.k === ex)) ex = 'neutral';
    const b1 = x => `<button data-fe="pick" data-v="${esc(x.k)}" aria-pressed="${ea(ex === x.k)}" title="${esc(x.n)}${x.own && x.kind === 'pre' ? ` (versión de ${who})` : ''}"><img src="${ea(exprIcon(faceKeyFor(lk, x.k)))}" alt=""><span>${esc(x.n)}</span>${x.own && x.kind === 'pre' ? '<i class="ex-own" aria-hidden="true"></i>' : ''}</button>`;
    const dis = ed ? '' : 'disabled';
    return `<div class="fld"><span>Expresiones</span><div class="exprs fi-exprs">${exprEntries(lk, ex).map(b1).join('')}</div></div>
      <div class="ex-acts"><button class="btn sm" data-fe="edit" ${dis}>${ICO.edit || ''}Editar esta expresión</button><button class="btn sm" data-fe="new" ${dis}>+ Nueva expresión</button>
        ${faces[ex] && ex.slice(0, 2) !== 'c:' ? `<button class="btn sm ghost" data-fe="del" ${dis} title="Quitar el dibujo y volver a la predefinida">Volver a la predefinida</button>` : ''}
        ${faces[ex] && ex.slice(0, 2) === 'c:' ? `<button class="btn sm ghost" data-fe="del" ${dis}>Borrar</button>` : ''}</div>
      <div class="fi-form">
        ${row('Lentes', `<div class="seg fi-seg" role="group">${FACE_GLASSES.map(([g2, n]) => `<button data-fe="glasses" data-v="${ea(g2)}" aria-pressed="${ea((lk.glasses || '') === g2)}" ${dis}>${n}</button>`).join('')}</div>`)}
        ${row('Ojos', `<div class="seg fi-seg" role="group"><button data-fe="eyes" data-v="1" aria-pressed="${ea(eyes)}" ${dis}>Predefinidos</button><button data-fe="eyes" data-v="0" aria-pressed="${ea(!eyes)}" ${dis}>Dibujados a mano</button></div>`)}
      </div>
      <p class="hint fi-note">Un dibujo por expresión, para todos los planos de ${who}. Las guías de la cara no salen en la viñeta ni en el PDF.</p>`;
  };
  // pestaña «Modelo 3D»: subir un personaje con esqueleto, sus articulaciones, hacia dónde mira y una postura de prueba
  const modelTab = lk => {
    const M = (el.look || {}).model, dis = ed ? '' : 'disabled', who = esc(titleCase(el.name));
    if (m3busy) return `<div class="fi-m3"><p class="fi-m3busy" role="status"><span class="spin" aria-hidden="true"></span>${esc(m3busy)}</p></div>`;
    if (!M) return `<div class="fi-m3"><p class="fi-m3t">Un modelo 3D con esqueleto toma el lugar del maniquí de ${who} en todos sus planos: se pone en las posturas, camina y se dobla como el maniquí.</p>
      ${ed ? `<button class="btn primary" data-f3="up">${ICO.plus}Subir modelo 3D…</button>` : ''}
      <ul class="fi-m3l"><li>Archivos .glb, .gltf (un solo archivo), .vrm o .fbx. Si el modelo trae las texturas aparte (MakeHuman), elígelas junto con él (Ctrl + clic) o comprime el modelo y su carpeta «textures» en un .zip y sube el .zip.</li><li>Con esqueleto: Mixamo (gratis), VRoid, Character Creator, Blender… Uno sin esqueleto se puede riguear en Mixamo.</li><li>Se guarda una versión liviana, con las texturas en WebP; el archivo original no.</li></ul></div>`;
    const t = M3.tpl.get(k3) && M3.tpl.get(k3).t, bones = t ? t.H.bones : null, map = M.map || {}, miss = ch3Missing(map), n = CH3_MAIN.filter(j => map[j] != null).length;
    const opts = j => bones ? `<option value="">—</option>${bones.map((b, i) => `<option value="${i}" ${map[j] === i ? 'selected' : ''}>${esc(b.n || 'hueso ' + (i + 1))}</option>`).join('')}` : '';
    const sel = j => `<label class="fi-m3j${ea(CH3_NEED.includes(j) && map[j] == null ? ' miss' : '')}"><span>${esc(ch3Label(j))}</span><select data-f3map="${ea(j)}" ${dis}>${opts(j)}</select></label>`;
    return `<div class="fi-m3">
      <div class="fi-m3h"><span class="fi-m3n"><b>${esc(M.n || 'Modelo 3D')}</b><small>${(M.tris || 0).toLocaleString('es-PE')} triángulos · ${(M.kb || 0).toLocaleString('es-PE')} kB${M.cut ? ' · aligerado' : ''}</small></span>
        ${ed ? `<button class="btn sm" data-f3="up">Cambiar…</button><button class="btn sm ghost" data-f3="rm">Quitar</button>` : ''}</div>
      <p class="fi-m3s${ea(miss.length ? ' warn' : '')}">${miss.length ? (miss.length === 1 ? 'Falta 1 articulación: elígela abajo para que se mueva bien.' : `Faltan ${miss.length} articulaciones: elígelas abajo para que se mueva bien.`) : `Esqueleto reconocido: ${n} de ${CH3_MAIN.length} articulaciones${Object.keys(map).length > n ? ', con los dedos' : ''}.`}</p>
      ${miss.length && bones ? `<div class="fi-m3js">${miss.map(sel).join('')}</div>` : ''}
      <div class="fi-form">
        ${row('Mira hacia', chips([['0', 'Adelante'], ['180', 'Atrás']], 'm3rot', String(M.rot || 0)))}
        ${row('Probar', `<div class="seg fi-seg" role="group">${[['pie', 'De pie'], ['sentado', 'Sentado'], ['brazos', 'Manos arriba'], ['camina', 'Caminando']].map(([k, n2]) => `<button data-f3="pose" data-v="${k}" aria-pressed="${ea(m3pose === k)}">${n2}</button>`).join('')}</div>`)}
        ${row('Créditos', `<input type="text" data-f3by value="${esc(M.by || '')}" placeholder="${ea(ed ? 'Autor y licencia (p. ej. CC BY de Sketchfab)' : '')}" ${dis} aria-label="Créditos del modelo">`)}
      </div>
      ${bones ? `<details class="fi-more"><summary>Todas las articulaciones</summary><div class="fi-m3js">${CH3_MAIN.map(sel).join('')}</div></details>` : ''}
      <p class="hint fi-note">La estatura y el tipo de la pestaña Cuerpo siguen valiendo; el pelo, la ropa y la piel son los del modelo.</p></div>`;
  };
  const m3Up = () => {
    if (!proGate('modelo3d')) return;
    const fi = document.createElement('input'); fi.type = 'file'; fi.multiple = true; fi.accept = M3_FILES + ',.png,.jpg,.jpeg,.webp,.bmp,.tga';   // el modelo y, con él, sus texturas
    fi.onchange = async () => {
      const all = [...fi.files], f = m3Main(all); if (!f) { if (all.length) toast('Falta el modelo (.glb, .gltf, .vrm o .fbx) entre los archivos elegidos.', 5000); return; }
      m3busy = 'Leyendo el modelo…'; paint();
      try {
        const R = await m3Read(f, all.filter(x => x !== f)), st = m3Stats(R.root);
        if (!st.skinned) throw new Error('El modelo no tiene esqueleto. En MakeHuman, elige uno en Pose/Animate › Skeleton (Default) antes de exportar; si no, súbelo a Mixamo (gratis), deja que lo riguee y descárgalo en FBX o GLB.');
        m3busy = 'Aligerando y guardando las texturas…'; paint();
        const pk = await m3Pack(R.root, { kind: 'char' });
        if (pk.gz.length > M3_MAX) throw new Error(M3_BIG);
        const t = await m3Parse(pk.url), map = ch3AutoMap(t.H.bones);
        el.look = { ...(el.look || {}), model: { v: Date.now(), map, rot: ch3Facing(t, map, R.vrm), tris: pk.tris, kb: pk.kb, cut: !!pk.cut, n: R.name } };
        FRAMES[k3] = pk.url;
        m3busy = ''; paint();
        m3Tpl(k3, () => { if (ov.isConnected) { paint(); draw(); } });
        toast(pk.cut ? `Listo: se redujo de ${Math.round(pk.from).toLocaleString('es-PE')} a ${pk.tris.toLocaleString('es-PE')} triángulos.` : 'Modelo listo. Revisa cómo queda y guarda la ficha.', 4200);
      } catch (e) { m3busy = ''; paint(); toast(String((e && e.message) || e), 7000); }
    };
    fi.click();
  };
  const paint = () => {
    const lk = lookOf({ kind: 'actor', el: id }), sz = (el.look && el.look.sizes) || {}, has = photoSlots(id), ph = el.look && el.look.photo;
    const hex = /^#[0-9a-f]{6}$/i.test(lk.color || '') ? lk.color : '#808080';
    const tabs = `<div class="seg fi-tabs" role="tablist" aria-label="Ficha">${[['body', 'Cuerpo'], ['expr', 'Expresión'], ['model', 'Modelo 3D']].map(([k, n]) => `<button role="tab" data-ftab="${k}" aria-selected="${ea(tab === k)}" aria-pressed="${ea(tab === k)}">${n}</button>`).join('')}</div>`;
    if (tab === 'expr') { $('#fiCtl', ov).innerHTML = tabs + exprTab(lk); return; }
    if (tab === 'model') { $('#fiCtl', ov).innerHTML = tabs + modelTab(lk); return; }
    const dis = ed ? '' : 'disabled', lk0 = el.look || {}, propsOn = S3_PROP.some(([f]) => lk0[f] != null && +lk0[f] !== 100) || lk0.bw != null;
    const photos = has.length
      ? `<div class="phthumbs">${has.map(k => `<img src="${ea(FRAMES['ph~' + id + '~' + k])}" alt="${k}">`).join('')}</div>${chips([['maniqui', 'Maniquí con su rostro'], ['recorte', 'Recorte fotográfico']], 'phm', ph ? ph.mode : 'maniqui')}`
      : '';
    $('#fiCtl', ov).innerHTML = `${tabs}
      <div class="fi-form">
        ${row('Tipo', chips(Object.entries(S3_BODY).map(([k, v]) => [k, v.name]), 'body', lk.body))}
        ${row('Complexión', chips([['delgada', 'Delgada'], ['media', 'Media'], ['robusta', 'Robusta']], 'build', num(lk.bw) ? '' : lk.build))}
        ${rr('Estatura', 'height', lk.height.toFixed(2), .8, 2.2, .01, ' m')}
        <details class="fi-more" ${more ? 'open' : ''}><summary>Más proporciones${propsOn ? ' <i class="fi-dot" title="Con cambios"></i>' : ''}</summary>
          ${rr('Contextura', 'bw', Math.round(lk.w * 100), 75, 140, 1, '%')}
          ${S3_PROP.map(([f, n, a, b]) => rr(n, f, lk[f], a, b, 1, '%')).join('')}
          ${ed ? '<div class="fi-row"><span></span><div class="fi-v"><button class="btn sm ghost" data-freset>Restablecer proporciones</button></div></div>' : ''}
        </details>
        ${row('Pelo', peloPicker(lk, 'data-fk="pelo"', dis), ' fi-top')}
        ${row('Color del pelo', peloColors(lk, 'data-fk="peloColor"', dis))}
        ${row('Piel', sws(S3_TONOS, 'tono', lk.tono))}
        ${row('<span title="Color de la figura en la planta y en el stripboard">Color</span>', sws(S3_COLORS, 'color', lk.color, `<label class="sw sw-pick" style="--sw:${ea(hex)}" title="Otro color"><input type="color" data-fkc="color" value="${ea(hex)}" aria-label="Otro color" ${dis}></label>`))}
        ${row('Tallas', `<div class="fi-sz">${[['camisa', 'Camisa', 'M'], ['pantalon', 'Pantalón', '32'], ['calzado', 'Calzado', '41']].map(([k, n, ph2]) => `<label><span>${n}</span><input type="text" data-fs="${k}" value="${esc(sz[k] || '')}" placeholder="${ea(ph2)}" ${dis}></label>`).join('')}</div>`)}
        ${row('Fotos', `${photos}${ed ? `<button class="btn sm" data-fph title="De frente, perfil y espalda: la figura toma su rostro, sus colores o su silueta">${has.length ? 'Cambiar fotos…' : 'Agregar fotos…'}</button>` : ''}${has.length ? '' : '<span class="hint">la figura toma su rostro o su silueta</span>'}`, ' fi-ph')}
      </div>`;
  };
  const set = (f, v) => {
    const prevBody = f === 'body' ? lookOf({ kind: 'actor', el: id }).body : null;
    const lk = el.look = { ...(el.look || {}), [f]: v };
    if (f === 'body') {
      const B = S3_BODY[v];
      if (lk.acc && prevBody !== v) lk.acc = accFitStamp(lk.acc, prevBody);   // la ropa dibujada se acomoda al cuerpo nuevo
      lk.hairStyle = B.hair; if (!lk.hairSet || B.faceless) lk.hair = B.hc;
      if (B.faceless) lk.skin = B.skin; else if (lk.skin === S3_BODY.extra.skin) lk.skin = S3_SKIN[2];
    }
    if (f === 'build') delete lk.bw;
  };
  const close = () => {
    removeEventListener('keydown', onEsc, true);
    if (!saved) { if (look0) el.look = look0; else delete el.look; if (f3old) FRAMES[k3] = f3old; else delete FRAMES[k3]; }
    ov.remove();
    if (typeof THUMB3 !== 'undefined') THUMB3.clear();
    if (done) done(saved);
  };
  // con cambios, cerrar (✕, Cancelar, Esc o tocar fuera) pregunta antes de descartarlos
  const req = guardOverlay(ov, { dirty: () => ed && !saved && JSON.stringify(el.look || null) !== JSON.stringify(look0), close, save: () => { const b = $('#fiOk', ov); if (b) b.click(); } });
  const onEsc = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); req('esc'); } };
  addEventListener('keydown', onEsc, true);
  ov.addEventListener('click', e => {
    if (e.target === ov) { req('fuera'); return; }
    if (e.target.closest('[data-x]')) { req('x'); return; }
    const r = e.target.closest('[data-rot]');
    if (r) { rot = +r.dataset.rot; $$('[data-rot]', ov).forEach(b => b.setAttribute('aria-pressed', b === r)); draw(); return; }
    const t = e.target.closest('[data-ftab]');
    if (t) { tab = t.dataset.ftab; paint(); draw(); return; }
    const fe = e.target.closest('[data-fe]');
    if (fe && fe.dataset.fe === 'pick') { ex = fe.dataset.v; paint(); draw(); return; }
    const f3 = e.target.closest('[data-f3]');
    if (f3 && f3.dataset.f3 === 'pose') { m3pose = f3.dataset.v; paint(); draw(); return; }
    if (!ed) return;
    if (fe) { exprAct(fe); return; }
    if (f3 && f3.dataset.f3 === 'up') { m3Up(); return; }
    if (f3 && f3.dataset.f3 === 'rm') { const lk = el.look = { ...(el.look || {}) }; delete lk.model; delete FRAMES[k3]; paint(); draw(); return; }
    if (e.target.id === 'fiOk') {
      // el modelo 3D: se sube o se borra junto con la ficha
      if (FRAMES[k3] !== f3old) {
        const u = (el.look || {}).model ? FRAMES[k3] : null;
        (u ? m3Save(k3, u) : (delete FRAMES[k3], Store.saveFrame(P.id, k3, null))).catch(err => problem('No se pudo guardar el modelo 3D: ' + ((err && err.message) || 'inténtalo de nuevo') + '.'));
      }
      saved = true; changed('data'); close(); if (!done) render(); toast(`Ficha de ${titleCase(el.name)} guardada.`); return;
    }
    const k = e.target.closest('[data-fk]');
    if (k) {
      if (k.dataset.fk === 'phm') { if (el.look && el.look.photo) el.look = { ...el.look, photo: { ...el.look.photo, mode: k.dataset.v } }; }
      else if (k.dataset.fk === 'm3rot') { if (el.look && el.look.model) el.look = { ...el.look, model: { ...el.look.model, rot: +k.dataset.v } }; }
      else set(k.dataset.fk, k.dataset.v);
      paint(); draw(); return;
    }
    if (e.target.closest('[data-freset]')) {
      el.look = { ...(el.look || {}) };
      for (const [f] of S3_PROP) delete el.look[f];
      delete el.look.bw; el.look.build = 'media';
      paint(); draw(); return;
    }
    if (e.target.closest('[data-fph]')) openPhotoDialog(el, () => { paint(); draw(); });
  });
  ov.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('fi-more')) { more = e.target.open; ls.set('fi-more', more); } }, true);
  ov.addEventListener('input', e => {
    const x = e.target;
    if (x.dataset.fkc) { x.parentElement.style.setProperty('--sw', x.value); set('color', x.value); draw(); return; }
    if (x.dataset.fr) {
      const v = +x.value;
      x.style.setProperty('--p', Math.round(clamp((v - x.min) / ((x.max - x.min) || 1), 0, 1) * 1000) / 10 + '%');
      const out = x.parentElement.querySelector('output'); if (out) out.textContent = (x.step < 1 ? v.toFixed(2) : v) + (x.dataset.u || '');
      el.look = { ...(el.look || {}), [x.dataset.fr]: v };
      draw();
    }
  });
  ov.addEventListener('change', e => {
    const x = e.target;
    if (x.dataset.f3map && el.look && el.look.model) {
      const map = { ...(el.look.model.map || {}) };
      if (x.value === '') delete map[x.dataset.f3map]; else { const v = +x.value; for (const [j, i] of Object.entries(map)) if (i === v) delete map[j]; map[x.dataset.f3map] = v; }
      el.look = { ...el.look, model: { ...el.look.model, map } }; paint(); draw(); return;
    }
    if (x.dataset.f3by != null && el.look && el.look.model) { el.look = { ...el.look, model: { ...el.look.model, by: x.value.trim().slice(0, 200) } }; return; }
    if (x.dataset.fs) el.look = { ...(el.look || {}), sizes: { ...((el.look || {}).sizes || {}), [x.dataset.fs]: x.value.trim() } };
    if (x.dataset.fkc) { set('color', x.value); paint(); draw(); }
  });
  // la biblioteca vive en el.look: «Guardar» la confirma y «Cancelar» la descarta, como el resto de la ficha
  const setFaces = (faces, eyes, gl) => {
    const lk = el.look = { ...(el.look || {}), faces };
    if (!Object.keys(faces).length) delete lk.faces;
    if (eyes === false) lk.eyes = false; else delete lk.eyes;
    if (gl !== undefined) { if (gl) lk.glasses = gl; else delete lk.glasses; }
  };
  function exprAct(b) {
    const lk = lookOf({ kind: 'actor', el: id }), faces = { ...(lk.faces || {}) }, eyes = lk.eyes !== false, who = titleCase(el.name);
    const a = b.dataset.fe;
    if (a === 'eyes') { setFaces(faces, b.dataset.v === '1'); paint(); draw(); return; }
    if (a === 'glasses') { setFaces(faces, eyes, b.dataset.v); paint(); draw(); return; }
    if (a === 'del') { delete faces[ex]; if (ex.slice(0, 2) === 'c:') ex = 'neutral'; setFaces(faces, eyes); paint(); draw(); return; }
    const isNew = a === 'new', own = !isNew && faces[ex];
    const d = own ? JSON.parse(JSON.stringify(own)) : { name: '', base: isNew ? (ex.slice(0, 2) === 'c:' || ex.slice(0, 2) === 'f:' ? '' : ex) : ex.slice(0, 2) === 'c:' ? '' : ex, strokes: [] };
    openExprEditor({ anchor: b, title: isNew ? 'Nueva expresión' : `Editar «${exprLabel(ex, lk)}»`, sub: who, d, named: isNew || ex.slice(0, 2) === 'c:', eyes, glasses: lk.glasses || '', ob: 'a0', live: draw,
      save: (nd, ey, gl) => {
        const f2 = { ...((el.look || {}).faces || {}) };
        let key = isNew ? 'c:' + uid('x') : ex;
        if (key.slice(0, 2) === 'f:') key = 'c:' + uid('x');   // una del proyecto: la versión queda en la ficha
        if (key.slice(0, 2) === 'c:' && !nd.name) nd.name = 'Expresión ' + (Object.keys(f2).filter(x => x.slice(0, 2) === 'c:').length + 1);
        f2[key] = nd; setFaces(f2, ey, gl); ex = key; paint(); draw();
      } });
  }
  paint(); draw();
}
Object.assign(ACT, {
  fichas: b => fichasMenu(b),
  ficha: b => openFicha(b.dataset.id),
});
