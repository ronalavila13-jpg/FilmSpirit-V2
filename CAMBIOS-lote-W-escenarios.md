# Lote W · escenarios: escala del escenario, constructor de escenarios y réplica de un importado (26-oct-2026)

Base: lotes T, U y V unidos. Rama lote-w-e. Solo la app (el servidor no cambia: los escenarios viajan dentro del
storyboard, como los importados y los planos de planta).

## Para Ronald: qué cambia y cómo se usa

### Observación 11 · Escala del escenario, con «Tamaño original» siempre a mano
- En el editor del plano, **Escena › Escenario**, debajo de la atmósfera, hay una barra **Escala** (de 25 % a 400 %, con
  el 100 % al medio) y el botón **«Tamaño original»**, que vuelve al 100 % en cualquier momento.
- La escala es **del escenario, no del plano**: todos los planos que usan ese escenario lo ven del mismo tamaño. Las
  figuras no cambian (siguen siendo personas de su altura); el escenario sí. Mientras no está al 100 %, una línea lo
  recuerda: «En todos los planos con este escenario. Las figuras no cambian.»
- Se ve en la viñeta, en la planta del plano, en la planta general, en el PDF del storyboard con planta y en el animatic.
- Al soltar la barra aparece «Escenario al 150 %.» con **Deshacer**; también se deshace desde la barra de arriba.
- Qué escenarios tienen escala:
  - los **escenarios 3D importados**, los **construidos** (nuevos) y los **planos de planta**: cada uno guarda la suya;
  - la **calle, los jardines y los paisajes** (parque, bosque, montaña, playa, desierto, cañaveral): la escala va **por
    locación del guion**. Si «AV. ESPAÑA» tiene la calle al 150 %, todos sus planos la ven así; otra locación con calle
    tiene la suya. La vereda, los edificios (que la cámara no atraviesa) y los postes de luz se escalan con ella.
  - la **habitación** no lleva barra: ya tiene su ancho, fondo y alto (y sus muebles van contra los muros). El
    **interior de vehículo** y el **mar abierto** (el bote) tienen su tamaño real, el **exterior abierto** es un piso con
    cuadrícula de 1 m y el **estudio** está vacío: tampoco.

### Observación 12 · Constructor de escenarios (primera versión)
- Se abre desde dos lugares:
  - **Scouting**, en la ficha de cada lugar: **«Construir su escenario»** (con la locación ya elegida). Si el lugar ya
    tiene uno, el botón dice **«Su escenario: …»** y lo abre para editarlo.
  - **Escena › Escenario** del editor 3D: al final de la lista, **«Construir uno nuevo…»**. Un escenario construido
    aparece en la misma lista como **«Escenario construido: …»**; con él elegido, **Editar…** lo vuelve a abrir y
    **Quitar** lo saca del proyecto (se puede deshacer).
- **El editor**: a la izquierda la planta sobre una cuadrícula en metros (la cruz roja es el centro de la escena, donde
  se paran las figuras) o la **vista 3D de prueba** (con una figura de 1,72 m para medir con el ojo); a la derecha el
  nombre, lo elegido, el alto de muros, los colores y la locación. Herramientas:
  - **Muro**: se arrastra de una punta a la otra; se pega a una cuadrícula de 5 cm (con Mayús, libre) y casi horizontal
    o casi vertical se endereza. Mientras se dibuja dice su largo. Elegido, se arrastra para moverlo o por sus puntas
    para alargarlo; en el panel, su largo, grosor y alto.
  - **Puerta** y **Ventana**: se toca un muro y abren su hueco (puerta de 0,90 m hasta 2,10 m; ventana de 1,20 m, de
    0,90 a 2,10 m). Si choca con otra o con la esquina, se corre al lugar libre más cercano. Se arrastran a lo largo del
    muro; en el panel, su ancho y sus alturas.
  - **Piso**: se toca cada esquina y se cierra tocando el primer punto (o con doble clic o Intro). Sin piso dibujado, el
    piso es la caja de los muros.
  - **Volumen**: se arrastra un rectángulo (mostrador, tarima, columna); su alto, en el panel.
  - **Mueble u objeto**: el mismo catálogo de «+ Objeto» del editor 3D (muebles, objetos, armas, puertas y exteriores,
    equipo) y **Luces** (fresnel, panel, práctica). Las luces entran a los planos como luces normales (se mueven y
    ajustan en cada plano).
  - **Elegir**: tocar elige, arrastrar mueve, Supr quita. El asa redonda de un mueble lo gira (de 15° en 15°; con Mayús,
    libre). Arrastrar en vacío mueve la vista; la rueda acerca.
  - **Colores** de muros y piso (muestras y «otro color»). **Interior / Exterior**.
  - **Deshacer y rehacer** dentro del editor (Ctrl+Z, Ctrl+Mayús+Z).
