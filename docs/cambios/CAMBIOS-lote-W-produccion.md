# Lote W · frente A (producción): stripboard sin íconos, hoja de llamado con los datos de antes, sin «Hecha con FilmSpirit» (26-oct-2026)

Base: la rama con los lotes T, U y V unidos. Frente A del lote W (rama lote-w-a).

## Para Ronald: qué cambia y cómo se usa

**Stripboard sin íconos de más (observación 1).** En la computadora, cada escena ya no tiene el asa de puntitos a la
izquierda ni, a la derecha, el ícono de la hoja de desglose y el menú ⋮. La barra «Cierre de jornada» tampoco tiene su «⋯».
La tabla usa ese ancho para las demás columnas. Nada se pierde:
- La escena se arrastra desde cualquier parte de la fila (como ya se podía).
- **Clic derecho sobre la escena** abre el mismo menú de siempre, que ahora empieza con **«Abrir hoja de desglose»** (lo que
  hacía el ícono). En «Ver en» quedan Guion y Llamado.
- **Clic derecho sobre la barra de cierre** abre sus opciones (quitar el corte, opciones de la jornada).
- La barra de arriba de cada jornada (con «+» y «⋯») queda igual.
- En el **teléfono o la tableta** (sin clic derecho; ahí se mantiene el dedo para mover la escena) siguen el ⋮ de cada escena y
  el «⋯» del cierre.
- El aviso de arriba dice ahora: «Arrastra una escena desde cualquier parte… Clic derecho en una escena o en una barra: sus
  opciones (y la hoja de desglose)». Sale una vez más en la computadora porque cambió. La ayuda también se actualizó.
- El PDF y el Excel del stripboard no tenían esas columnas: no cambian.

**Hoja de llamado: la estructura nueva con los datos de antes (observación 2).** La hoja se ve como en el lote U, pero ya
no tiene la «segunda parte» del final: todo lo que pedía la versión anterior está dentro, sin repetir, en pantalla, en el
PDF y en el Excel (en el mismo orden):
1. **Cabecera en tres columnas.** A la izquierda, la productora con jefatura de producción, dirección y 1.er asistente
   (con su teléfono) y, si los hay, **Producción** (de Proyecto, si no es ya la jefatura) y **Cliente** (Ajustes de la hoja):
   lo que antes iba en «Equipo clave». Al centro, el llamado general en grande con listos motor, almuerzo y **catering**. A la
   derecha, el clima (máxima, mínima, humedad, amanecer, anochecer), el **punto de encuentro entero** (la dirección de
   citación, su referencia, los enlaces de Google Maps o Waze y las fotos; se escriben ahí mismo y, si falta la dirección,
   avisa «Falta la dirección de citación») y la locación con «Ver mapa».
2. La nota para el equipo y la utilería especial, como en el lote U.
3. **Cronograma por escena, con sus planos debajo.** Cada escena con su franja de color (número y hora, encabezado,
   sinopsis, reparto, D/N, páginas) y, debajo, sus planos: el número del plano con su hora, la miniatura, la descripción
   técnica (tamaño · soporte · ángulo · movimiento), la acción, el set, el lente, el sonido (se elige ahí mismo) y los
   personajes. Las casillas **«Hora por plano»** y **«Miniaturas»** siguen arriba del cronograma y deciden si se ven la hora
   y la viñeta. La hora de cada plano se sigue tocando como en el lote U. Los eventos, los traslados y el fin de jornada,
   igual que antes.
4. El avance de la jornada siguiente, igual.
5. **Personas:** la misma tabla única, con las columnas de antes: Nombre, Rol / Personaje, Recojo, Llamado, Vest., Maq.,
   Listos, Teléfono (con el correo debajo, más chico) y Observaciones. El equipo va por área con su citación. Todo se
   edita ahí mismo. En el teléfono, cada persona va en tres o cuatro líneas con el nombre chico de cada hora.
6. **Movilidad** y **Proveedores**, después de las personas, con el mismo estilo de sección (se agregan con «+»).
7. Al pie, el centro de salud (nombre, teléfono y dirección; si falta, «Falta», como antes) y los canales de radio.
- En el PDF, con 5 escenas y sus planos, la primera página sale ordenada (cabecera, nota y el comienzo del cronograma);
  cada escena con sus planos pasa entera a la página siguiente si no cabe, y el pie va en cada página («1 de 3»).

**Sin «Hecha con FilmSpirit» (observación 3).** Se quitó de la pantalla (arriba a la izquierda) y del PDF. En el PDF, a la
derecha de esa línea, sigue la versión de la hoja («Hoja de llamado · v1 · 26 oct 17:08»).

## Decisiones tomadas
- **El ⋮ y el «⋯» del cierre en pantallas táctiles:** se decide con `@media (hover:hover) and (pointer:fine)` (computadora con
  mouse o trackpad: se esconden). Una laptop con pantalla táctil y mouse cuenta como computadora (tiene clic derecho). La
  columna del ⋮ se suma al final de la grilla solo cuando se ve (`--pl-more`), así no queda un hueco.
- **«Abrir hoja de desglose»** va primero en el menú de la escena (solo si es una escena y no una selección de varias). Se
  quitó «Desglose» de «Ver en» para no repetirlo.
