# Lote U · storyboard: el máster de la escena y el 2D con el 3D (26-oct-2026)

Base: lote T. Rama u-storyboard. Dos pedidos de Ronald: (4) los planos de una escena toman la puesta en escena del máster y
(15) lo hecho en 2D se ve también en el 3D, en la viñeta, en el PDF y en el animatic.

## Qué cambia (para Ronald)

### Los planos de una escena siguen al máster
- Cada escena puede tener un **máster**. Es el que propone «Sugerir planos» (el «Plano máster de la escena»), el que tenga
  «máster» en su descripción o el que elijas con **⋯ › Usar como máster** (en la viñeta del storyboard o en el ⋯ del editor
  del plano). Hay uno por escena: si eliges otro, el anterior deja de serlo. La viñeta del máster lleva la etiqueta
  **Máster**.
- Los demás planos de la escena (los sugeridos y los que crees a mano) toman del máster **dónde está cada personaje, hacia
  dónde mira y su postura**, el escenario con sus muebles y objetos, la hora del día y la lluvia. Cada plano solo pone su
  cámara, que encuadra a su personaje según el tamaño del plano (PMC, PM, PG…).
- **Regla de los 180°**: todas las cámaras quedan del mismo lado de la línea de acción que la del máster. En un diálogo,
  el plano y el contraplano van **por encima del hombro del otro** (con quien habla en la escena): se ve la nuca y el
  hombro de uno en el borde del cuadro y al otro de frente.
- Un personaje del plano que no está en el máster se para junto al grupo. Un inserto (PD o INS) pone su objeto dentro del
  mismo escenario, a un costado del grupo, y la cámara lo mira desde el lado del máster.
- **Mientras no los ajustes a mano, siguen al máster**: si mueves a alguien en el máster, los demás se acomodan solos
  (viñetas, planta y PDF). Si mueves algo en un plano, ese plano queda con lo suyo. En el panel **Plano** del editor dice
  si sigue al máster; si lo ajustaste, «Volver a seguir al máster» lo deja seguirlo otra vez.
- La **planta general** de la escena muestra a cada personaje en un solo lugar (el del máster) con todas las cámaras
  alrededor.
- Si el máster todavía no se armó en 3D, se parte de su armado de siempre.

### El 2D y el 3D de un plano se ven juntos
- La escena 3D es ahora **una capa más** del dibujo: la **Viñeta 3D**. En el espacio 2D aparece en la lista de capas, con
  su ojo y su opacidad. Lo que está encima se superpone a la escena; lo que está debajo es el fondo, detrás de las figuras.
- Cada imagen tiene la opción **«Detrás de las figuras»**. Una foto nueva entra así (de fondo); el dibujo (trazos,
  flechas y textos) va siempre encima. Arrastrar una imagen por debajo de la Viñeta 3D también la deja detrás.
- Con una foto detrás de las figuras, la escena 3D se dibuja **sin su entorno** (cielo, suelo, edificios, muros de la
  habitación): quedan las figuras y los objetos con sus sombras sobre la foto, que hace de fondo real. Es lo mismo que ya
  hacía la foto de referencia «Detrás» del editor 3D. Si la foto está al 50 %, debajo se ve el papel blanco.
- En el **editor 3D**, la vista de cámara muestra las capas del 2D alineadas al cuadro, con su opacidad, y el cuadro del
  2D que toca en ese momento de la línea de tiempo. El botón **Capas 2D** (con un ojo, en la barra de arriba; en el
  teléfono solo el ojo) las muestra u oculta.
- En la **vista libre** las capas 2D se ocultan (la cámara que mira es otra) y abajo aparece un aviso chico. Con la cámara
  B tampoco se ven (el dibujo es de la cámara A).
- El dibujo va **pegado al cuadro**: si mueves la cámara en el 3D después de dibujar, el dibujo no se mueve. La primera
  vez que pasa, un aviso lo dice.
- La **viñeta del storyboard, el PDF y el animatic** muestran el resultado combinado, sin elegir entre 2D y 3D. «3D | 2D»
  arriba del editor solo decide en qué espacio se abre el plano.
- Lo que ya existía se ve como antes: las capas de antes quedan encima de la escena. Un plano que se dejó en el 3D
  después de dibujarlo en 2D ahora muestra la escena entera **más** lo dibujado (antes el dibujo no se veía).

## Decisiones

