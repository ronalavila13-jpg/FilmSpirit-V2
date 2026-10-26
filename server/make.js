/* ============================================================
   Prepara la web app del servidor
   Uso (desde la carpeta del proyecto):  node server/make.js
     1. compila la app para el servidor (sh build.sh server)
     2. copia librerías, fuentes, maniquíes 3D y la marca a server/public
     3. copia las reglas de áreas del desglose (las aplica también el servidor)
   Después, la carpeta server/ completa es lo que se sube a la VPS.
   ============================================================ */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const here = __dirname, root = path.join(here, '..');
const pub = path.join(here, 'public');
const cp = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };

execSync('sh build.sh server', { cwd: root, stdio: 'inherit' });
cp(path.join(root, 'src', 'areas.js'), path.join(here, 'areas.js'));

for (const [f, t] of [
  ['node_modules/jspdf/dist/jspdf.umd.min.js', 'app/lib/jspdf.umd.min.js'],
  ['node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js', 'app/lib/jspdf.plugin.autotable.min.js'],
  ['node_modules/three/build/three.min.js', 'app/lib/three.min.js'],
  ['node_modules/pdfjs-dist/build/pdf.min.js', 'app/lib/pdf.min.js'],
  ['node_modules/pdfjs-dist/build/pdf.worker.min.js', 'app/lib/pdf.worker.min.js'],
]) cp(path.join(root, f), path.join(pub, t));
// el mapa general del scouting (Leaflet 1.9.4, BSD-2): guardado en tools/leaflet; se carga solo al abrir el mapa
for (const f of ['leaflet.js', 'leaflet.css']) cp(path.join(root, 'tools', 'leaflet', f), path.join(pub, 'app', 'lib', f));

// fuentes: las mismas de la app de escritorio (Archivo y Courier Prime, SIL OFL)
const fonts = path.join(root, 'desktop', 'app', 'fonts');
if (!fs.existsSync(path.join(fonts, 'fonts.css'))) throw new Error('Faltan las fuentes: ejecuta antes «cd desktop && node make.js --solo-app».');
for (const f of fs.readdirSync(fonts)) cp(path.join(fonts, f), path.join(pub, 'app', 'fonts', f));

// marca: ícono y logotipos para la portada
// ícono de la pestaña: baldosa blanca con la marca (se ve en pestañas claras y oscuras); sale de desktop/marca/favicon.py
for (const f of fs.readdirSync(path.join(root, 'desktop', 'marca', 'web'))) cp(path.join(root, 'desktop', 'marca', 'web', f), path.join(pub, f));
for (const f of fs.readdirSync(path.join(root, 'desktop', 'marca', 'svg'))) cp(path.join(root, 'desktop', 'marca', 'svg', f), path.join(pub, 'marca', f));
// la letra de los titulares de la portada (FilmSpirit Recorte, desktop/marca/recorte.py)
cp(path.join(root, 'desktop', 'marca', 'recorte', 'FilmSpiritRecorte-Regular.woff2'), path.join(pub, 'marca', 'FilmSpiritRecorte-Regular.woff2'));

// páginas del sitio (portada, entrar, legales): el logotipo se inserta en vector
{
  const vm = require('node:vm'), ctx = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src', 'marca.js'), 'utf8') + '\nthis.logoSVG = logoSVG; this.markSVG = markSVG;', ctx);
  const web = path.join(here, 'web');
  fs.rmSync(path.join(pub, 'portada'), { recursive: true, force: true });   // sin los videos e imágenes que la portada ya no usa
  const copyWeb = (rel) => {
    for (const e of fs.readdirSync(path.join(web, rel), { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) { fs.mkdirSync(path.join(pub, r), { recursive: true }); copyWeb(r); continue; }
      const text = /\.(html|css|js|txt|svg|json)$/.test(e.name);
      let txt = fs.readFileSync(path.join(web, r), text ? 'utf8' : null);
      if (text) txt = txt.replace(/__LOGO_PRO__/g, () => ctx.logoSVG('pro')).replace(/__LOGO_FREE__/g, () => ctx.logoSVG('free')).replace(/__LOGO_STUDIO__/g, () => ctx.logoSVG('studio')).replace(/__LOGO_INDIE__/g, () => ctx.logoSVG('indie')).replace(/__LOGO__/g, () => ctx.logoSVG(''));
      fs.writeFileSync(path.join(pub, r), txt);
    }
  };
  copyWeb('');
}

// trabajo sin conexión: el service worker guarda la app (página, código, librerías, fuentes, maniquíes)
{
  const crypto = require('node:crypto');
  const app = path.join(pub, 'app'), files = [];
  const walk = (d, rel) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const r = rel + '/' + e.name; if (e.isDirectory()) walk(path.join(d, e.name), r); else if (e.name !== 'sw.js') files.push(r); } };
  walk(app, '/app');
  const h = crypto.createHash('sha256');
  for (const f of files) h.update(f).update(fs.readFileSync(path.join(pub, f)));
  const core = ['/app/', ...files.filter(f => f !== '/app/index.html'), '/favicon.svg'];
  const sw = fs.readFileSync(path.join(here, 'sw-plantilla.js'), 'utf8')
    .replace('__VERSION__', h.digest('hex').slice(0, 12))
    .replace('__CORE__', JSON.stringify(core));
  fs.writeFileSync(path.join(app, 'sw.js'), sw);
}

