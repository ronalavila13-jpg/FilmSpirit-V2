/* ============================================================
   IMÁGENES QUE SE SUBEN · toda imagen que entra al programa pasa por aquí antes de guardarse: WebP con calidad 90 %.
   La usan las fotos del desglose (láminas), scouting, casting, hoja de llamado y gastos (compressPhoto, laminas.js),
   las viñetas y fotos del storyboard, el dibujo 2D, las fotos del personaje, los planos de planta y los logos.
   La calidad es siempre 90 %, sin tope de peso (el lado mayor sí tiene tope: IMG_MAX). Solo con o.top (las texturas de un
   modelo 3D, que no pasan de lo que acepta el servidor) busca la mejor calidad que entra y, si no, achica la imagen.
   Safari no genera WebP desde el navegador: ahí sale en JPEG con calidad 90 % (o PNG si tiene transparencia, con tope).
   ============================================================ */
const IMG_TOP = 170 * 1024;   // el tamaño al que se apunta en un PNG (sin WebP) y en las texturas de los modelos
const IMG_MAX = 1600;         // lado mayor de una foto
const IMG_WEBP = (() => { try { const c = document.createElement('canvas'); c.width = c.height = 2; return c.toDataURL('image/webp').startsWith('data:image/webp'); } catch (e) { return false; } })();
const imgBytes = u => u ? Math.round((u.length - u.indexOf(',') - 1) * 3 / 4) : 0;
function imgScaled(src, f) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(src.width * f)); c.height = Math.max(1, Math.round(src.height * f));
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
/* un lienzo → { url, w, h } en WebP con calidad 90 %.
   o.top: pesa a lo más eso (baja la calidad y, si hace falta, achica) · o.alpha: conserva la transparencia (sin WebP, PNG) ·
   o.fixed: con o.top, nunca achica (solo baja la calidad) · o.maxQ: otra calidad (por defecto .9) */
function imgEncode(c, o = {}) {
  const type = IMG_WEBP ? 'image/webp' : o.alpha ? 'image/png' : 'image/jpeg', top = o.top || IMG_TOP;
  const out = (cv, url) => ({ url, w: cv.width, h: cv.height });
  if (type !== 'image/png' && !o.top) return out(c, c.toDataURL(type, o.maxQ || .9));
  let cv = c;
  for (let pass = 0; pass < 8; pass++) {
    if (type === 'image/png') {
      const u = cv.toDataURL(type);
      if (imgBytes(u) <= top || o.fixed || cv.width * cv.height < 4e4) return out(cv, u);
      cv = imgScaled(cv, .8); continue;
    }
    const hiQ = o.maxQ || .9, loQ = .45;
    const u = cv.toDataURL(type, hiQ); if (imgBytes(u) <= top) return out(cv, u);
    let best = cv.toDataURL(type, loQ);
    if (imgBytes(best) > top) {
      if (o.fixed || cv.width * cv.height < 4e4) return out(cv, best);
      cv = imgScaled(cv, Math.max(.5, Math.min(.9, Math.sqrt(top / imgBytes(best))))); continue;
    }
    // la calidad más alta que no pasa del tope
    let lo = loQ, hi = hiQ;
    for (let i = 0; i < 5; i++) { const q = (lo + hi) / 2, v = cv.toDataURL(type, q); if (imgBytes(v) <= top) { best = v; lo = q; } else hi = q; }
    return out(cv, best);
  }
  return out(cv, cv.toDataURL(type, .45));
}
const imgUrl = (c, o) => imgEncode(c, o).url;
/* logos y planos: solo imágenes incrustadas (data:). Una dirección cualquiera haría que la app la pida al mostrarla:
   en el escritorio, file://servidor/... abre una conexión de red de Windows (y entrega la firma de la contraseña) */
const imgDataOk = u => typeof u === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]*$/i.test(u) ? u : '';
/* abre una imagen (archivo o dirección): respeta la orientación de las fotos del teléfono */
function imgLoad(src) {
  return new Promise((res, rej) => {
    const blob = typeof src !== 'string', u = blob ? URL.createObjectURL(src) : src, im = new Image();
    im.onload = () => { if (blob) URL.revokeObjectURL(u); res(im); };
    im.onerror = () => { if (blob) URL.revokeObjectURL(u); rej(new Error('imagen')); };
    im.src = u;
  });
}
/* un archivo → lienzo con su lado mayor hasta o.max (sin agrandar), sobre o.bg (blanco; null: transparente) */
async function imgCanvas(src, o = {}) {
  const im = await imgLoad(src), w0 = im.naturalWidth, h0 = im.naturalHeight, r = Math.min(1, (o.max || IMG_MAX) / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w0 * r)); c.height = Math.max(1, Math.round(h0 * r));
  const g = c.getContext('2d');
  if (o.bg !== null) { g.fillStyle = o.bg || '#FFFFFF'; g.fillRect(0, 0, c.width, c.height); }
  g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height);
  return c;
}
/* para los PDF: jsPDF pinta de negro lo transparente de un WebP; antes de exportar se hace una copia PNG de los
   logos en WebP (y se usa mientras no cambien) */
const IMG_PNG = new Map();
const pdfImgSrc = u => { const c = u && IMG_PNG.get(u); return c || imgDataOk(u); };
async function imgPrepPdf(list) {
  for (const u of list) {
    if (!u || !/^data:image\/webp/.test(u) || IMG_PNG.has(u)) continue;
    try { const im = await imgLoad(u), c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); IMG_PNG.set(u, c.toDataURL('image/png')); }
    catch (e) { }
  }
}
