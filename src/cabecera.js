/* ============================================================
   CABECERAS · el título grande de cada pestaña y sus piezas (estilo Apple, lote I · octubre de 2026)
   El título va a la izquierda, sobre el fondo de la página (no dentro de una tarjeta), con lo propio de la pestaña: el
   día, la escena, el lugar, el total. Debajo, en gris, el contexto. Los avisos son un botón chico junto al título; los
   datos, listas como las de Ajustes (la etiqueta a la izquierda, el dato a la derecha); un campo vacío dice qué va
   ahí (sin cursiva, sin «—»); lo que se agrega es una fila con «+». Aquí solo se arma el HTML: cada pestaña pone sus
   propios campos (los mismos inputs y data-bind de siempre) y sus acciones (data-act). El CSS, en shell.html
   («cabeceras»).
   ============================================================ */
/* íconos que no están en ICO (mismo trazo) */
const HD_ICO = {
  info: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6h.01"/></svg>',
  doc: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3h7L18 7.5v12A1.5 1.5 0 0 1 16.5 21h-10A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z"/><path d="M13 3v5h5M8.5 12.5h7M8.5 16h5"/></svg>',
  people: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5"/><path d="M15.5 5.3a3.5 3.5 0 0 1 0 6.4M17.5 14.8c2 .7 3.4 2.6 4 5.2"/></svg>',
  cal: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  refresh: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg>',
  photo: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-8 8"/></svg>',
};
const hdIco = k => HD_ICO[k] || ICO[k] || '';
/* ‹ › junto al título: cada uno, los atributos del botón (data-act…) o null si no hay a dónde ir */
function hdStep(prev, next, what = 'jornada') {
  const b = (a, ico, lab) => `<button type="button" class="hd-stepb" ${a || 'disabled'} aria-label="${ea(lab)}" title="${ea(lab)}">${ico}</button>`;
  return `<span class="hd-step">${b(prev, ICO.prev, what === 'mes' ? 'Anterior' : `${capFirst(what)} anterior`)}${b(next, ICO.next, what === 'mes' ? 'Siguiente' : `${capFirst(what)} siguiente`)}</span>`;
}
/* el título: o = { title (HTML), sub (HTML), md (más chico), step (HTML de hdStep), menu (atributos: el título abre un
   menú, con ⌄), act (HTML a la derecha), cls } */
function hdHead(o) {
  const t = o.menu ? `<button type="button" class="hd-menu" ${o.menu}>${o.title}${ICO.chev}</button>` : o.title;
  return `<header class="hd-hd${o.cls ? ' ' + o.cls : ''}"><div class="hd-tt"><h2 class="hd-title${o.md ? ' md' : ''}">${t}${o.step || ''}</h2>${o.sub ? `<p class="hd-sub">${o.sub}</p>` : ''}</div>${o.act ? `<div class="hd-act">${o.act}</div>` : ''}</header>`;
}
/* un aviso como botón chico: kind 'warn' (con su número), 'ok', 'info'; o = { n, attrs, chev } */
function hdPill(kind, text, o = {}) {
  const lead = o.n != null ? `<span class="n tnum">${o.n}</span>` : kind === 'ok' ? ICO.ok : kind === 'info' ? HD_ICO.info : '';
  const tag = o.attrs ? 'button' : 'span';
  return `<${tag}${tag === 'button' ? ' type="button"' : ''} class="hd-pill ${kind}" ${o.attrs || ''}>${lead}<span>${text}</span>${o.chev ? ICO.chev : ''}</${tag}>`;
}
/* botón de pastilla: kind 'pri' | 'sec' | 'tint'; o = { icon, attrs, sm, href, cls } */
function hdBtn(kind, text, o = {}) {
  const in_ = `${o.icon ? hdIco(o.icon) : ''}<span>${text}</span>`;
  const cls = `hd-btn ${kind}${o.sm ? ' sm' : ''}${o.cls ? ' ' + o.cls : ''}`;
  return o.href ? `<a class="${cls}" href="${ea(o.href)}" target="_blank" rel="noopener noreferrer" ${o.attrs || ''}>${in_}</a>`
    : `<button type="button" class="${cls}" ${o.attrs || ''}>${in_}</button>`;
}
/* control segmentado: items = [{ label, attrs, on }] */
// en el teléfono, la barra lo vuelve un selector, como a los «seg» de siempre (phoneBars)
const hdSeg = (items, lab = '') => `<span class="hd-seg" role="group"${lab ? ` aria-label="${ea(lab)}"` : ''}>${items.map(x => `<button type="button" aria-pressed="${x.on ? 'true' : 'false'}" ${x.attrs || ''}>${x.label}</button>`).join('')}</span>`;
/* buscador: envuelve el input de siempre con la lupa */
const hdSearch = input => `<label class="hd-search">${ICO.search}${input}</label>`;
/* la tarjeta principal: cols = [{ lab, val (HTML), cls ('big'|'mid'), tag, cap, wide, html }] */
const hdPass = cols => `<div class="hd-pass">${cols.map(c => `<div class="hd-pc${c.wide ? ' wide' : ''}">${c.lab ? `<div class="hd-lab">${c.lab}</div>` : ''}${c.val != null ? `<div class="hd-${c.cls || 'mid'}">${c.val}${c.tag ? ` <span class="hd-tag">${c.tag}</span>` : ''}</div>` : ''}${c.html || ''}${c.cap ? `<div class="hd-cap">${c.cap}</div>` : ''}</div>`).join('')}</div>`;
/* listas agrupadas: cada grupo con su título; cols = cuántas columnas en la computadora */
const hdGroups = (gs, cols) => `<div class="hd-groups" style="--hd-cols:${cols || gs.length}">${gs.filter(Boolean).join('')}</div>`;
const hdGroup = (title, inner, o = {}) => `<div class="hd-g${o.cls ? ' ' + o.cls : ''}">${title ? `<h3>${title}${o.small ? ` <small>${o.small}</small>` : ''}</h3>` : ''}<div class="hd-box">${inner}</div></div>`;
/* una fila: la etiqueta y el dato (texto o el campo de siempre); o = { st: 'ph' (vacío) | 'miss' (falta), tag, chev,
   cls, attrs (fila tocable), lab (HTML extra bajo la etiqueta) } */