- **Al guardar**: nombre y **«Asignar a locación»** (las locaciones del guion) con **«Usar en toda la locación»**: los
  planos nuevos de esa locación lo traen (como un importado), y los que ya tienen puesta en escena de esa locación pasan
  a él (sus figuras quedan donde estaban). Sin locación queda en la lista para cualquier plano. El aviso trae Deshacer.
- **Tope**: 300 piezas por escenario (cada muro, puerta, ventana, mueble y luz es una pieza); abajo dice «12 de 300
  piezas». Al llegar al tope, un aviso.
- **Liviano**: un escenario construido son sus piezas (un cuarto con muebles: menos de 1 KB en el proyecto); no guarda
  imágenes. Al dibujarse, todos los muros son una sola malla, y los muebles se juntan por material (los repetidos se
  dibujan juntos).
- **Teléfono**: se ve (planta y 3D) y se asigna a una locación; para construir o cambiar muros hace falta la
  computadora («En el teléfono se mira y se asigna; se construye en la computadora.»). «Construir uno nuevo…» en el
  teléfono avisa lo mismo. **Solo lectura** (o sin permiso para editar el storyboard): se ve, no se edita.

### Observación 13 · Replicar un escenario importado y versión liviana
En la ventana del escenario 3D importado (al importarlo o con **Ajustar…**), debajo de las medidas, dos botones nuevos:
- **«Replicar como escenario editable»** · *«Sirve para interiores de muros rectos.»* Lee la planta del modelo (cortes a
  1,5 m, a 0,5 m, a 1 m y a 2 m del piso) y arma un escenario del constructor con los **muros** (largo y grosor), el
  **piso** con su contorno, los **huecos** de puertas y ventanas (los espacios en los muros: con antepecho es ventana)
  y los **volúmenes grandes** (mostradores, tarimas, columnas) como cajas, y el alto de muros del modelo. Pregunta qué
  hacer con el modelo:
  - si el modelo ya estaba guardado: **«Conservar el original»** o **«Borrar el original»** (dice cuánto pesa). Borrarlo
    pasa sus planos y su locación a la réplica y libera el espacio; **se puede deshacer** («Modelo «…» borrado: se
    liberaron 1010 kB.» con Deshacer, que devuelve el modelo con su planta).
  - si se acaba de importar: **«Guardar los dos»** o **«Solo el editable»** (el modelo no se llega a guardar).
  La réplica se abre en el constructor para corregirla antes de guardarla. Reconocer muebles por su nombre queda para la
  etapa siguiente.
- **«Versión liviana»**: el modelo reducido a unos 60 000 triángulos y con texturas de hasta 512 px (unos 48 kB cada
  una), con el simplificador de siempre. Las piezas simples (muros, pisos, cajas: hasta 3 000 triángulos) no se tocan, así
  no se deforman; se reduce lo pesado. Dice cuánto pesaba y cuánto pesa («Versión liviana: pesaba 1010 kB, ahora 710
  kB.») y al guardar lo repite. El modelo de antes vuelve con Deshacer. Si el modelo ya es liviano, el botón queda
  apagado («Ya es liviano.»).

## Decisiones (tomadas por el frente)

- **Escala de los hechos por código: por locación del guion** (`P.envEsc['<locación>|<escenario>']`). Así «la calle de
  la Av. España» es un escenario con su tamaño, igual para sus planos, y otra calle no cambia. No se escala por plano
  (lo aprobado: «la escala se guarda en el escenario»). La habitación no: su ancho, fondo y alto ya son su escala.
- **La escala es alrededor del centro de la escena** (donde se paran las figuras y el punto de la acción del importado):
  las figuras no se mueven; el escenario crece o se achica alrededor de ellas.
- **El escenario construido es un escenario 3D más** (`P.sets3d[id]` con `kind: 'c'`): hereda todo lo de los importados
  (lista, «Usar en toda la locación», `P.locSet3d`, planta general, quitar). No hace falta una imagen de su planta: se
  dibuja con sus piezas (más nítido y liviano).