- **Quién es el máster**: el marcado (`sh.master = true`) manda; si ninguno, el primero en orden cuya descripción dice
  «máster»/«master». `sh.master = false` lo descarta aunque su descripción lo diga (así «marcar otro desmarca el
  anterior» también vale para los que lo decían en el texto). «Sugerir planos» marca su máster solo si la escena no
  tenía uno.
- **Qué hereda un plano**: la escena del máster en su instante 0, quieta (la animación del máster no se copia), con sus
  luces y su iluminación; no hereda lo que es de la cámara del máster (a quién sigue, temblor, cámara B, desenfoque,
  medidas). Los personajes se emparejan por elemento del desglose; quedan todos los del máster (están en el set) y los del
  plano van primero (a ellos apuntan el encuadre y los movimientos de cámara: seguimiento, arco…).
- **Plano y contraplano**: el «otro» es otro personaje del plano o, si no, el más cercano de los que hablan en la escena.
  La cámara se pone al menos 1,6 m detrás del otro; si con el lente de siempre quedaría más cerca, se cierra el lente
  para dar el mismo tamaño de plano (hasta 135 mm en full frame; si el plano tiene lente escrito, ese manda). Después se
  gira hacia el lado del máster hasta que la cabeza del otro queda a 0,85 del medio cuadro. Si aun así el otro quedaría
  pegado a la cámara, es un plano solo a 3/4, del lado del máster. Con ángulo «Subjetivo (POV)», desde los ojos del otro.
- **«Reencuadrar»** (panel Cámara) en una escena con máster usa estas mismas reglas.
- **Al elegir otro máster** desde el menú, su puesta en escena (la que tomaba del máster anterior, si no tenía propia)
  queda guardada como la del máster nuevo: nada cambia de lugar.
- **Un plano con dibujo 2D** sigue al máster igual que los demás: su escena 3D se acomoda y el dibujo queda pegado al
  cuadro (es lo pedido: el dibujo no sigue a la cámara). Para fijar su 3D, se ajusta a mano.
- **Foto detrás de las figuras = escena sin entorno**: cualquier imagen visible detrás de las figuras (con opacidad mayor
  que 0) hace que la escena 3D se dibuje sin cielo, suelo, escenario ni habitación, con un piso invisible que recibe las
  sombras (el mismo modo `plate` de la referencia «Detrás»). Los objetos (muebles, vehículos, animales) sí se ven.
- **Opacidad de la Viñeta 3D**: un dibujo nuevo la trae entera (100 %; antes 45 %, para calcar): ahora la escena es parte
  del cuadro final. Para calcar se baja en Capas. En el editor 3D, con «Capas 2D» encendido, la escena se ve con esa
  opacidad (lo mismo que saldrá en la viñeta); con «Capas 2D» apagado, la escena sola.
- **Guardar en el 3D un dibujo con la Viñeta 3D oculta** (un dibujo sobre papel que se pasa al 3D) la vuelve visible y
  opaca: si se trabajó en 3D, la escena se ve debajo del dibujo (antes el dibujo desaparecía de la viñeta).
- **La foto y la anotación del editor 3D** que el 2D trajo como capas al crearse no se dibujan dos veces: esa capa lleva
  `imp` y la de antes se oculta en la viñeta y en el editor 3D. Si después se cambia la foto o la anotación en el editor
  3D (o en la viñeta del storyboard), se ve la nueva y la capa queda como una más.

## Notas técnicas

**Datos nuevos (compatibles hacia atrás):**
- `sh.master` (booleano): el máster de la escena. Sin el campo, se decide por la descripción.
- `sh.d2.v = 2`: dibujos con el modelo de capas. Un dibujo `v1` se interpreta como se veía: si el plano quedó en el 3D
  (`sh.ws !== '2d'`), la Viñeta 3D visible y opaca; se pone al día al abrirlo en el 2D (`d2Norm`).
- `L.back` (solo en capas `kind: 'image'`): detrás de las figuras. `L.imp` ('ref' | 'anno'): la capa trajo la foto de
  referencia o la anotación del editor 3D. En los `v1`, las capas «Referencia» (imagen) y «Anotaciones» cuentan como tales.
- `sanitizeProject` (src/proyectos.js) deja `master` solo si es booleano, `back` solo en imágenes y `imp` solo con esos
  dos valores.
- Sin claves de imagen nuevas: la viñeta combinada se arma con las capas guardadas (`<plano>~d~<capa>~<cuadro|all>`); el
  cuadro compuesto (`~c~`) se sigue guardando y se usa cuando la Viñeta 3D está oculta (y en versiones anteriores).

