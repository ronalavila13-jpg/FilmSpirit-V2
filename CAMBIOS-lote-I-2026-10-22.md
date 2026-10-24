# FilmSpirit · lote I (22 de octubre de 2026): cabeceras al estilo Apple y el desglose con color

Las mejoras 7 y 8. Las 14 pestañas tienen la cabecera de las maquetas aprobadas: el título grande arriba a la
izquierda, lo de la pestaña como título (el día, la escena, el lugar, el total), el contexto en gris debajo, los
avisos como un botón chico al lado del título, los datos como listas de Ajustes y los vacíos diciendo qué va ahí.
Y la hoja de desglose tiene más color, en pantalla y en el PDF.

No cambia nada de lo que se guarda: los mismos campos, los mismos datos y los mismos PDF y Excel (salvo el del
desglose, que lleva el color nuevo).

## Cómo aplicarlo

Viene junto con los lotes G y H en `filmspirit-lotes-G-H-I.zip` y en `filmspirit-servidor.zip`; Gastos (lote J) va en
una entrega aparte. Nada que hacer aparte:

- **Web con cuentas (VPS):** `node server/make.js`, sube `server/` y en la VPS `sudo bash deploy/actualizar.sh`.
- **Escritorio:** `cd desktop && node make.js`.
- `build.sh` ya incluye el archivo nuevo `src/cabecera.js` (después de `ventanas`).

## Qué cambió

### Desglose con color (mejora 7)
- **Cada categoría con su color entero en la barra de arriba**, con la letra negra o blanca, la que se lea mejor.
  Si un color no deja leer ninguna de las dos (por ejemplo, el rojo de Vehículos), la barra se oscurece o se aclara
  apenas hasta que se lea bien (contraste de 4,5 o más, como pide la norma).
- **El cuerpo de la caja lleva una veladura del mismo color**; en modo oscuro, más suave.
- **Las categorías vacías ya no ocupan cajas:** queda una fila «Sin elementos todavía:» con un botón por categoría,
  con el «+» en un círculo de su color. Al tocarlo se abre la caja con su campo para escribir.
- **El PDF del desglose** pinta las barras con el mismo color que la pantalla.
- Los colores son los del proyecto: si se cambian en la leyenda, cambian aquí.

### Cabeceras (mejora 8), pestaña por pestaña
- **Hoja de llamado:** el día es el título, con ‹ › para pasar de jornada. «Faltan datos para enviarla» es un botón
  con el número; abre la lista de lo que falta, cada cosa dice dónde se completa y un toque lleva al campo
  (o «Exportar igual»). Llamado general, listos motor y locación en una tarjeta; lo que sale del plan lleva la
  etiqueta «del plan» y, si se escribe otra hora, deja de llevarla. Jornada, Seguridad y Clima como listas; Clima y
  la Nota para el equipo, si están vacíos, son una fila con «+».
- **Hoja de script:** el día como título con ‹ ›, el avance en una tarjeta (planos rodados con su barra, escenas y
  páginas), «Parte diario» a mano en la cabecera, y Material, Horas e Incidencias como listas. En el teléfono
  esas listas siguen plegadas bajo «Llamado 07:00 ⌄», como antes, para llegar rápido a los planos.
- **Desglose:** la escena es el título, con ‹ › redondos; Exterior · Día, las páginas y la jornada como etiquetas;
  «N sugeridos por confirmar» es un botón que explica cómo confirmarlos y trae «Confirmar los N» y «Los M de todo el
  guion».
- **Guion y Guion rayado:** la lista de escenas con título, cuenta y buscador redondeado. En el rayado, Etiquetas y
  Rayado son dos botones que se prenden por separado, y el panel de la escena tiene «Escena 1» como título con ‹ › y
  la sinopsis en letra normal. El panel «Revisión del guion» se arma como listas.
- **Historia:** el texto elegido es el título, con sus palabras debajo; Argumento, Biografías, Escaleta y Tarjetas
  como control de botones juntos (en el teléfono, el menú de siempre); la lista de textos con las palabras a la
  derecha; la ayuda de la hoja vacía sin cursiva y en un gris que se lee.
- **Proyecto:** el nombre es el título; Título, Guion, Versión, Productora y Formato en una lista; Dirección y
  Producción vacías son filas con «+»; los logos en cuadros redondeados con «Agregar logo»; en Equipo, las áreas sin
  personas juntas como botones «+ Producción», «+ Cámara»…
- **Scouting y Casting:** el lugar o el personaje es el título; cuando no hay candidatas, un vacío con ícono, una
  frase y el botón para agregar.
- **Storyboard:** «Todas las escenas ⌄» como título; al tocarlo se elige una escena. Una escena sin planos ofrece
  «Sugerir planos» y «Nuevo plano».
- **Animatic:** es la pantalla de edición, así que no lleva cabecera grande: solo el título con los planos y la
  duración en la barra.