// licencias de terceros
const lic = (title, file) => `==== ${title} ====\n\n${fs.readFileSync(file, 'utf8').trim()}\n\n`;
const rnm = p => path.join(root, 'node_modules', p), dnm = p => path.join(root, 'desktop', 'node_modules', p);
fs.writeFileSync(path.join(pub, 'licencias.txt'),
  'FilmSpirit usa el siguiente software y fuentes de terceros. Gracias a sus autores.\n\n' +
  lic('three.js 0.159.0 (MIT)', rnm('three/LICENSE')) +
  lic('jsPDF 4.2.1 (MIT)', rnm('jspdf/LICENSE')) +
  lic('jsPDF-AutoTable 5.0.9 (MIT)', rnm('jspdf-autotable/LICENSE.txt')) +
  lic('PDF.js 3.11.174 (Apache 2.0)', rnm('pdfjs-dist/LICENSE')) +
  // los lectores de modelos 3D (src/glb-lib.js): meshoptimizer y fflate (que usa el lector de FBX de three.js)
  lic('meshoptimizer 1.1.1 (MIT)', path.join(root, 'tools', 'licencias', 'meshoptimizer.txt')) +
  lic('fflate 0.6.9 (MIT)', path.join(root, 'tools', 'licencias', 'fflate.txt')) +
  lic('Leaflet 1.9.4 (BSD 2-Clause)', path.join(root, 'tools', 'licencias', 'leaflet.txt')) +
  '==== Mapas ====\n\nTeselas del mapa general del scouting: © colaboradores de OpenStreetMap (openstreetmap.org/copyright), datos con licencia ODbL.\n\n' +
  '==== Maniquíes 3D ====\n\nMalla base y esqueleto de MakeHuman / MPFB2 (makehumancommunity.org), activos con licencia CC0 1.0 (dominio público).\n\n' +
  (fs.existsSync(dnm('@fontsource-variable/archivo/LICENSE')) ? lic('Fuente Archivo (SIL Open Font License 1.1)', dnm('@fontsource-variable/archivo/LICENSE')) + lic('Fuente Courier Prime (SIL Open Font License 1.1)', dnm('@fontsource/courier-prime/LICENSE'))
    : '==== Fuentes Archivo y Courier Prime ====\n\nSIL Open Font License 1.1\n') +
  lic('Fuente Familjen Grotesk (SIL Open Font License 1.1)', path.join(root, 'desktop', 'fuentes', 'familjen-grotesk-OFL.txt')) +
  // las otras letras de Apariencia › Letra (las mismas de desktop/make.js; las arma tools/fuentes.py)
  [['Newsreader', 'newsreader'], ['Instrument Sans', 'instrument-sans'], ['Archivo Narrow', 'archivo-narrow'], ['Bricolage Grotesque', 'bricolage-grotesque'], ['Rubik', 'rubik'], ['Shantell Sans', 'shantell-sans']]
    .map(([n, slug]) => lic(`Fuente ${n} (SIL Open Font License 1.1)`, path.join(root, 'desktop', 'fuentes', slug + '-OFL.txt'))).join(''));

const size = d => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`Listo: server/public (${(size(pub) / 1048576).toFixed(1)} MB). Sube la carpeta server/ a la VPS.`);
