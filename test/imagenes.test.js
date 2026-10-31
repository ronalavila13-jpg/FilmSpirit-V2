/* Las imágenes que se suben (src/imagenes.js): WebP con calidad 90 %, sin tope de peso (con o.top, el de las texturas de un modelo, sí).
   Con un lienzo de mentira: el «archivo» pesa según los píxeles y la calidad.  node test/imagenes.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

function load(webp) {
  const calls = [];
  // bytes = píxeles × calidad × k (PNG: sin calidad, el doble que la calidad más alta)
  const canvas = (w = 2, h = 2, k = 1) => ({
    width: w, height: h, k,
    getContext: () => ({ drawImage() { }, fillRect() { }, set imageSmoothingQuality(v) { } }),
    toDataURL(type, q) {
      calls.push([type, q, this.width, this.height]);
      const t = type === 'image/webp' && !webp ? 'image/png' : type;
      const bytes = Math.round(this.width * this.height * (t === 'image/png' ? 2 : (q == null ? .92 : q)) * this.k);
      return `data:${t};base64,` + 'A'.repeat(Math.ceil(bytes * 4 / 3));
    },
  });
  const c = { Math, Promise, document: { createElement: () => canvas() } };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(R + '/src/imagenes.js', 'utf8') + '\nObject.assign(globalThis, { IMG_TOP, IMG_WEBP, imgEncode, imgBytes });', c);
  return { c, canvas, calls };
}
const KB = 1024;

test('una foto grande: WebP con calidad 90 %, de una sola vez y sin achicarla', () => {
  const { c, canvas, calls } = load(true);
  assert.strictEqual(c.IMG_WEBP, true);
  const n0 = calls.length;
  const r = c.imgEncode(canvas(1600, 1200, .6));   // pesa más de 170 kB: igual no se toca la calidad
  assert.ok(r.url.startsWith('data:image/webp'));
  assert.ok(c.imgBytes(r.url) > 170 * KB, 'sin tope de peso');
  assert.strictEqual(calls.length - n0, 1);
  assert.strictEqual(calls[n0][1], .9);
  assert.deepStrictEqual([r.w, r.h], [1600, 1200]);
});

test('una imagen liviana no se infla: calidad 90 y listo', () => {
  const { c, canvas, calls } = load(true);
  const n0 = calls.length;   // (la primera es la prueba de si hay WebP)
  const r = c.imgEncode(canvas(800, 450, .1));
  assert.ok(c.imgBytes(r.url) < 40 * KB);
  assert.strictEqual(calls.length - n0, 1);
  assert.strictEqual(calls[n0][1], .9);
});

test('con o.top: la mejor calidad que entra; si ni con calidad baja entra, se achica y vuelve a probar', () => {
  const { c, canvas } = load(true);
  const a = c.imgEncode(canvas(1600, 1200, .2), { top: 170 * KB });   // 1,92 MP × q × .2 → q ≈ .45 entra en 170 kB
  assert.ok(c.imgBytes(a.url) <= 170 * KB && c.imgBytes(a.url) > 150 * KB, `pesa ${Math.round(c.imgBytes(a.url) / KB)} kB`);
  const r = c.imgEncode(canvas(4000, 3000, 1), { top: 170 * KB });
  assert.ok(c.imgBytes(r.url) <= 170 * KB, `pesa ${Math.round(c.imgBytes(r.url) / KB)} kB`);
  assert.ok(Math.abs(r.w / r.h - 4 / 3) < .01, 'mantiene la proporción');
});

test('fixed con o.top: nunca achica (solo baja la calidad)', () => {
  const { c, canvas } = load(true);
  const r = c.imgEncode(canvas(4000, 3000, 1), { top: 170 * KB, fixed: true });
  assert.deepStrictEqual([r.w, r.h], [4000, 3000]);
});

test('sin WebP (Safari): JPEG con calidad 90 %; con transparencia, PNG con tope', () => {
  const { c, canvas, calls } = load(false);
  assert.strictEqual(c.IMG_WEBP, false);
  const r = c.imgEncode(canvas(1600, 1200, .2));
  assert.ok(r.url.startsWith('data:image/jpeg') && calls[calls.length - 1][1] === .9);
  const a = c.imgEncode(canvas(600, 300, 1), { alpha: true });
  assert.ok(a.url.startsWith('data:image/png') && c.imgBytes(a.url) <= 170 * KB);
});

test('todas las subidas pasan por imagenes.js (nada de toDataURL suelto en ellas)', () => {
  const src = f => fs.readFileSync(R + '/src/' + f, 'utf8');
  assert.ok(/imgEncode\(await imgCanvas\(file/.test(src('laminas.js')), 'desglose, scouting, casting, hoja de llamado y gastos');
  assert.ok(/E\.ref = imgUrl\(c\)/.test(src('shot-editor.js')), 'foto del plano');
  assert.ok(/ok\(imgUrl\(c\)\)/.test(src('tab-board.js')), 'planos desde imágenes');
  assert.ok(/imgUrl\(c, \{ alpha: true \}\)/.test(src('tab-project.js')), 'logos');
  assert.ok(/imgUrl\(c, \{ alpha: true \}\)/.test(src('charphoto.js')), 'fotos del personaje');
  assert.ok(/img: imgUrl\(c, \{ fixed: true \}\)/.test(src('floorplan.js')), 'planos de planta');
  assert.ok(/L\.kind === 'image' \? imgUrl\(c, \{ alpha: true, fixed: true \}\)/.test(src('s2d-editor.js')), 'imagen en el dibujo 2D');
  assert.ok(/\bimagenes\b/.test(fs.readFileSync(R + '/build.sh', 'utf8')), 'va en la compilación');
});

test('la foto en grande se abre con las demás de su tarjeta, para pasar con las flechas', () => {
  const src = f => fs.readFileSync(R + '/src/' + f, 'utf8');
  const L = src('laminas.js');
  assert.ok(/function photoViewer\(src, name, opt = \{\}\)/.test(L) && /ArrowLeft/.test(L) && /ArrowRight/.test(L), 'flechas del teclado');
  assert.ok(/class="ph-nav prev"/.test(L) && /class="ph-nav next"/.test(L) && /ph-n/.test(L), 'botones ‹ › y «2 de 5»');
  assert.ok(/framesNeed\(\[k\]\)/.test(L), 'pide las que todavía no llegaron');
  for (const [f, re] of [['tab-scout.js', /'sc-view'[^\n]*photoViewer\(ks,/], ['tab-casting.js', /'ca-view'[^\n]*photoViewer\(ks,/], ['tab-call.js', /'cl-view'[^\n]*photoViewer\(ks,/], ['laminas.js', /photoViewer\(ks, e \? e\.name/]])
    assert.ok(re.test(src(f)), 'con la lista de fotos en ' + f);
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
