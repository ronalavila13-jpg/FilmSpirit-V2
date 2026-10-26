# Lote V · rendimiento: lo que se ve al instante y un servidor que no se traba (26-oct-2026)

Segunda parte del lote V, hecha en paralelo con la primera (clonar los atributos de un plano: CAMBIOS-lote-V-2026-10-26.md)
en otro chat. Base: lote U; después se unió con la rama del clonado (lote-t-clonar-atributos, PR #3), que no toca los
mismos archivos. Revisión de FilmSpirit contra los «cinco errores de una app hecha con IA» (escrituras a la base de datos,
optimistic UI, páginas estáticas, dependencias pesadas y peticiones largas sin cola). Ronald eligió cuatro frentes; la
portada y las páginas legales ya eran estáticas (se arman una vez y quedan en memoria) y no se tocaron.

## 1 · Historial cada 5 minutos (server/lib/api.js)

- Antes, cada guardado archivaba en `history` una copia comprimida de la versión anterior. Mientras alguien escribía el
  guion eso pasaba cada 1,2 s, y como se guardan 40, el historial cubría solo los últimos minutos (y nada lo lee todavía:
  es para recuperar a mano). Ahora se archiva como mucho una copia cada 5 minutos por sección (`HIST_GAP`). Al volver a
  editar después de una pausa, la primera copia es la versión de antes de empezar.
- Si otra persona guarda encima de lo tuyo, tu versión se copia aunque no hayan pasado los 5 minutos, como mucho una vez
  por minuto (`HIST_GAP_OTHER`): dos personas escribiendo a la vez no vuelven a copiar en cada guardado.
- Se conservan las 40 copias más recientes contando filas (antes, por número de versión: con copias salteadas se habrían
  borrado de más). La cuota del plan suma la copia solo cuando se hace.

## 2 · Abrir y fotos al instante

- **Abrir un proyecto sin volver a bajarlo** (src/share-api.js · `open`, `fillSame`; server/lib/api.js · `state`,
  `parseHave`): el navegador manda `?have=guion.12,desglose.5` con lo que tiene en su copia (IndexedDB). Lo que sigue en
  esa versión llega como `{ v, same: 1, n }` (n: largo en bytes) y se toma de la copia, comprobando versión y largo; si
  algo no cuadra, se pide todo como antes. Notas y Gastos se envían siempre (cada quien recibe su vista). Lo que no se
  puede leer no llega, diga lo que diga `have`. Con un guion de 120 páginas: 196 kB → 1,3 kB al volver a abrirlo.
- `ensureCreated` guarda en la copia solo las secciones que el servidor creó, con su versión (antes, todas con versión 1,
  también Gastos o lo de producción en un guion, que el servidor no guarda).
- **Arranque:** `/api/projects` se pide a la vez que `/api/me` (antes, uno después del otro).
- **Fotos visibles mientras suben** (src/laminas.js · `photosAdd`, usado por las láminas del desglose y por las
  candidatas del scouting, el casting y el punto de encuentro de la hoja de llamado): cada foto aparece apenas se
  comprime y se sube detrás, de a dos. Si el servidor no la acepta (sin espacio, plan, permisos) se quita y se avisa una
  vez; con «sin espacio» o «sin permiso» no se intentan las que faltan. Cambiar de proyecto espera a que terminen
  (`settleSave`) y cerrar la pestaña avisa (`unsavedWork`). Los demás del equipo la ven cuando termina de subir.
  - Cada foto queda en la cola sin conexión de este equipo (`OFFLINE.putFrame`) hasta que el servidor la confirma: si la
    pestaña se cierra o el teléfono la mata a mitad de la subida, se sube al volver a abrir la app
    (`OFFLINE.flushFrames`, que ahora también corre al arrancar con internet: antes, las imágenes hechas sin conexión
    esperaban a que se cortara y volviera la conexión).
  - Borrar una foto que todavía sube la saca de la cola, o la borra en el servidor al terminar de subir (`photoCancel`).
- Importar un proyecto con imágenes las sube de a tres (antes, una por una).

## 3 · App más liviana (build.sh, src/pdf.js, src/modelos.js)

- En la web con servidor, las letras de los PDF (src/pdf-fuente.js y pdf-fuente-x.js, ~640 kB) van en
  `app/lib/pdf-fuentes-<huella>.js` y se bajan con jsPDF (`loadPdfLib`); los lectores de modelos 3D (src/glb-lib.js,
  ~260 kB) van en `app/lib/glb-lib-<huella>.js` y se bajan al importar el primer modelo (`glbLibLoad`). La huella va en el
  nombre (PDFF_V y GLB_V, de build.sh): una pestaña abierta con la versión anterior nunca carga los de otra versión.
  En escritorio y en Claude siguen dentro.
- app.js: 3,6 MB → 2,7 MB; comprimido (brotli): 1,04 MB → 0,69 MB (−34 %). Salen del camino del arranque; se siguen
  bajando después, sin apuro (jsPDF se precarga a los 4 s y el service worker guarda todo lo de /app/ para usar sin
  conexión).

## 4 · Cola de correos y servidor sin trabas

- **Cola de correos** (server/lib/mail.js, migración 11: tabla `outbox`): cada correo se anota antes de enviarse y, si
  el servicio falla, se reintenta (1, 5 y 15 min, 1, 3, 6, 12 y 24 h: unas 48 h). `deliver()` intenta en el momento
  (copia del libro de reclamaciones, respuesta del panel: la página dice «te llegará en unos minutos» si quedó en cola);
  `queue()` no hace esperar (bienvenida, aviso del fin del mes gratis, copia a soporte). Antes, el aviso del fin del mes
  gratis se marcaba como enviado aunque fallara.
  - Con Resend, cada reintento lleva la misma `Idempotency-Key`: si el servicio ya lo había recibido y la respuesta no
    llegó, no se manda dos veces. Al apagar, el servidor espera (hasta 3 s) lo que se está enviando.
  - Lo que el servicio rechaza por el correo en sí (4xx) o no sale en 48 h queda en la Bitácora como `mail_failed` (con
    el número del correo, sin la dirección). 401/403 (clave o cuenta del servicio) se reintentan.
  - Lo enviado se queda sin el texto (puede llevar datos del libro de reclamaciones) y a los 30 días se borra. Al
    eliminar una cuenta se borran sus correos en cola.
- **Comprimir al compilar** (server/make.js): `.br` (calidad 11) y `.gz` de cada .js, .css, .json, .svg, .txt… de
  `public/` (no de las .html, que se arman en cada pedido; los maniquíes `fig/*.gz` son datos y no se tocan). El servidor
  las manda tal cual si son más nuevas que el archivo; si no, comprime fuera del hilo principal y una sola vez aunque
  lleguen varios pedidos juntos. Antes, tras cada actualización, el primero que abría la app dejaba el servidor (un
  núcleo) trabado ~0,6 s o más para todos.
- **Modelos 3D importados:** se revisan por partes (`m3Ok` con `createGunzip`): solo se guarda el encabezado y el resto
  se cuenta hasta 96 MB. Antes, `gunzipSync` trababa el servidor; descomprimir entero sin trabarlo habría dejado que
  varios a la vez llenaran la memoria (20 «bombas» de 97 KB: +2,3 GB; ahora, +5 MB).

## Revisión independiente

Un segundo revisor encontró y se arreglaron: la memoria con varios modelos 3D a la vez (alta), fotos perdidas si la
pestaña se cerraba a mitad de la subida y fotos borradas mientras subían (medias), una subida que podía quedar colgada
si fallaba el pintado, la copia del historial cuando otra persona guarda encima, correos repetidos o con datos de más,
y archivos de lib/ de otra versión. Revisó sin problemas el camino de `have` (permisos, copias locales, cambios sin
conexión, fusión), las tres compilaciones y los archivos comprimidos. Queda: si una foto de una candidata (scouting,
casting) falla justo cuando llega un cambio del equipo, su referencia queda sin imagen (no se ve; se puede volver a subir).

## Pruebas

Nuevas: server/test/rendimiento.test.js (7: historial, otra persona encima, modelo 3D enorme, `have`, cola de correos,
archivos comprimidos) y test/rendimiento-v.test.js (10: fotos al instante, cola de este equipo, borrar mientras sube,
error al pintar, abrir con la copia local, arranque en paralelo). Pasan las 18 del servidor (una por una) y todas las de
test/ salvo pdf.test.js (ya fallaba: le falta el módulo canvas); las de test/team necesitan las dependencias de
escritorio (igual que antes). Compilan web, escritorio y servidor. Prueba en el navegador con la app compilada contra el
servidor real: al abrir no están las letras ni los lectores 3D; al recargar el proyecto el guion y el desglose salen de
la copia local; el PDF del guion se exporta con Courier Prime y Archivo; cuatro guardados seguidos dejan una sola copia
en el historial.

Archivos: build.sh, server/lib/{api,auth,db,mail,billing,reclamos,admin}.js, server/server.js, server/make.js,
server/web/{reclamaciones,admin}.js, server/LEEME-VPS.md, src/{share-api,laminas,tab-scout,proyectos,arranque,importar,pdf,modelos}.js,
server/test/rendimiento.test.js, test/rendimiento-v.test.js.
