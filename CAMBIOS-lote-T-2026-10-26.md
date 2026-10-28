# Lote T · seguridad de la app de escritorio (26-oct-2026)

Base: lote S. Arreglos de la auditoría del frontend del 26-oct (seguridad-2/INFORME-seguridad-frontend-2026-10-26.md) y del
pendiente de escritorio de la auditoría del 24-oct. Como la app de escritorio aún no se publicó, se cambió el formato de
los archivos compartidos sin compatibilidad hacia atrás para los miembros (el productor sí abre proyectos anteriores).

- **Sobre de llaves viejo (problema 1, media-alta):** `sealGrant` mete la revisión del manifiesto y el id de la persona
  dentro de la caja cifrada. `openGrant` solo acepta un sobre de su persona, de esta revisión o posterior y con las mismas
  generaciones de llave que el manifiesto (antes `S.keyGens` se guardaba y no se usaba, y la revisión iba afuera, sin
  cifrar). `writeSection` y `writeFrame` se niegan a cifrar con una llave cuya generación no es la del manifiesto (también
  en la reparación automática). Los sobres del formato anterior valen si sus cerraduras son las actuales y el productor
  los reescribe al entrar (`resealGrants`).
- **Cambios fuera de área o del guion cerrado tras un salto de versión (pendiente del 24-oct):** cada versión firma de cuál
  parte (`prev`, huella de la versión anterior aceptada) y se guarda también en `datos/historial/` (últimas 120 por
  sección). `verifyChain` recorre la cadena desde la última versión aceptada (en memoria o anotada en equipo-visto.json),
  una propia o una del productor o de alguien sin límites, y compara cada paso de un jefe de área (`bdViolates`) o del
  guion (`scriptLockCheck`) con el anterior exacto. Ya no se acepta «con aviso» un cambio que salta versiones ni al
  volver a entrar. Si falta la versión de la que parte, se reintenta 2 minutos; después, aviso sin reparación automática.
- **Imágenes del equipo:** una imagen solo vale en el archivo que corresponde a su clave (copiar una encima de otra ya no
  la reemplaza) y no se acepta una más vieja que la última vista (`frameTs`, anotado en equipo-visto.json).
- **Logos y planos (problema 2):** `imgDataOk` (src/imagenes.js) acepta solo PNG, JPEG, WebP o GIF incrustados. Se usa en
  la pestaña Proyecto, el Desglose, el plano de planta, los PDF (`pdfImgSrc`) y al cargar un proyecto (`sanitizeProject`).
  Esto también protege la web (antes un logo `/api/p/<id>` hacía que el navegador de otro aceptara una invitación).
- **Escritorio, peticiones:** `lockRequests` (desktop/main.js) cancela todo `file://` fuera de la carpeta app/ y toda
  dirección http(s)/ws/ftp. Comprobado en Electron 33: sin el bloqueo, la política de seguridad dejaba cargar
  `file:///otra/carpeta` y `file://host/…`; con el bloqueo, no.
- **Política de seguridad de escritorio:** suma `form-action 'none'` y `frame-src 'none'`.
- desktop/areas.js vuelve a ser copia exacta de src/areas.js (solo cambiaba un comentario del lote S).

Pruebas nuevas: test/team/cadena.test.js (5; las 4 primeras fallan con el código anterior) y test/logos.test.js. Pasan
todas las del equipo (unit.js 21, guion-cierre, imagenes, permisos, seguridad), las de la app salvo pdf.test.js (ya
fallaba: necesita el módulo canvas) y las 16 del servidor.

preload.js y license.js: ver al final.

Archivos: desktop/team.js, desktop/main.js, desktop/areas.js, desktop/LEEME-escritorio.md, build.sh, src/imagenes.js,
src/tab-project.js, src/tab-breakdown.js, src/floorplan.js, src/proyectos.js, test/team/cadena.test.js, test/logos.test.js.

## Agregado: desktop/preload.js y desktop/license.js (rehechos)

No venían en el código fuente. Se rehicieron a partir de la copia del 10-oct (1.1.0) y de lo que usa la app hoy
(`window.filmspiritDesk`, src/ui.js):
- **preload.js:** mismas funciones que pide la interfaz y nada más. Los avisos del equipo solo se escuchan con los nombres
  que manda team.js (update, frame, manifest, reload, revoked, warn), y la interfaz recibe solo los datos, nunca el evento de
  Electron. `team.requests` devuelve una lista vacía (las solicitudes de acceso son de la web).
- **license.js:** igual que antes (clave firmada Ed25519, solo la clave pública en la app), y además exige que la clave diga el
  producto (el emisor siempre lo pone), rechaza fechas de vencimiento inválidas y claves de más de 2000 caracteres.
- Probado abriendo la app de escritorio en Electron 33 (Linux): puente con 23 funciones, sin `require` ni `process` en la
  página, licencia en prueba, clave falsa rechazada, proyecto de ejemplo y pestañas sin errores, y una imagen `file:` fuera de
  la carpeta de la app bloqueada.
- Siguen faltando en el código fuente desktop/package.json y desktop/tools/emisor-plantilla.html (make.js los usa para el
  instalador y el emisor de licencias).