**Archivos:**
- `src/s3d-model.js`: `shotMaster`, `isMaster`, `masterOf`, `setMaster`, `sceneSpeakers`, `s3Follow` (la escena desde el
  máster), `s3FrameFollow` (cámara por tamaño con la regla de los 180° y el hombro), `s3Auto`; `s3Of` sigue al máster
  (su firma lleva el máster; se rehace con cada `S3REV`, así las miniaturas se refrescan cuando el máster cambia).
  `s3Frame` acepta una dirección opcional. `detailOf` (el objeto del inserto; con varios en el mismo texto, el que nombra
  la descripción). No se tocaron `S3_SETS` ni las líneas `envSeatCar`/`envCarCam` de `s3Default`; `s3Follow` llama a las
  mismas funciones para el interior de un auto.
- `src/tab-script.js` (`suggestShots`): el máster sugerido lleva `master: true`.
- `src/s2d-editor.js`: el modelo de capas (`d2Layers`, `shot3D`, `d2Op3D`, `d2Imp`, `d2Norm`, `d2Unimp`, `d2LayerKeys`,
  `d2ViewKeys`, `shotViewKeys`, `d2Under`, `d2Paint`, `d2LaySig`); en el editor 2D, la fila «Viñeta 3D» entre las capas,
  «Detrás de las figuras», arrastrar a través de la Viñeta 3D, foto nueva detrás, la escena del cuadro en su segundo
  (`bgOf`, con o sin entorno) y esperar las figuras articuladas antes de dibujarla.
- `src/s3d-render.js`: `drawShotFrame` combina papel, fotos de fondo, escena (con su opacidad y `plate`) y dibujo;
  claves de miniatura (`thumbKeys`, `thumbImgKeys`, `thumbImgsReady`, `thumbFinal`, `figSig`, `thumbFigsReady`) con las
  capas del 2D.
- `src/shot-editor.js`: capas 2D en la vista de cámara (lienzo `#vp2d` encima de la foto de delante y debajo de la
  anotación), botón «Capas 2D», aviso de la vista libre, aviso del dibujo pegado al cuadro, «Usar como máster»,
  indicación en el panel Plano, «Volver a seguir al máster», «Reencuadrar» con el máster, guardar sin pisar los
  personajes de un plano que sigue al máster.
- `src/tab-board.js`: etiqueta Máster, «Usar como máster», etiqueta 2D en los planos con dibujo, lente y «animado» según
  lo que se ve, ayuda. `src/planta-general.js`: el máster primero (una ubicación por personaje) y, con el máster abierto
  en el editor, los demás desde sus cambios sin guardar. `src/tab-animatic.js` y `src/pdf.js` (viñetas): las capas del
  2D se piden con la viñeta. `src/s3d-figuras.js`, `src/s3d-pelo.js`: `shot3D` en vez de `ws !== '2d'`.
- `src/shell.html`: fila de la Viñeta 3D, etiqueta Máster, `#vp2d`, «Capas 2D» sin texto en el teléfono.
- `i18n/en-manual.json` (bloque «// lote U · storyboard»), `i18n/glosario-en.md` (línea de acción, capas 2D).

**Pruebas:** nueva `test/master.test.js` (14: el máster y su elección, herencia de la puesta, 180° y hombro, con quién se
habla, personaje que falta, inserto, seguir al máster y el ajustado a mano, máster sin 3D; capas, `shot3D`, dibujos de
antes, claves de la viñeta y el orden de `drawShotFrame`). `test/planta.test.js` recibe `deaccent` y `shot3D` en su
contexto. Antes y después: pasan todas las de la app salvo `pdf.test.js` (ya fallaba: necesita el módulo canvas), las 5
del equipo y las 15 del servidor.

**Capturas** en /home/claude/capturas-u/storyboard/ (antes y después, claro y oscuro, escritorio y teléfono): escena 1 y
escena 3 con máster (viñetas y planta general), tras mover a Ana en el máster, el menú «Usar como máster», plano con foto
detrás de las figuras y dibujo encima en el storyboard, el editor 3D (con y sin «Capas 2D», vista libre, aviso del dibujo
pegado), el espacio 2D con la Viñeta 3D como capa, foto nueva detrás de las figuras, animatic y la página del PDF.

**Para unir con los otros frentes:** si el frente «vehículos» cambia la firma de `envCarCam`/`envSeatCar`, `s3Follow`
(s3d-model.js) también las llama para el interior de un auto.
