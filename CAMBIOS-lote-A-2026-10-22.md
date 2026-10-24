# FilmSpirit · lote A de la revisión thermos (22 de octubre de 2026): datos y seguridad

Este ZIP trae solo los archivos nuevos o modificados, con las mismas rutas del proyecto. Descomprímelo **encima** de tu
carpeta `octavos/`, después de las entregas del 21 de octubre.

## Cómo aplicarlo

1. **Web (página interactiva):** `sh build.sh`.
2. **Web con cuentas (VPS):** sube `filmspirit-servidor.zip` (ya armado con esta versión) y en la VPS:
   `cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
3. **Escritorio:** `cd desktop && node make.js`.

## Qué se arregló

### A1. Pagos internacionales: ya no se puede abrir el portal de pagos de otra persona
Antes, en el pago con Paddle, el correo del formulario decidía a qué cliente de Paddle se cobraba. Escribiendo el correo
de otra persona se podía abrir su portal: facturas, dirección, medio de pago y la opción de cancelar.
- **El correo:** con Paddle se paga siempre con el correo de la cuenta. El campo del correo ya no aparece cuando el
  pago internacional es con Paddle.
- **Un cliente por cuenta:** cada cuenta usa su propio cliente de Paddle, el de sus pagos anteriores.
- **El portal:** antes de abrirlo se comprueba que el cliente sea de esa cuenta. Si no lo es, sale «Ese medio de pago
  está a nombre de otra cuenta. Escríbenos y lo revisamos.» y queda anotado en el registro.

### M2. Quien paga con Paddle ya no recibe correos ni acciones de Mercado Pago
El aviso «tu mes gratis termina; Mercado Pago cobrará S/ …», regalar días y la reanudación automática ahora son solo
para las suscripciones de Mercado Pago. Antes también tocaban las de Paddle.

### A2. Cambiar de proyecto mientras se guarda ya no pierde ni cruza cambios
- **Al abrir otro proyecto,** lo pendiente del que estaba abierto termina de guardarse antes. Antes, si se cambiaba en
  menos de un segundo, se perdía sin aviso.
- **Un guardado en curso** sigue de principio a fin con su proyecto y sus permisos. Antes podía terminar escribiendo
  lo de un proyecto dentro de otro.
- **Cuando producción cambia tus permisos,** lo que estabas editando se guarda primero con los permisos de antes.
- **Las secciones que no podías leer** se cargan vacías y nunca se suben. Antes, al recibir permiso nuevo, se podía
  subir un presupuesto vacío encima del real.

### A3. Lo editado sin conexión ya no se vuelve a aplicar y no deshace cambios del equipo
- **Al guardar con éxito,** la copia hecha sin conexión se borra. Antes quedaba y, al abrir el proyecto otra vez, se
  volvía a aplicar encima de los cambios del equipo.
- **Mientras haya cambios sin enviar,** se conserva la versión de la que partieron. Así la fusión, al volver internet,
  compara contra lo correcto.

### A4. Escribir el guion entre dos ya no pierde párrafos
La fusión del guion ahora va párrafo por párrafo, como en los programas de control de versiones:
- **Párrafos distintos:** si cada persona cambió uno distinto, quedan los dos cambios.
- **Agregar en un lugar y borrar en otro** también se combina.
- **Las dos agregan en el mismo lugar:** quedan las dos cosas, primero lo tuyo.
- **Las dos cambiaron los mismos párrafos:** solo ese tramo se queda con tu versión.

Antes, si llegaba el cambio de otra persona mientras tenías algo sin guardar, se quedaba tu guion entero y se perdía
lo de la otra persona.

### A5. Cambiar los números de escena ya no mueve datos a otra escena
Al actualizar el guion o al renumerar, todo lo que se guarda por número de escena sigue a su escena:
- la sinopsis;
- su fila del plan de rodaje;
- la hoja de script y Construcción;
- el animatic y los planos;
- **lo agregado desde la hoja de desglose** (antes se quedaba en el número viejo);
- **las notas pegadas a la escena** (antes no la seguían).

Si se borró una escena y otra toma su número, lo de la escena borrada ya no se mezcla con la otra:
- su sinopsis y su fila del plan se descartan;
- sus planos y sus notas quedan sueltos.

Antes, en ese caso, la escena se quedaba con la sinopsis y la fila del plan de la borrada.

### M1. Cambiar la categoría desde el guion conserva el elemento
Antes, pasar a «María» de Extras a Reparto desde la marca del guion creaba un elemento nuevo. Así quedaban sueltas sus
fotos, su ficha, su papel en Casting, su fila en la hoja de llamado, los planos donde sale y su línea del presupuesto.
- **Ahora el mismo elemento cambia de categoría,** como ya hacía el desglose. Si ya existía uno con ese nombre en la
  otra categoría, se unen.
- **Permisos:** un jefe de área solo puede elegir las categorías de sus cajas.
- **Solo lectura:** quien solo puede ver ve la marca, pero no puede cambiarla ni quitarla.

### M11. Nombres que venían de afuera, escapados
- **El nombre de un color de la leyenda,** al quitarlo, se muestra como texto. Antes se podía colar código en la
  página web sin cuentas.
- **El nombre del dueño** en las tarjetas de Inicio, igual.

### Presupuesto con céntimos
En la pestaña Presupuesto y en su PDF, los montos con céntimos se muestran con dos decimales y los enteros siguen sin
decimales. Antes S/ 12.50 salía como «S/ 13».

## Pruebas nuevas

- `test/compartir.test.js`: fusión del guion por párrafos, un guardado que no cambia de proyecto y el presupuesto de
  relleno que no se sube.
- `test/escenas.test.js`: renumerar y actualizar el guion sin cruzar datos de escenas.
- `server/test/paddle.test.js`:
  - el correo de la cuenta en Paddle;
  - el portal de otro cliente, que no se abre;
  - el aviso de Mercado Pago, que ya no les llega a quienes pagan con Paddle.

Cada prueba nueva falla con el código de antes y pasa con el de ahora.

## Probado

- **Pruebas:** pasan las del programa, las del equipo del escritorio y las 56 del servidor (55 de antes y una nueva).
- **Recorrido:** 14 pestañas en español e inglés, con tres anchos y en claro y oscuro, sin errores. En inglés no
  quedan textos sin traducir.
- **En un servidor local:**
  - se editó un proyecto y se abrió otro al instante: lo editado quedó en el primero y no pasó al segundo;
  - las copias sin conexión conservan su base y se borran al guardar.
- **En el navegador:** cambiar la categoría desde el guion conserva el elemento y sus fotos, y en solo lectura la marca
  no se puede cambiar.

## Archivos

`src/`:
- **Guardado del equipo y fusión:** `share.js`, `share-api.js`, `ui.js`
- **Números de escena:** `core.js`, `guion-editor.js`
- **Categoría desde el guion:** `tab-script.js`
- **Escapado:** `leyenda.js`, `inicio.js`
- **Montos con céntimos:** `pdf.js`, `tab-budget.js`

`server/`: `lib/billing.js`, `test/paddle.test.js`

`test/`: `compartir.test.js`, `escenas.test.js`

`i18n/`: `en-manual.json`

Raíz: `CAMBIOS-lote-A-2026-10-22.md`
