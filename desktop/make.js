/* ============================================================
   Construye la app de escritorio a partir de brand.json
   Uso:  node make.js            → instalador de Windows (dist/)
         node make.js --linux    → carpeta de prueba para Linux
         node make.js --solo-app → solo prepara app/ (para probar con electron .)
   Para cambiar el nombre del producto: edita brand.json y vuelve a ejecutar.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const B = require('./brand.json');
const here = __dirname, root = path.join(here, '..');
const args = process.argv.slice(2);

// 1) interfaz con todo local
execSync('sh build.sh desktop', { cwd: root, stdio: 'inherit' });
// reglas de las áreas del desglose: las usa también el proceso principal (team.js)
fs.copyFileSync(path.join(root, 'src', 'areas.js'), path.join(here, 'areas.js'));
const cp = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
for (const [f, t] of [
  ['node_modules/jspdf/dist/jspdf.umd.min.js', 'app/lib/jspdf.umd.min.js'],
  ['node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js', 'app/lib/jspdf.plugin.autotable.min.js'],
  ['node_modules/three/build/three.min.js', 'app/lib/three.min.js'],
  // lector de PDF para importar guiones (se carga solo al importar uno)
  ['node_modules/pdfjs-dist/build/pdf.min.js', 'app/lib/pdf.min.js'],
  ['node_modules/pdfjs-dist/build/pdf.worker.min.js', 'app/lib/pdf.worker.min.js'],
]) cp(path.join(root, f), path.join(here, t));
// el mapa general del scouting (Leaflet 1.9.4, BSD-2): guardado en tools/leaflet; se carga solo al abrir el mapa
for (const f of ['leaflet.js', 'leaflet.css']) cp(path.join(root, 'tools', 'leaflet', f), path.join(here, 'app', 'lib', f));

// 1b) fuentes de la interfaz y del guion (index.html carga fonts/fonts.css; sin internet)
// las otras letras de Apariencia › Tu pantalla › Letra: [familia, archivo, pesos] (en desktop/fuentes, OFL)
const FONTS_X = [['Newsreader', 'newsreader', '400 700'], ['Instrument Sans', 'instrument-sans', '400 700'], ['Archivo Narrow', 'archivo-narrow', '400 700'],
  ['Bricolage Grotesque', 'bricolage-grotesque', '400 700'], ['Rubik', 'rubik', '400 700'], ['Shantell Sans', 'shantell-sans', '400 700']];
{
  const LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
  const EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
  const css = [];
  const face = (fam, file, from, style, weight, extra, range) => {
    cp(path.join(here, 'node_modules', from, 'files', file), path.join(here, 'app', 'fonts', file));
    css.push(`@font-face{font-family:'${fam}';font-style:${style};font-weight:${weight};${extra}font-display:swap;src:url(${file}) format('woff2');unicode-range:${range}}`);
  };
  for (const [sub, range] of [['latin-ext', EXT], ['latin', LAT]]) {
    face('Archivo', `archivo-${sub}-wdth-normal.woff2`, '@fontsource-variable/archivo', 'normal', '100 900', 'font-stretch:62% 125%;', range);
    for (const [w, st] of [[400, 'normal'], [400, 'italic'], [700, 'normal'], [700, 'italic']])
      face('Courier Prime', `courier-prime-${sub}-${w}-${st}.woff2`, '@fontsource/courier-prime', st, w, '', range);
  }
  // los títulos: Familjen Grotesk (OFL), guardada en desktop/fuentes (no depende de npm)
  for (const [sub, range] of [['latin-ext', EXT], ['latin', LAT]]) {
    const file = `familjen-grotesk-${sub}-wght-normal.woff2`;
    cp(path.join(here, 'fuentes', file), path.join(here, 'app', 'fonts', file));
    css.push(`@font-face{font-family:'Familjen Grotesk';font-style:normal;font-weight:400 700;font-display:swap;src:url(${file}) format('woff2');unicode-range:${range}}`);
  }
  // las otras tipografías de la interfaz (Apariencia › Tu pantalla › Letra), guardadas en desktop/fuentes (OFL)
  // (las arma tools/fuentes.py desde Google Fonts: peso variable de 400 a 700)
  for (const [fam, slug, w] of FONTS_X)
    for (const [sub, range] of [['latin-ext', EXT], ['latin', LAT]]) {
      const file = `${slug}-${sub}-wght-normal.woff2`;
      cp(path.join(here, 'fuentes', file), path.join(here, 'app', 'fonts', file));
      css.push(`@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(${file}) format('woff2');unicode-range:${range}}`);
    }
  fs.writeFileSync(path.join(here, 'app', 'fonts', 'fonts.css'), css.join('\n') + '\n');
}

// 2) licencias de terceros (se muestran en «Acerca de» y van dentro del programa)
const lic = (title, file) => `==== ${title} ====\n\n${fs.readFileSync(file, 'utf8').trim()}\n\n`;
const nm = p => path.join(here, 'node_modules', p), rnm = p => path.join(root, 'node_modules', p);
fs.writeFileSync(path.join(here, 'LICENCIAS-DE-TERCEROS.txt'),
  `${B.name} incluye el siguiente software y fuentes de terceros. Gracias a sus autores.\n\n` +
  lic('Electron (MIT)', nm('electron/LICENSE')) +
  'Chromium y sus componentes: ver LICENSES.chromium.html en la carpeta del programa.\n\n' +
  lic('three.js 0.159.0 (MIT)', rnm('three/LICENSE')) +
  lic('jsPDF 4.2.1 (MIT)', rnm('jspdf/LICENSE')) +
  lic('jsPDF-AutoTable 5.0.9 (MIT)', rnm('jspdf-autotable/LICENSE.txt')) +
  lic('PDF.js 3.11.174 (Apache 2.0)', rnm('pdfjs-dist/LICENSE')) +
  // los lectores de modelos 3D (src/glb-lib.js): meshoptimizer y fflate (que usa el lector de FBX de three.js)
  lic('meshoptimizer 1.1.1 (MIT)', path.join(root, 'tools', 'licencias', 'meshoptimizer.txt')) +
  lic('fflate 0.6.9 (MIT)', path.join(root, 'tools', 'licencias', 'fflate.txt')) +
  lic('Leaflet 1.9.4 (BSD 2-Clause)', path.join(root, 'tools', 'licencias', 'leaflet.txt')) +
  '==== Mapas ====\n\nTeselas del mapa general del scouting: © colaboradores de OpenStreetMap (openstreetmap.org/copyright), datos con licencia ODbL.\n\n' +
  lic('TweetNaCl.js 1.0.3 (dominio público / Unlicense)', nm('tweetnacl/LICENSE')) +
  '==== Maniquíes 3D ====\n\nMalla base y esqueleto de MakeHuman / MPFB2 (makehumancommunity.org), activos con licencia CC0 1.0 (dominio público).\n\n' +
  lic('Fuente Archivo (SIL Open Font License 1.1)', nm('@fontsource-variable/archivo/LICENSE')) +
  lic('Fuente Courier Prime (SIL Open Font License 1.1)', nm('@fontsource/courier-prime/LICENSE')) +
  lic('Fuente Familjen Grotesk (SIL Open Font License 1.1)', path.join(here, 'fuentes', 'familjen-grotesk-OFL.txt')) +
  FONTS_X.map(([n, slug]) => lic(`Fuente ${n} (SIL Open Font License 1.1)`, path.join(here, 'fuentes', slug + '-OFL.txt'))).join(''));

// 2a) gráficos de la marca: el logotipo va en el código (src/marca.js); estos PNG son para el emisor de licencias
fs.rmSync(path.join(here, 'app', 'brand'), { recursive: true, force: true });   // logos en PNG de versiones anteriores
const dataUrl = f => 'data:image/png;base64,' + fs.readFileSync(path.join(here, 'marca', f)).toString('base64');

// 2b) emisor de licencias con la clave pública de esta marca
fs.writeFileSync(path.join(here, 'tools', 'emisor-de-licencias.html'), fs.readFileSync(path.join(here, 'tools', 'emisor-plantilla.html'), 'utf8')
  .replace('__NACL__', () => fs.readFileSync(nm('tweetnacl/nacl-fast.min.js'), 'utf8'))
  .replace(/__PUB__/g, B.publicKey).replace(/__NAME__/g, B.name).replace(/__EXT__/g, B.ext)
  .replace(/__KEYFILE__/g, B.name.toLowerCase() + '-clave-privada.json').replace('__LOGO__', () => dataUrl('logo.png')).replace('__LOGO_OSCURO__', () => dataUrl('logo-oscuro.png')));

// 2c) contrato de licencia del instalador
fs.writeFileSync(path.join(here, 'build', 'licencia.txt'), '\ufeff' + fs.readFileSync(path.join(here, 'build', 'licencia-plantilla.txt'), 'utf8')
  .replace(/__UPPER__/g, B.name.toUpperCase()).replace(/__NAME__/g, B.name));

// 3) package.json con los datos de la marca
const pkg = JSON.parse(fs.readFileSync(path.join(here, 'package.json'), 'utf8'));
Object.assign(pkg, {
  name: B.ext.toLowerCase(), productName: B.name, version: B.version, main: 'main.js',
  description: `${B.name} · producción audiovisual: desglose, storyboard 3D, animatic, plan de rodaje, presupuesto y hoja de script`,
  author: B.publisher,
});
pkg.build = {
  appId: B.appId, productName: B.name,
  copyright: `© ${new Date().getFullYear()} ${B.publisher}`,
  directories: { output: 'dist', buildResources: 'build' },
  files: ['main.js', 'preload.js', 'store.js', 'license.js', 'team.js', 'areas.js', 'brand.json', 'app/**/*', 'build/icon.png', 'LICENCIAS-DE-TERCEROS.txt'],
  asar: true,
  electronLanguages: ['es', 'es-419', 'en-US'],
  // .fsp y los .fmst de versiones anteriores
  fileAssociations: [...new Set([B.fileExt || B.ext, B.ext])].map(ext => ({ ext, name: `Proyecto de ${B.name}`, description: `Proyecto de ${B.name}`, icon: 'build/doc.ico', role: 'Editor' })),
  afterPack: 'build/afterPack.js',
  extraResources: [{ from: 'build/doc.ico', to: 'doc.ico' }],
  // el instalador lo arma build/instalador.nsi (makensis nativo: no hace falta Wine)
  win: { target: [{ target: 'dir', arch: ['x64'] }], icon: 'build/icon.ico', signAndEditExecutable: false },
  linux: { target: ['dir'], icon: 'build/icon.png', category: 'AudioVideo' },
};
fs.writeFileSync(path.join(here, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
if (args.includes('--solo-app')) { console.log('app/ listo'); process.exit(0); }

// 4) empaquetar
if (args.includes('--linux')) { execSync('npx electron-builder --linux dir --publish never', { cwd: here, stdio: 'inherit' }); process.exit(0); }
execSync('npx electron-builder --win dir --x64 --publish never', { cwd: here, stdio: 'inherit' });

// 5) instalador de Windows con NSIS
const os = require('os');
const cache = path.join(os.homedir(), '.cache', 'electron-builder', 'nsis', 'nsis-3.0.4.1');
const local = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache', 'nsis', 'nsis-3.0.4.1') : '';
const cands = [process.env.MAKENSIS, path.join(cache, process.platform === 'win32' ? 'makensis.exe' : process.platform === 'darwin' ? 'mac/makensis' : 'linux/makensis'), local && path.join(local, 'makensis.exe'), 'C:/Program Files (x86)/NSIS/makensis.exe'].filter(Boolean);
const makensis = cands.find(p => fs.existsSync(p)) || 'makensis';
const nsisDir = fs.existsSync(cache) ? cache : local && fs.existsSync(local) ? local : '';
const out = path.join(here, 'dist', `${B.name}-Instalador-${B.version}.exe`);
const defs = { APPNAME: B.name, VERSION: B.version, TRIAL: B.trialDays, PUBLISHER: B.publisher, APPID: B.appId, EXT: B.ext, FEXT: B.fileExt || B.ext, SRC: path.join(here, 'dist', 'win-unpacked').replace(/\\/g, '/'), OUTFILE: out };
const flags = Object.entries(defs).map(([k, v]) => `"-D${k}=${v}"`).join(' ');
console.log('  • instalador con', makensis);
execSync(`"${makensis}" -V2 ${flags} "${path.join(here, 'build', 'instalador.nsi')}"`, { stdio: 'inherit', env: { ...process.env, ...(nsisDir ? { NSISDIR: nsisDir } : {}) } });
console.log('  • listo:', out, Math.round(fs.statSync(out).size / 1048576) + ' MB');
