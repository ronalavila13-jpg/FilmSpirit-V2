/* ============================================================
   Proceso principal de la app de escritorio
   ============================================================ */
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const CFG = require('./brand.json');
const { ProjectStore } = require('./store');
const { License } = require('./license');
const { Team, safeFile } = require('./team');

app.setName(CFG.name);
if (process.platform === 'win32') app.setAppUserModelId(CFG.appId);
// carpeta de datos propia (permite pruebas aisladas con --user-data-dir)
const udArg = process.argv.find(a => a.startsWith('--datos='));
if (udArg) { app.setPath('userData', path.resolve(udArg.slice(8))); app.setPath('appData', path.join(path.resolve(udArg.slice(8)), 'appdata')); fs.mkdirSync(app.getPath('appData'), { recursive: true }); }
const docsArg = process.argv.find(a => a.startsWith('--proyectos='));

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

let win = null, store = null, lic = null, team = null, quitting = false;
// archivos de proyecto: .fsp («fileExt»); también abre los .fmst de versiones anteriores. «ext» sigue siendo el
// identificador del producto (lo usan las licencias y los proyectos compartidos)
const FEXT = String(CFG.fileExt || CFG.ext).toLowerCase();
const OPEN_EXTS = [...new Set([FEXT, String(CFG.ext).toLowerCase()])];
const ext = '.' + FEXT;
let pendingOpen = fileArg(process.argv);
function fileArg(argv) { return argv.slice(1).find(a => OPEN_EXTS.some(x => a.toLowerCase().endsWith('.' + x)) && fs.existsSync(a)) || null; }

app.on('second-instance', (e, argv) => {
  const f = fileArg(argv);
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); if (f) win.webContents.send('open-file', f); }
});
app.on('open-file', (e, f) => { e.preventDefault(); if (win) win.webContents.send('open-file', f); else pendingOpen = f; });

function send(ch, ...a) { if (win && !win.isDestroyed()) win.webContents.send(ch, ...a); }

