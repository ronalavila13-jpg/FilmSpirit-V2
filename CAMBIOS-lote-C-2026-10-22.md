# FilmSpirit · lote C de la revisión thermos (22 de octubre de 2026): escritorio y equipo

Este ZIP trae solo los archivos nuevos o modificados. Descomprímelo **encima** de tu carpeta `octavos/`, **después de los
lotes A y B**. `filmspirit-servidor.zip` ya trae los lotes A, B y C.

## Cómo aplicarlo

1. **Escritorio:** `cd desktop && node make.js`. Es donde está casi todo este lote.
2. **Web (página interactiva):** `sh build.sh`.
3. **Web con cuentas (VPS):** `cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.

**En un equipo del escritorio, conviene que todos actualicen.** Con una versión vieja todo sigue funcionando, pero esa
persona no tiene los arreglos de las fotos ni del guardado a la vez.

## Qué se arregló

### M7. Abrir un archivo armado a propósito ya no puede borrar otros proyectos
El identificador que trae un `.fsp` se usaba sin revisar para armar la carpeta de respaldos. Uno con `/..` podía hacer
que la limpieza de respaldos borrara en otra carpeta.
- **Proyecto propio con un identificador raro:** se abre igual, con un identificador nuevo.
- **Proyecto compartido con un identificador raro:** no se abre y sale «El archivo del proyecto compartido no es válido.»
- **La carpeta de respaldos:** solo lleva letras, números, `-` y `_`, venga de donde venga.
- **Al revisar la carpeta de proyectos:** un archivo así no se agrega solo a la lista. Se puede abrir con «Abrir».

### M8. Las fotos del punto de encuentro de la hoja de llamado ya cargan
En un proyecto compartido del escritorio, esas fotos se guardaban pero nunca se leían: no aparecían al reabrir ni a los
demás. Ahora se leen como las del storyboard, el desglose y el scouting.

### M9. Quitarle el plan a alguien ya no deja ilegibles las fotos del scouting
Al quitar un permiso, la sección recibe una llave nueva y se vuelve a cifrar. Las fotos del scouting (y las del punto
de encuentro) se quedaban con la llave vieja, así que nadie podía volver a verlas. Ahora se vuelven a cifrar con su
sección.

Además, lo que se vuelve a cifrar es lo último que hay en la carpeta. Antes era lo que tenía en memoria quien cambiaba
el permiso, y podía faltar un cambio recién llegado de otra persona.

### M10. Dos personas que guardan la misma sección casi a la vez ya no pierden un cambio
- **Escritorio:** la carpeta se revisa cada 2 segundos. Si alguien guardaba en ese lapso, el siguiente guardado
  escribía encima.
- **Página publicada en Claude:** pasaba lo mismo, con el tiempo que tarda en llegar el cambio.

Ahora, antes de guardar, se mira si hay una versión más nueva de otra persona. Si la hay:
1. se lee esa versión;
2. la app la fusiona con lo tuyo, como cuando llega un cambio mientras editas;
3. se vuelve a guardar.

En la página de Claude aún queda un margen de una fracción de segundo, porque esa base de datos no permite comprobar y
escribir en un solo paso. Antes eran varios segundos.

### Equipo y sin conexión
- **Cerrar sesión con cambios sin enviar.** Si hay cambios hechos sin conexión que no llegaron a tu cuenta, ahora sale
  «Cambios sin enviar» con los proyectos afectados y la opción «Salir igual». Antes se borraban sin aviso.
- **Cambiar la contraseña del escritorio** pide lo mismo que al crear el equipo: 12 caracteres, con letras y números.
  Antes aceptaba 8. Tu llave está en la carpeta compartida y cualquiera del equipo puede intentar adivinarla sin límite.
- **Un error pasajero al leer la carpeta de imágenes** (por ejemplo, de la nube) ya no borra las imágenes de la sesión
  abierta. Se espera a la siguiente lectura.

### Archivos dañados o armados a mano
Un archivo de proyecto mal formado ahora se abre completo, y lo dañado se descarta:
- una parte que debía ser una lista o un objeto y no lo es (antes quedaba a medio abrir);
- un elemento con una categoría que no existe pasa a «Notas» (antes se caían la pestaña Guion y el PDF);
- una escena 3D dañada se descarta y el plano vuelve a su escena armada;
- una escena numerada `__proto__` o parecido recibe su número automático (antes lo escrito en ella no se guardaba).

### Guion
- **Importar Fountain:**
  - conserva negritas, cursivas y subrayados;
  - ya no se come los guiones bajos de dentro de una palabra («MI_ARCHIVO» se queda igual);
  - un archivo con notas `[[` o comentarios `/*` sin cerrar se lee al instante (antes congelaba la página casi un minuto
    con 1 MB).
- **Escena nueva al final:** ya no toma el número de una escena borrada que dejó datos. Antes heredaba su fila del
  plan, su sinopsis, sus planos y su ficha de Construcción. Deshacer el borrado sigue recuperando todo.

### Calendario
- **Un año mal escrito** (2206 en vez de 2026) ya no estira el calendario a decenas de miles de días ni rompe el Excel.
  - El calendario se arma con las fechas que están a menos de tres años de la mitad de todas.
  - La tarea con la fecha rara sigue en su fila; ábrela y corrígela.
  - Un proyecto viejo se sigue viendo en sus fechas.
- **Al escribir una fecha:** se aceptan años de 1900 a 2099. Si el fin queda antes del inicio, se dan vuelta.

### DOOD en inglés
Las columnas «Inicio» y «Fin» decían «J3». Ahora dicen «D3» en la tabla, el PDF y el Excel.

## Lo que queda pendiente de este lote

- **El puente entre la ventana y el resto del escritorio** (`desktop/preload.js`) y las licencias (`desktop/license.js`)
  no estaban en lo que me pasaste. Si me los pasas, los reviso.
- **Límites de área y de guion cerrado en el escritorio, esquivables saltando un número de versión.**
  - Quien edita con permiso puede guardar con un número de versión que salte varios. Así los demás no pueden comparar
    con certeza y solo avisan a producción, en vez de rechazar el cambio.
  - Cerrarlo del todo pide que cada guardado firme también la versión de la que partió. Eso cambia el formato de los
    archivos de la carpeta compartida, y un equipo con versiones mezcladas dejaría de entenderse.
  - Conviene hacerlo en una versión que todo el equipo instale a la vez. Mientras tanto, producción recibe el aviso
    «Revisa el desglose…» o «Revisa el guion…».

## Pruebas nuevas

- `test/team/imagenes.test.js` (escritorio):
  - las fotos del punto de encuentro se leen al reabrir;
  - quitar el plan no deja ilegible el scouting;
  - dos guardados casi a la vez: el segundo recibe el cambio del primero.
- `test/compartir.test.js`: lo mismo en la página publicada en Claude.
- `test/menores.test.js`: Fountain (rapidez, formato y guiones bajos), escena nueva al final, calendario con un año mal
  escrito y DOOD en inglés.

Cada prueba nueva falla con el código de antes y pasa con el de ahora.

## Probado

- **Pruebas:** pasan las del programa, las del equipo del escritorio y las del servidor.
- **Recorrido:** 14 pestañas en español e inglés, con tres anchos y en claro y oscuro, sin errores. En inglés no quedan
  textos sin traducir.
- **En el navegador:** el calendario con una tarea en el año 2206 se abre normal.

## Archivos

`desktop/`: `store.js`, `team.js`

`src/`:
- **Equipo y sin conexión:** `share.js`, `share-api.js`, `share-web.js`
- **Archivos dañados y Fountain:** `ui.js`, `core.js`, `guion-formato.js`
- **Escena nueva:** `guion-editor.js`
- **Calendario:** `tab-cal.js`
- **DOOD:** `plan-dood.js`

`test/`: `menores.test.js`, `compartir.test.js`, `team/imagenes.test.js`

`i18n/`: `en-manual.json`

Raíz: `CAMBIOS-lote-C-2026-10-22.md`