- **Las luces del escenario construido** entran a cada plano como luces normales (`ob.bs` = el escenario): un plano puede
  ajustarlas sin cambiar el escenario. Al cambiar de escenario, las del anterior se van. Al editar el escenario, los
  planos que lo usan reciben las luces nuevas (las ya puestas no se tocan).
- **«Construir su escenario» en Scouting** abre con la primera locación **interior** del lugar (el constructor es para
  interiores); la lista trae todas las del lugar.
- **La réplica no depende de hacia dónde miran las caras** (en SketchUp suelen venir al revés): corta los triángulos con
  planos horizontales y rellena entre cruces de a pares (lo de menos de 50 cm es un muro). Las caras transparentes
  (vidrios) no cuentan, así una ventana con vidrio sigue siendo un hueco.
- **Borrar el original** solo se ofrece para un modelo ya guardado; para uno recién importado es «Solo el editable» (no
  se guarda nada que haya que borrar).
- **En el teléfono**: el constructor abre en modo de solo mirar (sin herramientas) con el nombre y la locación
  editables; uno nuevo no se abre (aviso).

## Notas técnicas

**Datos nuevos (compatibles hacia atrás; un proyecto de antes no cambia):**
- `P.sets3d[id] = { id, n, kind: 'c', v, loc, int, wh, wc, fc, walls, floor, items, b, h, esc? }` (ver la cabecera de
  `src/escenarios-construidos.js`). `walls[i] = { x0, z0, x1, z1, t, h?, o: [{ k: 'p'|'v', u, a, y0, y1 }] }`,
  `floor = [[x, z], …]`, `items[i] = { k, x, z, r, h?, w?, d?, hh? }` (k: objeto de `S3_PROPS`, `'vol'` o
  `'luz:<tipo>'`).
- `esc` (0,25 a 4; sin el campo, 1) en `P.sets3d[id]` (importados y construidos) y en `P.plans[id]`.
- `P.envEsc = { '<locación>|<escenario>': escala }` (solo `ENV_ESC_SETS`). Viaja con la sección «storyboard» del equipo
  (`src/share.js`, `secGet`/`secPut`).
- En los planos: las luces de un escenario construido llevan `ob.bs = <id del escenario>`.
- `bsNormalize` (al abrir y al llegar del equipo, desde `normalizeProject`): limpia los construidos (`bsClean`: números,
  colores, hasta 300 piezas, recalcula `b` y `h`) y las escalas.
- Deshacer: guardar, editar y quitar un construido, la escala, borrar un original y la versión liviana son pasos del
  historial del proyecto (`histNote` / `toastUndo`); dentro del constructor, su propio deshacer.

**Archivos nuevos** (en `build.sh`, después de `escenarios-3d`):
- `src/escenarios-construidos.js`: modelo de datos, huecos (`bsOps`, `bsWallBoxes`, `bsOpenAdd`, `bsNearWall`), lo que
  ocupa (`bsBounds`, `bsFloorPts`), limpieza (`bsClean`, `bsNormalize`), la escala (`escOf`, `escClamp`, `envEscOf`,
  `sceneEsc`, `escLocSet`, `ENV_ESC_SETS`), el armado 3D (`bsBuild`: muros en una malla con sus aristas, vidrios, muebles
  unidos con `propMerge`; `bsSync`, `bsDispose`), las luces (`bsLights`) y la planta (`bsDrawPlan`).
- `src/escenarios-replica.js`: la réplica (`rpReplicate` y sus partes: `rpSection`, `rpRuns`, `rpJoin`, `rpOutline`,
  `rpFloorMask`, `rpWallTop`), `rpTris` (las mallas del importador a triángulos), `rpLightPack` (versión liviana con
  `m3Pack`), `rpDropOriginal` (borrar el original con deshacer).
- `src/constructor-escenarios.js`: el editor (`openSetBuilder`), `sbUse`, `sbCanBuild`, `sbCanEdit`, el botón de Scouting
  (`sbScoutBtn`, acción `sb-scout`).

**Archivos tocados** (para unir con los otros frentes):
- `src/shot-editor.js` (solo el panel Escena › Escenario): la fila de escala (`escTarget`, `escRow`, `escSet`,
  `escFromSlider`; `data-k="esc"` en el `input` del panel y `data-c="escreset"`), «Construir uno nuevo…»
  (`modelo:+c` en `setOptions`, `build3d`), la tarjeta del escenario construido (medidas a escala, «Editar…»/«Ver…»),
  `useSet3d` con `bsLights`, `pickSet` quita las luces del construido, `del3d` (deshacer para los construidos).
