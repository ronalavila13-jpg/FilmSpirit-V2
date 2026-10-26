/* ============================================================
   Puente seguro entre la interfaz y el sistema de archivos
   La ventana corre aislada (contextIsolation + sandbox): solo ve estas funciones, cada una pide una operación
   concreta al proceso principal (main.js · ipc), que además comprueba que la pide la página de la app.
   ============================================================ */
const { contextBridge, ipcRenderer } = require('electron');
const call = (ch, ...a) => ipcRenderer.invoke(ch, ...a);
// avisos que el proceso principal manda al equipo (team.js · this.send); cualquier otro nombre se ignora
const TEAM_EVENTS = new Set(['update', 'frame', 'manifest', 'reload', 'revoked', 'warn']);
// la interfaz no recibe el evento de Electron (trae el emisor): solo los datos
const listen = (ch, cb) => { if (typeof cb === 'function') ipcRenderer.on(ch, (e, ...a) => cb(...a)); };
contextBridge.exposeInMainWorld('filmspiritDesk', {
  info: () => call('info'),
  initialFile: () => call('initial-file'),
  list: () => call('list'),
  load: pid => call('load', pid),
  loadFrames: pid => call('load-frames', pid),
  save: (pid, title, parts) => call('save', pid, title, parts),
  saveFrame: (pid, key, url) => call('save-frame', pid, key, url),
  remove: pid => call('remove', pid),
  pathOf: pid => call('path-of', pid),
  reveal: pid => call('reveal', pid),
  openPath: f => call('open-path', f),
  openDialog: () => call('open-dialog'),
  saveAs: (pid, title) => call('save-as', pid, title),
  saveFile: (name, bytes) => call('save-file', name, bytes),
  showFile: p => call('show-file', p),
  openExternal: url => call('open-external', String(url || '')),
  license: { status: () => call('license-status'), activate: k => call('license-activate', String(k || '')), deactivate: () => call('license-deactivate') },
  thirdParty: () => call('third-party'),
  team: {
    pickDir: () => call('team-pick-dir'),
    create: (pid, o) => call('team-create', pid, o),
    login: (pid, member, secret, rec, remember) => call('team-login', pid, member, secret, !!rec, !!remember),
    auto: pid => call('team-auto', pid),
    remembered: pid => call('team-remembered', pid),
    canRemember: () => call('team-can-remember'),
    logout: pid => call('team-logout', pid),
    save: (pid, sec, json) => call('team-save', pid, sec, json),
    saveFrame: (pid, k, u) => call('team-save-frame', pid, k, u),
    updateTeam: (pid, changes) => call('team-update-team', pid, changes),
    changePassword: (pid, pw) => call('team-change-password', pid, pw),
    openDir: pid => call('team-open-dir', pid),
    // solicitudes de acceso: solo existen en la versión web
    requests: () => Promise.resolve([]),
    on: (ev, cb) => { if (TEAM_EVENTS.has(ev)) listen('team-' + ev, cb); },
  },
  onOpenFile: cb => listen('open-file', cb),
  onMenu: cb => listen('menu', cb),
  onFlush: cb => ipcRenderer.on('flush', async () => { try { if (typeof cb === 'function') await cb(); } finally { ipcRenderer.send('flushed'); } }),
  onStoreError: cb => listen('store-error', cb),
});
