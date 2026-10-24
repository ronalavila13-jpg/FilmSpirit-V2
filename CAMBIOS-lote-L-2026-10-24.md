# FilmSpirit · lote L (24 de octubre de 2026): segunda revisión thermos

Revisión «thermos» (dos revisores en paralelo: uno de errores y seguridad, otro de calidad del código) de lo que entró
después de la primera revisión: los lotes F (seguridad de la web), H (Apariencia) y J (Gastos), y el resto del servidor
desde la versión del 21 de octubre.

**Cómo aplicarlo.** Usa `filmspirit-servidor.zip`, que ya trae todo. En la VPS:

`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`

No hay migración de datos ni variables nuevas. En el código fuente, descomprime encima de tu carpeta `octavos/` y arma
como siempre (`sh build.sh`, `node server/make.js`, `cd desktop && node make.js`).

## Qué se arregló

1. **Las fotos de Gastos podían trabar el servidor.** Cada vez que alguien abría un proyecto, el servidor revisaba cada
   foto de recibo limpiando de nuevo todo el documento de Gastos. Con 50 cajas de 30 recibos con foto, abrir el proyecto
   tardaba casi 6 segundos y mientras tanto la web entera esperaba (guardar, pagos, todo). Ahora el documento se ordena
   una sola vez por solicitud: la misma prueba pasó de 2 segundos a unos milisegundos.
   (`src/areas.js` · `gaIndex`)
2. **Gastos aparecía en las cuentas Indie.** La pestaña, la columna del equipo y los formularios salían, pero el servidor
   (bien) rechazaba todo lo que se guardaba: la persona veía errores y lo escrito quedaba sin guardar. Ahora la app usa
   el mismo dato que manda el servidor (el plan del dueño del proyecto), así que solo sale con Pro y Studio. Probado en
   el navegador: antes Indie veía 15 pestañas con Gastos; ahora 14, sin Gastos. Pro sigue viéndola.
   (`src/tab-gastos.js` · `gsPlanOk`, `src/share.js`)
3. **Una caja chica se podía cerrar con recibos sin revisar** (desde una pestaña vieja o una solicitud armada a mano):
   esos recibos quedaban «por revisar» para siempre, porque una caja cerrada ya no cambia. Ahora el servidor también exige
   que todo esté revisado o anulado, como ya pedía la app. (`src/areas.js` · `gaFilter`)
4. **Las notas que se dejaban en la pestaña Gastos desaparecían** al guardar (el servidor no las guarda, porque en Gastos
   cada persona ve solo lo suyo). Ahora la app no deja ponerlas ahí. (`src/notas.js`)
5. **El conteo de firmas falsas de los avisos de pago se quedaba pegado** en el panel de Seguridad: lo que llegó hace días
   seguía saliendo como «últimas 24 horas» y se perdía al reiniciar. Ahora se cuenta junto con los demás contadores de
   seguridad (una fila por hora en la bitácora). Las filas anotadas por la versión anterior se siguen leyendo.
   (`server/lib/seguridad.js` · `sigFail`; se quitó el contador aparte de `billing.js`)
6. **Límites de frecuencia:** al llenarse la tabla en memoria ahora se quitan primero las claves cuya ventana ya pasó (antes
   se miraba siempre una hora, aunque el límite fuera de 5 minutos), así es más difícil borrar los contadores de otras
   personas llenando la tabla. El tope de lecturas pesadas usa el mismo mecanismo en vez de una copia aparte.
   (`server/lib/util.js` · `rateLimit(..., cost)`, `server/lib/api.js` · `readCost`)
7. Al guardar Gastos, el servidor ya no lee el mismo JSON cinco veces. (`server/lib/api.js`)

Pruebas nuevas: la caja con recibos sin revisar no se cierra; muchas fotos de recibos no traban la lista de imágenes;
las firmas falsas se cuentan por hora. Pasan las 83 pruebas del servidor y las de la app (gastos, permisos, compartir).

## Lo que queda para otra ronda, y por qué

- **¿La jefatura de producción puede aprobar sus propios gastos?** Hoy sí: un jefe de producción puede entregarse dinero
  a su propia caja, rendir recibos y marcarlos revisados. Si quieres separación de funciones (que nadie revise lo
  suyo), es un cambio de dos líneas, pero es una decisión de cómo trabajan, no un error.
- **Volver a entrar al panel de administración** después de 12 horas es un clic si Google sigue abierto en esa
  computadora. Google no permite forzar la contraseña; la protección real es la verificación en dos pasos de la cuenta.
- **Orden del código de Gastos** (sin cambios a la vista): la regla «Gastos tiene sus propios permisos» está repetida en
  unos doce lugares de `api.js` y `share.js`; las cuentas de Gastos (unas 100 líneas) están en `core.js`, que ya pasa las
  1.000 líneas; y unas 135 líneas de estilos de Gastos están en `shell.html`. Conviene moverlas a archivos propios
  (`gastos-calc.js`, una tabla de permisos por sección) en una ronda de limpieza, con calma y con sus pruebas.
