# Lote W · editor 3D: aviso de encuadre, foco a mano, escenario del máster y escala de objetos (26-oct-2026)

Frente D del lote W. Base: lotes T, U y V unidos. Rama `lote-w-d`. Cuatro pedidos de Ronald, ya conversados: 6, 8, 9 y 10.

## Qué cambia (para Ronald)

### 6 · Aviso cuando la viñeta 3D no coincide con el guion técnico
- En el editor del plano, pestaña **Plano**: si la cámara 3D muestra otra cosa que lo anotado, en lugar de la nota gris
  aparece un aviso, por ejemplo: «La viñeta 3D muestra un PE · Plano entero; en el guion técnico dice PMC (y ángulo
  normal, no contrapicado; movimiento fijo, no cámara en mano).»
- Dos botones: **Usar lo de la viñeta** (el tamaño, el ángulo y el movimiento del formulario pasan a lo que se ve; se guarda
  con el plano y se deshace con ↶ del editor) y **Reencuadrar** (lo de siempre: la cámara va a lo anotado).
- Si todo coincide, se ve la nota gris de siempre. El soporte y el sonido no se comparan; el lente ya se iguala solo.
- El aviso se calcula al soltar la cámara (o al cambiar un dato), no mientras se arrastra: no parpadea.
- Solo en planos ajustados a mano. Los automáticos se arman solos con lo anotado y siempre coinciden.

### 8 · Mover el área de enfoque a mano
- Panel **Cámara**, con **Desenfoque** prendido: «Foco en» tiene la opción nueva **A mano**, con una barra de **Distancia** en
  metros (de 0,30 a 30 m; el número se puede escribir).
- **Tocar para enfocar**: el botón chico junto a «Foco en» (un visor con un punto). Con él prendido, la viñeta lleva un borde
  verde y un toque en cualquier punto enfoca ahí, como en el celular; después el modo se apaga solo (Esc también lo apaga).
  Así tocar sigue eligiendo figuras el resto del tiempo, sin confundir las dos cosas.
- En la **planta** de arriba, el plano de foco es la raya verde que cruza el cono de la cámara, con la zona nítida
  sombreada. Tiene un tirador al medio: **arrastrar la raya** acerca o aleja el foco.
- Tocar un punto o arrastrar la raya pasa «Foco en» a **A mano** con esa distancia. La línea «Foco a … · nítido de … a …» se
  actualiza en vivo y el desenfoque de la viñeta usa esa distancia. Todo se deshace. Sin animación del foco por ahora.

### 9 · Aviso en los planos cuando el máster cambia de escenario
- Al guardar el máster con **otro escenario** (decorado, ambiente, vehículo, hora, lluvia, muebles, objetos o luces del set),
  los planos de esa escena **ajustados a mano** cuyo escenario ya no coincide quedan marcados:
  - en su **viñeta** del storyboard, una marca chica (una flechita circular sobre fondo amarillo claro) junto a sus etiquetas;
  - en su **editor**, pestaña Plano: «El máster cambió de escenario (1.2). Este plano sigue con el de antes.» con
    **Actualizar escenario** y **Mantener así**.
- **Actualizar escenario** trae del máster el decorado, sus muebles y objetos, las luces del set, la hora del día y la lluvia.
  **No cambia la cámara ni la posición ni la postura de las figuras** de ese plano (ni su animación, ni lo que sostienen).
- **Mantener así** quita el aviso para ese cambio. Si el máster vuelve a cambiar de escenario, el aviso vuelve.
- Justo después de guardar el máster aparece un aviso con **Actualizar los N planos** (o «Actualizar el plano» si es uno),
  para no ir uno por uno. Ese aviso, además, trae **Deshacer**.
- En el **⋯** de la viñeta marcada también están «Actualizar escenario» y «Mantener su escenario».
- Los planos que siguen al máster solos (no ajustados a mano) no se marcan: ya se arman desde él.

### 10 · Agregar objetos 3D y cambiar su escala
- Al elegir un objeto, vehículo, animal o modelo importado como objeto, su panel trae **Escala** en porcentaje (barra de
  10 % a 500 %; el número se puede escribir) y debajo **Tamaño original** (vuelve al 100 %).