function hdRow(label, val, o = {}) {
  const field = /<(input|textarea|select)\b/.test(val);
  const v = o.st === 'miss' && !field ? `<span class="hd-dot" aria-hidden="true"></span>${val}` : val;
  // con un campo, toda la fila es su etiqueta: un toque en el nombre escribe en el campo
  const tag = o.attrs ? 'button' : field ? 'label' : 'div';
  return `<${tag}${tag === 'button' ? ' type="button"' : ''} class="hd-row${o.cls ? ' ' + o.cls : ''}" ${o.attrs || ''}><span class="k">${label}${o.lab ? `<small>${o.lab}</small>` : ''}</span><span class="v${o.st ? ' ' + o.st : ''}">${v}${o.tag ? ` <span class="hd-tag">${o.tag}</span>` : ''}</span>${o.chev ? `<span class="chev">${ICO.next}</span>` : ''}</${tag}>`;
}
/* el campo de hora (tmIn) con una clase más: 'hd-auto' cuando lo que se ve es lo calculado (del plan, de Proyecto) */
const hdAuto = (html, on) => on ? html.replace(/class="tm"/, 'class="tm hd-auto"') : html;
/* fila «+»: abre los campos de algo vacío; tone: color del círculo (una categoría, la nota) */
const hdAdd = (title, sub, attrs, tone) => `<button type="button" class="hd-add" ${attrs || ''}${tone ? ` style="--hd-tone:${ea(tone)}"` : ''}><span class="hd-pl${tone ? ' tone' : ''}">${ICO.plus}</span><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span></button>`;
/* vacío de una sección entera: ícono en círculo, título, una frase y el botón */
const hdEmpty = o => `<div class="hd-empty"><span class="hd-ico">${hdIco(o.icon || 'photo')}</span><h3>${o.title}</h3>${o.text ? `<p>${o.text}</p>` : ''}${o.btn || ''}</div>`;
/* consejo de uso que se cierra: attrs, los del ✕ (el data-act de siempre) */
const hdTip = (text, attrs) => `<div class="hd-tip">${HD_ICO.info}<span>${text}</span>${attrs ? `<button type="button" ${attrs} aria-label="Cerrar" title="Cerrar">${ICO.close}</button>` : ''}</div>`;
/* la lista desplegable de un aviso (los pendientes): items = [{ txt, sub, attrs }] */
const hdPopList = (title, items, foot) => `<h3 class="hd-poph">${title}</h3><div class="hd-popl">${items.map(x => `<button type="button" class="hd-row" ${x.attrs || ''}><span class="hd-dot" aria-hidden="true"></span><span class="k">${x.txt}${x.sub ? `<small>${x.sub}</small>` : ''}</span><span class="chev">${ICO.next}</span></button>`).join('')}</div>${foot ? `<footer class="hd-popf">${foot}</footer>` : ''}`;
/* la cabecera de una lista de la izquierda (escenas, lugares, personajes): su título con la cuenta y el buscador */
const hdSide = (title, count, ph) => `<div class="side-head hd-side"><h2 class="hd-sidet">${title}${count ? ` <small>${count}</small>` : ''}</h2>${hdSearch(`<input type="text" id="sceneQ" placeholder="${ea(ph)}" aria-label="${ea(ph)}" autocomplete="off">`)}</div>`;