- **Correo en la tabla de personas:** va debajo del teléfono, más chico, para que la tabla entre en A4 vertical con las
  cinco horas. En el PDF, un correo largo se parte en la @.
- **Descripción técnica del plano:** tamaño · soporte · ángulo · movimiento (como pidió Ronald). Los nombres de quién sale
  pasaron a «Personajes» (el reparto con su número; los demás, por su nombre). Antes iban en la descripción y «Personajes»
  solo tenía números.
- **Set del plano:** en pantalla siempre (columna «Set»); en el PDF y el Excel solo si dice algo que el encabezado de la
  escena no dice (si no, sería repetir «Cine Primavera» en cada plano).
- **Punto de encuentro:** su dirección, referencia, enlaces y fotos van en la columna derecha de la cabecera (donde el lote U
  ponía solo la nota de estacionamiento). En el PDF, la dirección en negrita, la referencia, los enlaces por su nombre
  («Google Maps · Waze», se tocan) y hasta dos fotos chicas. La «Referencia» es el mismo campo que el lote U llamaba «punto
  de encuentro o estacionamiento» (`dd.meet.note`): no hay datos nuevos.
- **Producción en la cabecera:** solo si en Proyecto hay un productor (no ejecutivo) distinto de quien figura en jefatura de
  producción, para no repetir el nombre.
- **Excel:** se rehízo en el orden nuevo (cabecera de tres columnas, nota, utilería, cronograma con los planos debajo de su
  escena, avance, personas con horarios, movilidad, proveedores, pie). Antes llevaba la cabecera vieja (`X.heads`, `X.keys`).
  Esos datos siguen en `callSheetData` por si otra parte los lee.
- **Pruebas de test/pdf-diseno.test.js:** las dos que fallaban esperaban la hoja de antes del lote U («Día de rodaje» y un
  título «Reparto»), que el lote U cambió a propósito. Ahora piden la cabecera actual (JORNADA N DE M, LLAMADO GENERAL y la
  hora debajo, antes del cronograma) y los títulos «Cronograma», «Personas» y «Avance…» en minúscula. Se sumó una prueba:
  sin segunda parte («Cronograma por plano», «Reparto · horarios»), sin «Hecha con» y con las columnas Plano, Recojo, Vest.,
  Maq., Listos y Observaciones.
- **De paso (inglés, PDF):** la línea «Listos motor · Almuerzo · Catering» traducía el catering escrito por la persona y
  salía «Craft Services / Craft Services / Catering: …». Ahora el catering va tal cual. «Vest.» sale «Ward.».

## Notas técnicas
- **Archivos:** src/tab-plan.js (columnas, fila, menú, aviso y ayuda del stripboard), src/tab-call.js (`RENDER.call` desde la
  cabecera hasta el final, `callKeyMore` nueva, `shotCallInfo`, `callSheetData.keyMore`, `callSheetXLSX` reescrita, ayuda,
  comentarios), src/pdf.js (`pdfCallHead`: sin la marca, con producción, cliente y el punto de encuentro entero; el cuerpo de
  `pdfCall` desde el cronograma: planos dentro de cada escena con `pdfBlocks`, personas con 9 columnas, movilidad y
  proveedores; se quitó la segunda parte), src/shell.html (CSS del stripboard y de la hoja), i18n/en-manual.json (bloque
  «// lote W · A»), test/pdf-diseno.test.js.
- **No toqué** barra.js, leyenda.js, tab-scout.js, server.js, shot-editor.js, s3d-*, tab-board.js ni el constructor de
  escenarios. De tab-scout.js solo uso `candPhotosHTML` y `candFramesNeed`, como antes.
- **Datos:** ninguno nuevo. Se usan los de antes: `dd.meet` {addr, note, links, ph}, `dd.cast[personaje]` {pu, call, ves,
  mq, ready, obs}, `dd.mov`, `dd.vend`, `C.vendors`, `C.client`, `dd.craft`.
- **CSS nuevo:** `.pl{--pl-more}` (la columna del ⋮, 0 con puntero fino), `.cl-mp`/`.cl-mph` (punto de encuentro en la
  cabecera), `.cl-lsh`/`.cl-shg`/`.cl-shm`/`.cl-lhs` (planos debajo de cada escena), `.cl-ptbl` de 10 columnas con
  `.cl-mlab` (la etiqueta de cada hora en el teléfono), `.cl-vtbl` (proveedores), `.cl-opts`. Se quitaron `.c-grip`, `.c-bd`,
  `.pbd` y `.cl-mark`.
- **Pruebas:** pasan todas las de la app (test/pdf-diseno.test.js ahora entera: 6 de 6) salvo test/pdf.test.js, que ya
  fallaba (necesita el módulo canvas). guion-lote-u y version con `node --test`: 11 y 3 sin fallas.
- **En el navegador** (Playwright, proyecto de ejemplo con equipo, reparto, horarios, punto de encuentro con enlaces y fotos,
  movilidad y proveedores de prueba): stripboard en computadora (sin íconos, clic derecho en escena y en cierre) y en el
  teléfono (390 px, táctil: ⋮ y «⋯» presentes); hoja de llamado en claro, oscuro, solo lectura, inglés y teléfono; «Hora por
  plano» encendida y cambiando la hora de un plano; «Miniaturas» apagada; PDF (español e inglés) renderizado con pdftoppm;
  Excel abierto y revisado. Sin errores en la consola.