- En la **viñeta**, el objeto elegido lleva **cuatro esquinas** finas: arrastrar una lo agranda o achica desde su centro
  (con Mayús, de 10 en 10 %). Mientras se arrastra, arriba se ve el porcentaje.
- Las **figuras** (personajes) no tienen escala: su estatura viene de Personajes. Tampoco los extras en grupo ni las luces.
- La escala se ve en la viñeta, en la planta del plano (el objeto ocupa lo suyo y dice «Perro · 160 %»), en la planta
  general y en el PDF del storyboard con planta. Agregar objetos sigue igual: «+ Objeto» en la barra de la viñeta, en la
  planta y en el panel Figura.

## Decisiones tomadas por mi cuenta
- **Cómo se lee el tamaño (6)**: la figura principal es la que sigue la cámara o, si no, la primera que entra en el cuadro.
  Se proyectan sus referencias (coronilla, ojos, mentón, pecho, cintura, rodillas, pies) con la cámara y el lente del plano
  (las mismas fórmulas del visor, sin THREE), y el alto del cuadro a la distancia de sus ojos se compara con el que pone
  «Reencuadrar» para cada tamaño con esa figura y ese ángulo. Así lo que arma FilmSpirit siempre se lee como lo anotado (es
  la prueba principal). Sin la cabeza en cuadro y muy cerca, se lee un plano detalle; con un objeto de detalle cerca y sin
  figuras, PD o INS (y PD e INS no se discuten entre sí).
- **Ángulo (6)**: cenital (tilt ≤ −65°), nadir (tilt ≥ 55°, o cámara al ras del suelo mirando arriba); picado o contrapicado
  según cuánto difiere el tilt (8° o más) del de un plano normal de ese tamaño; holandés si está girada 4° o más (el
  holandés es compatible con lo demás: «Holandés» anotado sobre un contrapicado no avisa). «Subjetivo (POV)» y «Sobre el
  hombro» no se comparan (ni el tamaño ni el ángulo): dependen de dónde está el otro.
- **Movimiento (6)**: solo lo claro. Fijo (la cámara no cambia), cámara en mano (con temblor; con temblor suave también vale
  steadicam), dolly in/out y travelling (por cómo se desplaza respecto de hacia dónde mira), paneo y tilt (giro sin
  desplazarse), zoom (cambia el lente), grúa (sube), arco (gira alrededor de lo que encuadra), drone. Seguimiento, plano
  secuencia, steadicam, arco y barrido anotados no se discuten si la cámara se mueve. Si no es claro, no se compara.
- **«Usar lo de la viñeta» y deshacer (6)**: el paso va al deshacer del editor junto con la escena (el formulario anterior
  viaja en ese paso), así ↶ y ↷ lo devuelven como cualquier otro cambio. Cancelar el editor lo descarta, como siempre.
- **Tocar para enfocar (8)**: un modo que se prende con el botón y se apaga solo después del toque. Lo elegí en vez de
  «clic en el fondo vacío» porque en un plano el fondo casi nunca está vacío (piso, muros) y tocar ya mueve la cámara. La
  distancia es la del eje de la cámara hasta lo primero que hay bajo el dedo (figura, objeto, decorado o piso), que es la
  que usa el desenfoque; si se toca el cielo, no cambia.
- **El foco a mano (8)**: `s3.focusD` (metros). Se guarda con el plano, va con la cámara al clonar atributos (lote V) y no
  pasa del máster a sus planos (el máster no pasa su foco, como antes).
- **Qué es el escenario (9)**: `set`, `set3d`, `planId` (con el piso dibujado y los muros móviles), `room` (habitación y
  ambiente), `car` (modelo y color del interior de vehículo), `atm`, `sunAz`, `rain`, el modo de luz y el ambiente del lugar,
  y los objetos y luces que no son figuras ni extras, quietos en su instante 0 (con su escala). La exposición y el balance son
  de la cámara: no cuentan ni se traen.
- **Cuándo avisar (9)**: el máster cuenta sus cambios de escenario al guardar su editor (`stgN`) y cada plano anota hasta
  qué cambio ya vio (`stgSeen`, al actualizar o «Mantener así»). Así un plano que ya tenía otro escenario a propósito no se
  marca hasta que el máster cambie. Solo el editor del máster dispara el aviso (no la planta general).