- `src/tab-scout.js`: una línea (el botón en `hdHead`, junto a «Agregar candidata»).
- `src/escenarios-3d.js`: `set3dSync`/`set3dDrawPlan` llaman al construido; escala en el modelo, la planta, la niebla y
  el encuadre (`set3dEsc`); `set3dSig` con la escala; el importador: botones «Replicar…» y «Versión liviana»
  (`lite`, `replicate`, `save(after)`, `S.url0`).
- `src/modelos.js`: `m3Simplify(parts, budget, keep)` y `m3Pack` con `o.keep` (las partes simples no se reducen).
- `src/floorplan.js`: `planWorld` con la escala del plano; `planSig` y `PLAN_RW` la tienen en cuenta; las cuadras de
  la calle (`s3CamInside`) a escala.
- `src/s3d-render.js` (bloques «lote W»): escala de la calle y los paisajes en `r3Sync`; `syncPlan` y `r3ShadowSig`
  con la escala.
- `src/s3d-model.js` (bloques «lote W»): `groundAt` (la vereda a escala), `s3Default` (luces del construido y la
  locación de la escena), `s3Follow` (la locación).
- `src/s3d-plan.js`: `planDrawSet` escala la calle y los paisajes (`toS0` para los que llevan su escala).
- `src/s3d-entornos.js`: los postes de luz de la calle y el parque a escala (`envLampsOn`).
- `src/planta-general.js`: una línea (la locación de las escenas que dibuja).
- `src/proyectos.js` (`bsNormalize`), `src/share.js` (`envEsc`), `src/shell.html` (estilos `.esc-row`, `.sb-*`,
  `.e3-w`), `i18n/en-manual.json` (bloque «// lote W · escenarios»), `build.sh` (tres archivos).

**Pruebas:**
- Nueva `test/escenarios-w.test.js` (15): muro sin huecos, puerta y ventana (tramos, dintel, antepecho), huecos que
  chocan o no caben, huecos guardados que se pisan, el muro más cercano, lo que ocupa y la cuenta de piezas, limpieza
  (números, colores, tope de 300), escala (límites, `bsNormalize`), escala de la calle por locación, escala de importado
  y de plano de planta, luces del construido; réplica de un cuarto sintético de 6 × 4 m con puerta, ventana, columna y
  mostrador (también con un muro con las caras al revés), que la réplica pasa la limpieza, y un modelo sin piso.
  Usa `test/datos/cuarto-sintetico.js` (el cuarto armado con cajas).
- Antes y después: pasan todas las de la app salvo `pdf.test.js` (ya fallaba: necesita el módulo canvas);
  `test/planta.test.js` sigue pasando (busca el texto de `s3Default`: las líneas nuevas van antes de los elementos de la
  escena). Servidor: `npm test` pasa.
- En Chromium con Playwright (escritorio 1440×900, teléfono 390×844 con toque, tema oscuro): escala de la calle (viñeta y
  planta, deshacer, tamaño original) y de un construido al 150 %; el constructor (cuatro muros arrastrando, puerta,
  ventana, volumen, una mesa del catálogo, deshacer y rehacer, vista 3D, guardar y asignar a la locación); el plano del
  storyboard con ese escenario (viñeta, planta con la luz, planta general, PDF del storyboard con planta, animatic);
  Scouting («Construir su escenario» y «Su escenario: …»); teléfono (ver y asignar, aviso al construir); el importador
  con un .glb hecho por código (cuarto con puerta, ventana, columna, mostrador y una esfera de 80 000 triángulos con
  textura de 1024 px): versión liviana (1010 kB → 710 kB, 60 000 triángulos), réplica (4 muros, 2 huecos, 2
  volúmenes), conservar el original, borrar el original y deshacer (el modelo vuelve). Sin errores en la consola.

## Qué queda para después
- Reconocer muebles por su nombre en la réplica (hoy, los volúmenes son cajas).
- Materiales con textura (madera, cerámica…) en muros y piso: hoy, colores.
- Muros curvos o en ángulo en la réplica: la réplica lee muros rectos a lo largo de los ejes del modelo (si el modelo
  viene girado, girarlo antes con «Giro»). En el constructor sí se dibujan muros en cualquier ángulo (con Mayús).
- Unir muros que se tocan en una sola pieza al moverlos (hoy cada muro se mueve solo; las esquinas se cierran porque cada
  muro se alarga medio grosor en sus puntas).
- Varios pisos (niveles) en un escenario construido.