function buildMenu() {
  const m = cmd => () => send('menu', cmd);
  const tpl = [
    {
      label: 'Archivo', submenu: [
        { label: 'Nuevo proyecto', accelerator: 'CmdOrCtrl+N', click: m('new') },
        { label: 'Importar guion…', accelerator: 'CmdOrCtrl+I', click: m('import') },
        { label: 'Abrir proyecto…', accelerator: 'CmdOrCtrl+O', click: m('open') },
        { type: 'separator' },
        { label: 'Guardar ahora', accelerator: 'CmdOrCtrl+S', click: m('save') },
        { label: 'Guardar como…', accelerator: 'CmdOrCtrl+Shift+S', click: m('saveas') },
        { label: 'Mostrar el archivo en la carpeta', click: m('reveal') },
        { label: 'Abrir la carpeta de respaldos', click: () => { const d = path.join(store.root, 'Respaldos'); fs.mkdirSync(d, { recursive: true }); shell.openPath(d); } },
        { type: 'separator' },
        { label: 'Datos del proyecto…', click: m('info') },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' },
      ],
    },
    {
      label: 'Editar', submenu: [
        { role: 'undo', label: 'Deshacer' }, { role: 'redo', label: 'Rehacer' }, { type: 'separator' },
        { role: 'cut', label: 'Cortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Pegar' }, { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    {
      label: 'Ver', submenu: [
        { label: 'Construcción', accelerator: 'CmdOrCtrl+Alt+1', click: () => send('menu', 'tab:build') },
        { label: 'Guion', accelerator: 'CmdOrCtrl+1', click: () => send('menu', 'tab:script') },
        { type: 'separator' },
        { label: 'Guion rayado', accelerator: 'CmdOrCtrl+Shift+1', click: () => send('menu', 'tab:lined') },
        { label: 'Desglose', accelerator: 'CmdOrCtrl+2', click: () => send('menu', 'tab:breakdown') },
        { label: 'Scouting', accelerator: 'CmdOrCtrl+Alt+2', click: () => send('menu', 'tab:scout') },
        { label: 'Casting', accelerator: 'CmdOrCtrl+Alt+3', click: () => send('menu', 'tab:casting') },
        { type: 'separator' },
        { label: 'Storyboard', accelerator: 'CmdOrCtrl+3', click: () => send('menu', 'tab:board') },
        { label: 'Animatic', accelerator: 'CmdOrCtrl+4', click: () => send('menu', 'tab:animatic') },
        { label: 'Plan de rodaje', accelerator: 'CmdOrCtrl+5', click: () => send('menu', 'tab:plan') },
        { label: 'Presupuesto', accelerator: 'CmdOrCtrl+6', click: () => send('menu', 'tab:budget') },
        { label: 'Hoja de script', accelerator: 'CmdOrCtrl+7', click: () => send('menu', 'tab:sup') },
        { type: 'separator' },
        { role: 'zoomIn', label: 'Acercar' }, { role: 'zoomOut', label: 'Alejar' }, { role: 'resetZoom', label: 'Tamaño real' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools', label: 'Herramientas de desarrollo' }]),
      ],
    },
    {
      label: 'Ayuda', submenu: [
        { label: 'Licencia…', click: m('license') },
        { label: 'Acerca de ' + CFG.name, click: m('about') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

/* ¿es la página de la app? (se compara la ruta del archivo, sin distinguir mayúsculas: en Windows la letra de la
   unidad y la codificación de la dirección pueden variar) */
const APP_FILE = path.join(__dirname, 'app', 'index.html').toLowerCase();
function isAppUrl(u) {
  try { const x = new URL(String(u)); return x.protocol === 'file:' && path.resolve(require('url').fileURLToPath(x.href.split(/[?#]/)[0])).toLowerCase() === APP_FILE; } catch (e) { return false; }
}
/* la página solo puede cargar sus propios archivos: nada de file:// fuera de la carpeta de la app (en Windows,
   file://servidor/… abre una conexión de red y entrega la firma de la contraseña) ni direcciones de internet */
const APP_DIR = path.join(__dirname, 'app').toLowerCase() + path.sep;
function isAppFile(u) {
  try {
    const x = new URL(String(u));
    if (x.protocol !== 'file:' || (x.host && x.host !== 'localhost')) return false;
    const p = path.resolve(require('url').fileURLToPath(x.href.split(/[?#]/)[0])).toLowerCase();
    return p.startsWith(APP_DIR) && !p.startsWith('\\\\');
  } catch (e) { return false; }
}
// (lote W) la única excepción: las teselas (imágenes) del mapa general del scouting, de OpenStreetMap, por https
const isMapTile = d => d.resourceType === 'image' && d.method === 'GET' && /^https:\/\/tile\.openstreetmap\.org\/\d{1,2}\/\d{1,7}\/\d{1,7}\.png$/.test(d.url);
function lockRequests(ses) {
  ses.webRequest.onBeforeRequest({ urls: ['file://*/*', 'http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] }, (d, cb) => cb({ cancel: !isAppFile(d.url) && !isMapTile(d) }));
}
function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 980, minHeight: 640, show: false,
    title: CFG.name,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#161616' : '#F3F4F6',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true },
  });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  // la ventana solo muestra la app: soltar un archivo o seguir un enlace file:// ya no la reemplaza (con el puente activo)
  win.webContents.on('will-navigate', (e, url) => { if (isAppUrl(url)) return; e.preventDefault(); if (/^https?:\/\//.test(url)) shell.openExternal(url); });
  // cámara, micrófono, ubicación, notificaciones…: la app no los usa; copiar al portapapeles y pantalla completa sí
  lockRequests(win.webContents.session);
  const okPerm = new Set(['clipboard-sanitized-write', 'fullscreen']);
  win.webContents.session.setPermissionRequestHandler((wc, perm, cb) => cb(okPerm.has(perm)));
  win.webContents.session.setPermissionCheckHandler((wc, perm) => okPerm.has(perm));
  try { win.webContents.session.setSpellCheckerLanguages(['es-ES']); } catch (e) { }
  // al cerrar: la ventana termina de guardar antes de irse
  win.on('close', e => {
    if (quitting) return;
    e.preventDefault();
    let done = false;
    const finish = async () => { if (done) return; done = true; quitting = true; try { await store.flushAll(); } catch (er) { } win.destroy(); };
    ipcMain.once('flushed', finish);
    send('flush');
    setTimeout(finish, 4000);
  });
  win.on('closed', () => { win = null; });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

/* contraseñas recordadas, cifradas por el sistema operativo (DPAPI en Windows) */
const sessFile = () => path.join(app.getPath('userData'), 'sesiones.json');
const sessions = () => { try { return JSON.parse(fs.readFileSync(sessFile(), 'utf8')); } catch (e) { return {}; } };
function remember_(pid, member, pw) {
  try { if (!safeStorage.isEncryptionAvailable()) return; } catch (e) { return; }
  const s = sessions(); s[pid] = { member, enc: safeStorage.encryptString(pw).toString('base64') };
  fs.writeFileSync(sessFile(), JSON.stringify(s));
}
function recall(pid) {
  const r = sessions()[pid];
  if (!r) return null;
  try { return { member: r.member, pw: safeStorage.decryptString(Buffer.from(r.enc, 'base64')) }; } catch (e) { return null; }
}
function forget(pid) { const s = sessions(); if (s[pid]) { delete s[pid]; fs.writeFileSync(sessFile(), JSON.stringify(s)); } }

let pickedDir = null;
function ipc() {
  // solo la página de la app (no otra que se hubiera cargado en la ventana) puede usar el puente
  const fromApp = e => { try { return !!win && e.sender === win.webContents && !!e.senderFrame && isAppUrl(e.senderFrame.url); } catch (er) { return false; } };
  const h = (ch, fn) => ipcMain.handle(ch, (e, ...a) => { if (!fromApp(e)) throw new Error('Solicitud rechazada.'); return fn(...a); });
  h('info', () => ({ name: CFG.name, ext: CFG.ext, fileExt: FEXT, version: app.getVersion(), root: store.root, buyUrl: CFG.buyUrl, supportEmail: CFG.supportEmail, platform: process.platform }));
  h('initial-file', () => { const f = pendingOpen; pendingOpen = null; return f; });
  h('list', () => store.list());
  h('load', async pid => {
    if (store.isShared(pid)) {
      const file = store.pathOf(pid);
      if (!fs.existsSync(file)) return { shared: true, file, error: 'No se encuentra la carpeta compartida. ¿Está sincronizada en este equipo?' };
      try { return { shared: true, file, info: await team.info(file), session: team.has(pid) }; }
      catch (e) { return { shared: true, file, error: e.message }; }
    }
    return store.load(pid);
  });
  h('load-frames', pid => store.isShared(pid) ? team.loadFrames(pid) : store.loadFrames(pid));
  h('save', (pid, title, parts) => store.save(pid, title, parts));
  h('save-frame', (pid, key, url) => store.saveFrame(pid, key, url));
  h('remove', async pid => {
    if (store.isShared(pid)) { team.close(pid); forget(pid); store.idx = store.idx.filter(x => x.id !== pid); await store.saveIndex(); return; }
    return store.remove(pid, p => shell.trashItem(p));
  });
  h('path-of', pid => store.pathOf(pid));
  h('reveal', pid => { const p = store.pathOf(pid); if (p && fs.existsSync(p)) shell.showItemInFolder(p); return !!p; });
  h('open-path', f => store.openPath(f));
  h('open-dialog', async () => {
    const r = await dialog.showOpenDialog(win, { title: 'Abrir proyecto', defaultPath: store.root, properties: ['openFile'], filters: [{ name: 'Proyecto de ' + CFG.name, extensions: OPEN_EXTS }] });
    if (r.canceled || !r.filePaths[0]) return null;
    return store.openPath(r.filePaths[0]);
  });
  h('save-as', async (pid, title) => {
    const r = await dialog.showSaveDialog(win, { title: 'Guardar proyecto como', defaultPath: path.join(path.dirname(store.pathOf(pid) || store.root), (title || 'Proyecto') + ext), filters: [{ name: 'Proyecto de ' + CFG.name, extensions: [FEXT] }] });
    if (r.canceled || !r.filePath) return null;
    return store.saveAs(pid, r.filePath);
  });
  h('save-file', async (name, bytes) => {
    // solo el nombre del archivo (sin carpetas) y de un tipo conocido: la interfaz no puede proponer otra ubicación
    name = path.basename(String(name || 'archivo')).replace(/[<>:"/\\|?*\x00-\x1F]+/g, '_').slice(0, 120) || 'archivo';
    const e = path.extname(name).slice(1).toLowerCase();
    const kinds = { pdf: 'Documento PDF', webm: 'Video WebM', mp4: 'Video MP4', json: 'Copia JSON', xlsx: 'Libro de Excel', zip: 'Archivo ZIP', csv: 'Texto CSV', fountain: 'Guion Fountain', fdx: 'Final Draft', txt: 'Texto', png: 'Imagen PNG', jpg: 'Imagen JPEG', [String(CFG.ext).toLowerCase()]: 'Proyecto de ' + CFG.name, [FEXT]: 'Proyecto de ' + CFG.name };
    if (!kinds[e]) throw new Error('Tipo de archivo no permitido.');
    const r = await dialog.showSaveDialog(win, { title: 'Guardar archivo', defaultPath: path.join(app.getPath('documents'), name), filters: e ? [{ name: kinds[e] || e.toUpperCase(), extensions: [e] }] : [] });
    if (r.canceled || !r.filePath) return null;
    await fs.promises.writeFile(r.filePath, Buffer.from(bytes));
    return r.filePath;
  });
  h('show-file', p => { if (p && fs.existsSync(p)) shell.showItemInFolder(p); });
  h('open-external', url => { if (/^(https?:|mailto:)/.test(url)) shell.openExternal(url); });
  h('license-status', () => lic.status());
  h('license-activate', key => lic.activate(key));
  h('license-deactivate', () => lic.deactivate());
  // ---- proyectos compartidos ----
  h('team-pick-dir', async () => {
    const r = await dialog.showOpenDialog(win, { title: 'Elegir la carpeta compartida (Google Drive, OneDrive o Dropbox)', defaultPath: app.getPath('home'), properties: ['openDirectory', 'createDirectory'] });
    pickedDir = r.canceled ? null : r.filePaths[0] || null;
    return pickedDir;
  });
  h('team-create', async (pid, o) => {
    // solo en la carpeta que la persona eligió en el diálogo (no en una que proponga la interfaz)
    if (!o || !pickedDir || path.resolve(String(o.dir || '')) !== path.resolve(pickedDir)) throw new Error('Elige la carpeta compartida.');
    const dir = path.join(pickedDir, safeFile(o.title));
    const { file, recovery } = await team.create({ dir, title: o.title, pid, adminName: o.adminName, password: o.password, sections: o.sections, frames: o.frames, licensee: o.licensee });
    await store.markShared(pid, file, o.title);
    const info = await team.info(file);
    const state = await team.login(pid, file, info.owner, o.password);
    return { state, recovery, file, dir };
  });
  h('team-login', async (pid, memberId, secret, useRecovery, remember) => {
    const file = store.pathOf(pid);
    const state = await team.login(pid, file, memberId, secret, useRecovery);
    if (remember && !useRecovery) remember_(pid, memberId, secret); else if (!remember) forget(pid);
    return state;
  });
  h('team-auto', async pid => {
    const r = recall(pid);
    if (!r) return null;
    try { return await team.login(pid, store.pathOf(pid), r.member, r.pw); } catch (e) { forget(pid); return null; }
  });
  h('team-remembered', pid => { const r = recall(pid); return r ? r.member : null; });
  h('team-can-remember', () => { try { return safeStorage.isEncryptionAvailable(); } catch (e) { return false; } });
  h('team-logout', pid => { team.close(pid); forget(pid); });
  h('team-save', async (pid, sec, json) => { const r = await team.save(pid, sec, json); store.touch(pid); return r; });
  h('team-save-frame', (pid, k, u) => team.saveFrame(pid, k, u || null));
  h('team-update-team', (pid, changes) => team.updateTeam(pid, changes));
  h('team-change-password', async (pid, pw) => { await team.changePassword(pid, pw); const r = recall(pid); if (r) remember_(pid, r.member, pw); });
  h('team-open-dir', pid => { const f = store.pathOf(pid); if (f) shell.openPath(path.dirname(f)); });
  h('third-party', () => { try { return fs.readFileSync(path.join(__dirname, 'LICENCIAS-DE-TERCEROS.txt'), 'utf8'); } catch (e) { return ''; } });
}

app.whenReady().then(start).catch(err => {
  console.error(err);
  dialog.showErrorBox(CFG.name, 'No se pudo iniciar: ' + (err && err.message || err));
  app.quit();
});
async function start() {
  const root = docsArg ? path.resolve(docsArg.slice(12)) : path.join(app.getPath('documents'), CFG.name);
  store = new ProjectStore({ root, userData: app.getPath('userData'), ext: FEXT, legacy: OPEN_EXTS, appLabel: CFG.name + ' ' + app.getVersion(), onError: err => send('store-error', String(err && err.message || err)) });
  await store.init();
  lic = new License(CFG, app.getPath('userData'), app.getPath('appData')).load();
  team = new Team({ ext: CFG.ext, appLabel: CFG.name + ' ' + app.getVersion(), send, seenFile: path.join(app.getPath('userData'), 'equipo-visto.json') });
  ipc();
  buildMenu();
  createWindow();
}
app.on('before-quit', () => { /* el cierre de la ventana se encarga de guardar */ });
app.on('window-all-closed', () => app.quit());