- **Escala (10)**: es del objeto en todo el plano (no se anima). Los ids de los objetos traídos del máster se conservan.
  Las esquinas no aparecen en la vista libre, ni en objetos sostenidos por una figura.

## Notas técnicas

**Datos nuevos (compatibles hacia atrás):**
- `ob.sc` en objetos de `sh.s3.objs` (no figuras, extras ni luces): 0,1 a 5; 1 no se anota.
- `sh.s3.focusD`: distancia de foco a mano en metros (0,3 a 30). Con él, `s3.focus` no se usa.
- `sh.stgN` (máster: cuántas veces cambió de escenario) y `sh.stgSeen` (`'<id del máster>:<n>'`).
- `sanitizeProject` y el arreglo de escenas al abrir (src/proyectos.js) dejan solo valores válidos.

**Archivos:**
- `src/s3d-model.js` (bloques «lote W · …»): `s3Read`/`s3ReadDiff` (lectura del encuadre, con `camProj`, `figRefs`,
  `readCal`); `objSc`, `propFoot`, `objScClean`, `scalable`, `OBJ_SC`; `s3StageSig`, `s3TakeSet`, `stageStale`, `stageSeen`,
  `shotStageSig`; `focusMan`, `FOCUS_D` y `dofFocus` con el foco a mano. Además `s3Follow` no pasa `focusD` del máster,
  `CLONE_CAM_F` y `s3TakeStage` lo tratan como lo de la cámara.
- `src/shot-editor.js`: paneles Plano (aviso de encuadre y del máster), Cámara (A mano, Distancia, tocar para enfocar) y
  del objeto (Escala, Tamaño original); en el visor, el modo foco y las esquinas de escala; al guardar, el conteo del máster
  y la oferta de actualizar. No toqué el panel Escena › Escenario.
- `src/s3d-render.js`: la escala del objeto (`E.root.scale`, también el sostenido) y en la firma de sombras; `r3DepthAt`
  (lo que hay bajo un punto, para enfocar).
- `src/s3d-plan.js`: la huella con escala y el porcentaje en el nombre; la raya de foco con su tirador, que se arrastra
  (`ed.focusDrag`). `src/s3d-gente.js`: `objFoot` con escala.
- `src/planta-general.js`: solo la huella de los objetos con su escala (dos líneas, marcadas «lote W · D»).
- `src/tab-board.js`: la marca de la viñeta (`sbStgMark`), el ⋯ con «Actualizar escenario» y «Mantener su escenario»,
  `stageUpdate`, `stageKeep`, `stageOffer`.
- `src/proyectos.js`, `src/shell.html` (`.sx-read`, `.fp-sc`, `.rr-fo`, `.fo-tap`, `.badge.stg`), `i18n/en-manual.json`
  (bloque «// lote W · editor 3D»).

**Pruebas:** nuevas `test/encuadre.test.js` (11: cada tamaño que arma «Reencuadrar» se lee igual, con picado, contrapicado
y otro lente; el caso de la captura de Ronald; cenital, nadir, holandés; movimientos; temblor; detalle; POV; figura
principal) y `test/escenario-master.test.js` (4: la firma, la hora del guion, «Actualizar escenario» sin tocar cámara ni
figuras, cuándo aparece y se va el aviso). Pasan todas las de la app salvo `pdf.test.js` (ya fallaba: necesita el módulo
canvas; `pdf-diseno` se omite sin las bibliotecas de PDF) y las 91 del servidor.
En el navegador (Playwright, proyecto de ejemplo, escritorio y 390×844 táctil): el aviso con sus dos botones, deshacer y
rehacer; el perro al 160 % con las esquinas, por número, deshacer, «Tamaño original» y guardado; la planta del plano, la
planta general y la planta y la viñeta del PDF con el perro al 300 %; el máster pasado a Parque de noche: aviso con
«Actualizar el plano», marca en la viñeta, aviso en el editor, actualizar (cámara y figuras iguales), deshacer, mantener,
y el aviso que vuelve cuando el máster cambia otra vez; el foco a mano con la barra, tocando la viñeta (con ratón y con el
dedo), arrastrando la raya de la planta y vuelta a automático. Sin errores en la consola.