- **Plan de rodaje:** las fechas del rodaje como título; jornadas, completadas (con su barra) y páginas en una
  tarjeta; «Todo programado» o «N sin programar» como botón al lado del título; la fecha de inicio en la cabecera.
  En la barra de cada jornada, el llamado que viene solo lleva la etiqueta «general» y el fin calculado,
  «calculada», sin cursiva.
- **Calendario:** los meses que se ven como título (se toca para ir a otro mes), ‹ Hoy › juntos y el rodaje en gris
  debajo. «+ Nota del mes» en lugar de la fila «NOTAS». Hoy va en un círculo del color de FilmSpirit.
- **Presupuesto:** el total es el título, con «Total con 10 % de imprevistos · título · N jornadas de rodaje»
  debajo. «Tarifas de ejemplo» es un botón que explica las tarifas («Entendido» lo quita en este equipo, como antes la franja).
  «Actualizar desde plan y desglose» sube a la cabecera. El resumen es una lista y las partidas sin costo van en gris.

### En todas
- **Los consejos de uso** («i» con su ✕) son una fila gris redondeada; los que se cerraron siguen cerrados.
- **Nada de relleno en las cabeceras:** sin «—», «--:--», «ej.:» ni cursiva; un vacío dice «Agregar», «Hora» o
  «Falta».
- **Funciona igual que antes:** los mismos campos (cada uno guarda donde guardaba), las filas «+» abren sus campos,
  ‹ › cambian de día, escena o mes, los controles de botones cambian de vista y en el teléfono se vuelven el menú
  de siempre.
- **En inglés:** todos los textos nuevos traducidos (bloque «// lote I» de `i18n/en-manual.json`).

## Lo que queda para otra ronda y por qué

- **Lo de adentro de las pestañas** (tablas del reparto en la hoja de llamado, filas del plan, tarjetas del
  storyboard) sigue con los «—» y la cursiva de siempre: lo aprobado era solo la cabecera y los campos vacíos de
  arriba.
- **El timeline del animatic:** los números de plano chicos sobre algunos colores de escena tienen poco contraste
  (2,8 a 4,4). Ya era así y es contenido de la pestaña.
- **En inglés, un nombre que también es palabra se traduce** (un personaje «Rosa» sale «Pink» en Casting). Ya pasaba
  antes; arreglarlo pide marcar los nombres en todo el programa.
- **«¿Buscas otro guion?»** (pantalla sin guion) sigue sin traducir: no es de este lote.

## Pruebas

- **Nuevas, `test/cabeceras.test.js` (13):** arman el programa entero sin navegador, abren el proyecto de ejemplo y
  dibujan cada pestaña. Revisan que las 14 tengan su cabecera; que no haya «—», «--:--», «ej.:» ni cursiva en ellas;
  que la hora del plan lleve «del plan» y lo pierda al escribir otra (y lo recupere si se escribe la misma del plan);
  que el aviso de la hoja de llamado cuente lo que falta y su lista diga dónde se completa cada cosa; que sin centro
  de salud se pida y su fila quede marcada; que la barra de cada categoría del desglose se lea con cualquier color
  (los del proyecto, los de la paleta y 200 al azar); que las categorías vacías salgan con su color y se abran; el
  menú de escenas del storyboard; el total como título del presupuesto; hoy en el calendario. Con el código de antes
  fallan 12 de las 13.
- **Todas las demás pasan:** las de `test/` (salvo `pdf.test.js`, que pide un guion FDX y su PDF como argumentos),
  las del equipo (11 y las 21 de `unit.js`) y las del servidor (68).
- **En el navegador:** las 14 pestañas en computadora, teléfono (390 px) y modo oscuro, en español y en inglés, con
  el proyecto de ejemplo y con uno nuevo casi vacío: sin textos de la cabecera con poco contraste, sin cursiva, sin
  errores y sin textos sin traducir. La prueba de humo (14 pestañas, 2 idiomas, 3 anchos, claro y oscuro) sin
  errores. Se probó a mano: la lista de pendientes lleva al campo, ‹ › cambian de día y de escena, las vistas
  cambian, el menú del storyboard elige la escena, las filas «+» abren sus campos y el PDF del desglose sale con las
  barras de color.

## Archivos

- Nuevo: `src/cabecera.js` (las piezas de las cabeceras), `test/cabeceras.test.js`.
- Cambiados: `build.sh`, `src/shell.html` (el CSS, junto a cada área), `src/tab-call.js`, `src/tab-sup.js`,
  `src/tab-breakdown.js`, `src/pdf.js`, `src/tab-script.js`, `src/guion-revision.js`, `src/barra.js`,
  `src/tab-build.js`, `src/tab-project.js`, `src/tab-scout.js`, `src/tab-casting.js`, `src/tab-board.js`,
  `src/tab-animatic.js`, `src/tab-plan.js`, `src/tab-cal.js`, `src/cal-meses.js`, `src/tab-budget.js`,
  `i18n/en-manual.json`.
