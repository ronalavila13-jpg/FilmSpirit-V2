# FilmSpirit · lote O (24 de octubre de 2026): arreglos de la auditoría de seguridad

Este lote arregla lo que encontró la auditoría de seguridad del 24 de octubre (informe completo en
`INFORME-seguridad-2026-10-24.md`). Base: lote N (series de TV). No cambia nada que se vea en la app.

**Cómo aplicarlo.** Igual que siempre, en la VPS:
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
No hay migración ni variables nuevas. En el código fuente, descomprime encima de tu carpeta y arma como siempre.

## Qué se arregló

1. **Pro gratis con Paddle repitiendo la prueba (importante).** Alguien que ya usó su prueba de 30 días podía
   conseguir Pro sin pagar. El primer intento con el precio de prueba se rechazaba bien, pero un segundo intento
   con el mismo número de pago se aceptaba y daba Pro por unos 33 días, y se podía repetir. Ahora una suscripción de
   Paddle solo se une a un pago que todavía está pendiente, y el precio de prueba se rechaza siempre que la prueba
   no se haya ofrecido (`server/lib/billing.js`, `syncPaddle`). Por precaución se puso la misma regla en Lemon
   Squeezy (`syncLs`).
2. **Registro del guion cerrado.** Una persona autorizada a revisar el guion cerrado (sin ser quien lo administra)
   podía borrar casi todo el registro de cambios y la lista de revisiones cerradas, y dejar solo la última línea.
   Ahora solo se pueden agregar líneas. Lo más viejo sale solo cuando el registro llega a su tope de 1500 líneas,
   como ya hacía la app. Las revisiones cerradas nunca se borran (`src/areas.js` › `scriptLockCheck`, y la copia en
   `server/areas.js` y `desktop/areas.js`).
3. **Correo de administración.** Si otra cuenta de Google entraba con el mismo correo que figura en `ADMIN_EMAILS`,
   el servidor le pasaba ese correo, y con él el panel de administración. Ahora eso se rechaza con el mensaje
   «Este correo ya está en otra cuenta de FilmSpirit», y la cuenta de siempre conserva su correo. Para los demás
   correos no cambia nada (`server/lib/auth.js`).
4. **Libro de reclamaciones.** El tope de 2 copias por correo se podía saltar escribiendo el mismo correo de otras
   formas, por ejemplo `ana+1@…`, `a.na@…` o `x<ana@…>`. Ahora el tope cuenta por buzón, y no se aceptan correos con
   `< > " , ; : ( ) [ ] \` (`server/lib/util.js`, `server/lib/reclamos.js`).
5. **Nombre del escenario 3D en el aviso «Quitar».** El nombre que pone un colaborador se mostraba sin escapar
   dentro del aviso de confirmación. La política de seguridad ya bloqueaba scripts, pero ahora se muestra como
   texto (`src/shot-editor.js`). La web app (`public/app/app.js`) está recompilada.
6. **IP real.** Detrás de nginx, el servidor toma la IP solo de `X-Real-IP` (la pone nginx) y ya no cae a
   `X-Forwarded-For`, que lo puede escribir cualquiera (`server/server.js`).
7. **Actualizar no pisa archivos locales.** `deploy/actualizar.sh` ahora excluye `deploy/*.local`, igual que
   `instalar.sh`.

## Pruebas

Hay pruebas nuevas: `test/correo.test.js`, y casos nuevos en `test/paddle.test.js` y `test/guion-cierre.test.js`.
Las de Paddle y del guion fallan con el código anterior y pasan con este. Las 87 pruebas del servidor pasan
(archivo por archivo, con `server/areas.js` copiado de `src/areas.js`). La web app se compiló con `sh build.sh server`.
Compilando el lote N con el mismo método salía exactamente el mismo `app.js` publicado, así que el nuevo solo trae
los dos cambios de arriba. `sw.js` se recalculó como en `make.js`.

Si usas la prueba de carga (`prueba-carga/carga.js`): como ahora solo cuenta `X-Real-IP`, el script manda también
esa cabecera.

## Lo que no cambia en este lote

- **App de escritorio, cambios de un jefe de área fuera de sus áreas.** Un integrante limitado a ciertas áreas del
  desglose, o sin permiso sobre el guion cerrado, puede hacer que el resto del equipo acepte un cambio prohibido.
  Para eso tiene que fabricar el archivo a mano. Funciona si salta números de versión, o si los demás estaban
  desconectados cuando lo escribió. Arreglarlo bien obliga a cambiar el formato de los archivos compartidos y a
  publicar una versión nueva de la app de escritorio. Si se rechaza sin más, se perderían cambios legítimos hechos
  sin conexión. Queda propuesto para la próxima versión de escritorio (detalle en el informe).
- Tres puntos necesitan un dato de la VPS o del proveedor para saber si son reales. Están en el informe, con lo
  que hay que mirar.
