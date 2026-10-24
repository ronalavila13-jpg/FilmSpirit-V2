# FilmSpirit 1.2 · cambios

Este ZIP trae solo los archivos nuevos o modificados, con las mismas rutas del proyecto.
Descomprímelo **encima** de tu carpeta `octavos/` (reemplaza los archivos).

## Cómo aplicarlo

1. **Web con cuentas (VPS):** desde la carpeta del proyecto, `node server/make.js`, sube `server/` y en la VPS
   `sudo bash deploy/actualizar.sh`. Revisa las variables nuevas en `server/deploy/filmspirit.env.ejemplo`
   (precios con nombres nuevos, Paddle, `STUDIO_OPEN`, `FOUNDER_UNTIL`) y la guía `server/LEEME-VPS.md` (secciones 6 y 7).
2. **Escritorio:** `cd desktop && node make.js` como siempre (el `build.sh` ya incluye los archivos nuevos).
3. **Pruebas del servidor:** `cd server && npm test` (50 pruebas).

## Qué cambia

### Planes
- **Guion (gratis):** 5 guiones activos, coescritos por hasta 4 personas, solo texto; PDF del guion sin marca de agua.
- **Indie:** S/ 29 al mes (S/ 290 al año) o US$ 7,99 (US$ 79). Guiones sin límite y 2 proyectos de producción, solo tú, 5 GB.
- **Pro:** S/ 49 (S/ 490) o US$ 14,99 (US$ 149). 7 proyectos de producción, equipos de 30 personas, 20 GB, 30 días de prueba.
- **Studio:** S/ 129 (S/ 1 290) o US$ 39 (US$ 390). 20 proyectos, 60 personas, 100 GB; lista de espera hasta tener
  el scouting con mapas y el casting. Detalle al final, en «Planes Guion, Indie, Pro y Studio».
- El país se detecta solo (Cloudflare, zona horaria, idioma); la web pública se ve en español, inglés,
  portugués, francés o italiano.

### Proyecto
- **Descargar todo el proyecto en un ZIP:** archivo del proyecto, guion (.fountain), PDF, Excel, imágenes y equipo.
- **Archivar:** el proyecto queda en solo lectura, se puede ver y exportar, y libera su lugar en el plan.
- **Equipo completo:** cargos, funciones, documento, contacto y notas; se importa desde las cuentas del equipo y se descarga en CSV.

### Guion
- **Escribir guiones** en formato cine y en formato AV a dos columnas (Marcar / Escribir).
- Al importar un guion se abre directamente la pestaña Guion.
- **+ Plano** desde una selección: ventana rápida con escala, ángulo y movimiento → «Plano agregado» y sigues marcando.
- La barra de categorías se ve con el guion ampliado con los dedos (zoom) y, en el teléfono, como hoja con los nombres completos.
- Guion AV en el teléfono: el audio va debajo del video (con sus rótulos), los textos de ayuda se parten dentro
  de su celda y la hoja es papel blanco también en modo oscuro.

### Storyboard (editor del plano)
- **Esfera de ejes** en la vista 3D al elegir una figura u objeto: centro = mover libre, X/Z = mover en un eje,
  Y = altura (objetos pequeños y luces), anillo = girar.
- **Flechas de cámara** sobre la vista 3D: avanzar, retroceder, a los lados, girar, subir y bajar (mantener presionado).
- **Planta a pantalla completa:** doble toque (o ⤢), cuadrada y centrada (nunca se sale por los costados),
  con la vista del plano en una esquina.
- **Doblar el cuerpo:** toca una figura elegida sobre una parte del cuerpo; se tiñe de rojo tenue y aparece su aro.
  Arrástrala: codo y rodilla siguen el aro, la cabeza gira o se inclina, el torso se dobla hacia adelante o a un
  lado; la mano y el pie llevan el brazo o la pierna entera. ↺ vuelve esa parte a la postura base.
  Nuevos ángulos: torso a un lado, torso girado y piernas abiertas.
- La figura sentada ya no lleva un banco debajo: queda sentada en el aire (pon una silla si hace falta).
- **Posturas predefinidas:** junto al nombre de cada figura en la vista 3D hay un triangulito ▾ (también el
  botón «Postura» del panel). Abre la lista: De pie, Caminando, Corriendo, Sentado, Tendido, Manejando, Saltando,
  Lucha, Manos arriba, Saludando, Ciclista, Llorando, Pensando, Señalando, Manos al rostro, Brazos cruzados,
  En cuclillas, De rodillas, Rodilla en tierra, Sentado en el suelo, Sentado a la mesa, Boca abajo, Inclinado,
  Rezando, Bailando y Cubriéndose. Solo cambia el cuerpo (no agrega objetos) en todo el plano; se ven cinco y el
  resto aparece deslizando con el dedo o con la rueda. Si la cara estaba neutral, la postura sugiere su expresión
  (Llorando → triste). Después se puede seguir doblando a mano.
- Al doblar las rodillas la cadera baja sola hasta apoyar el pie; caminar y correr entre dos claves da pasos
  apoyados en el suelo. El nombre de la figura va sobre su cabeza real.
- **Entornos y atmósferas:** el encabezado de la escena arma el lugar y la hora («EXT. PLAYA – ATARDECER»: playa
  con el sol bajo y cálido, sombras largas). Entornos: habitación, interior de automóvil (las figuras se sientan,
  la primera maneja; cámara por el parabrisas), exterior abierto, calle, parque, bosque, montaña, playa, mar abierto
  (en un bote), desierto o arenal, cañaveral o chacra y estudio vacío. Atmósferas: día, amanecer, hora dorada,
  atardecer, noche (luna y estrellas), nublado, día lluvioso y niebla; la lluvia se suma a cualquiera y el sol o la
  luna se giran. Con «Simular la luz», el sol y el cielo dan su luz real en lux (con ND automático a pleno sol).
- El objeto de los planos detalle e insertos ahora es un florero y la cámara encuadra sus flores. Si el objeto
  del plano es una lámpara (foco, bombilla), se ve como una **lámpara de proyector**, quemada si el plano lo dice;
  «Se ve como» en el panel permite elegir florero, lámpara o lámpara quemada.
- Rendimiento: al cambiar de plano, cada figura que se quita libera su textura de huesos en la GPU (antes se
  acumulaban al recorrer el storyboard o reproducir el animatic).
- **Alumbrado público** en la calle (y faroles en el parque): se enciende de noche, al atardecer y al amanecer;
  cada poste deja su charco de luz cálida y los cuatro más cercanos iluminan a las figuras (el más cercano con
  sombra). En la simulación cuentan en lux y, con poca luz, el ISO sube solo hasta 6400.
- **Ejes más discretos:** sin la esfera amarilla, flechas finas con punta pequeña. Las figuras tienen ahora la
  flecha verde hacia arriba para subirlas (vereda, cubierta del bote, tarima) y que los pies no se hundan.
- **Copiar anterior** (barra de la planta): trae la puesta en escena del plano anterior —figuras, objetos, luces,
  escenario— con la animación de sus figuras y objetos; la cámara del plano no cambia (ni sus movimientos).
  En la línea de tiempo aparece la barra «Acción»: arrastrarla elige qué parte de la acción entra en este plano
  (lo que queda fuera se ve sombreado a los lados). Cámara y acción ahora son pistas separadas.
- **Animatic con insertos:** un plano que copió la acción de otro y empieza dentro de él (un detalle entre el
  segundo 3 y el 7 de un seguimiento, por ejemplo) va en la pista **V2**, encima, sin cortar el plano de abajo.
  Doble clic lo abre. Si empieza después de que el otro termina, sigue en V1 como plano siguiente.
- **Viñeta 3D aislada:** ⤢ o doble toque en un espacio vacío; ocupa el ancho de la pantalla y la barra de animar
  queda siempre debajo. Esc vuelve.
- **Vista libre:** gira alrededor de la figura (arrastrar, rueda o pellizco) para posarla desde cualquier lado sin
  mover la cámara del plano, que se ve como una pirámide blanca. «Volver al encuadre» regresa.
- Controles de cámara mínimos y sin fondo (íconos blancos con un halo suave).
- **Deshacer y rehacer** en el editor del plano: flechas ↶ ↷ arriba de la viñeta y Ctrl + Z, Ctrl + Mayús + Z o
  Ctrl + Y. Cubren todo lo que se cambia en el plano (mover, girar, posar, cámara, luces, entorno); un toque que
  no cambió nada no ocupa un paso.
- **Barra superior de la viñeta:** ↶ ↷ siempre; en la viñeta aislada y en el teléfono también + Figura,
  + Objeto, Entorno ▾, Atmósfera ▾ y el botón de los nombres (solo afecta a este plano).
- **En el teléfono**, debajo de la viñeta y la barra de animar va el panel (Figura, Cámara, Luz, Plano, Dibujo)
  y la planta después; en la viñeta aislada el panel queda debajo, con su propio desplazamiento, así se
  personaliza la figura sin salir. La barra de la viñeta tiene también **2D** para pasar al dibujo a mano.
- **Nombres más limpios:** sin recuadro, letras blancas pequeñas y espaciadas con un halo suave, un punto con el
  color de la figura (el mismo de la planta) y un ▾ fino; más chicos y tenues en figuras pequeñas o lejanas. El ▾ de
  posturas sigue visible aunque se oculten. La lista de posturas no tiene barra de desplazamiento: la última se difumina
  para indicar que hay más, sobre un fondo translúcido.
- **Cubo de vista** en la vista libre (arriba a la derecha), mínimo y transparente como los demás indicadores
  (aristas y nombres blancos con halo): tocar una cara (Frente, Atrás, Izq., Der., Arriba)
  gira la vista con suavidad hasta ese lado de la figura elegida; las flechas ◀ ▶ dan un cuarto de vuelta, ▲ mira
  desde arriba y ▼ vuelve a la altura de la figura; arrastrarlo gira la vista. La cámara del plano no se mueve.
- **Antebrazo y mano sin barras:** al tocar el antebrazo, además del camino del codo aparece un aro en la muñeca
  que **gira la mano** hacia los lados; al tocar la mano, su aro **abre y cierra los dedos** (el arco rojo muestra
  cuánto) y el punto rojo sigue moviendo el brazo. Se animan entre claves como el resto.
- Se quitó el panel de barras «Brazos, piernas y cabeza»; queda «Restablecer pose» junto a la postura.
- **Expresiones dibujadas:** en «Expresión», «Dibujar» abre una cara para dibujar con el dedo o el ratón
  (lápiz fino, medio o grueso, relleno para bocas abiertas o cejas, borrador), partiendo de la expresión que tiene
  la figura o en blanco. Queda en la lista para cualquier figura del proyecto; «Editar el dibujo» la cambia en
  todos los planos que la usan.
- **Accesorios dibujados (casco visual):** sombrero, lentes, mochila, cinturón… Se dibuja su silueta sobre la
  figura vista de frente, de lado, desde arriba y, si hace falta, desde atrás; el volumen es lo que cabe en todas
  las siluetas (con una sola vista se infla como una almohada) y se ve girando en 3D mientras se dibuja. Va en la
  cabeza, el torso, la cadera o el cuerpo entero y acompaña a la figura cuando se mueve. Es parte de la ficha del
  personaje (todos sus planos); se puede editar, ocultar o borrar. Si se dibuja en una sola vista, la pieza se apoya
  sobre la piel de ese lado (lo dibujado de frente va delante del cuerpo, lo de atrás en la espalda).
- **Ropa:** en el mismo editor, el tipo «Ropa» hace que lo pintado cubra la piel del maniquí y se doble con la
  figura (brazos, piernas, torso), con el dobladillo parejo. Dibujada de frente rodea el cuerpo; si por detrás es
  distinta, se dibuja también en «Atrás». El control **Volumen** la hace más ajustada o más holgada (en las piezas,
  más fina o más gruesa).
- **Pestaña «Escena»** en el editor del plano: escenario, atmósfera, lluvia, dirección del sol o la luna, plano de
  planta y medidas de la habitación salieron de «Cámara».

### Luz física (prototipo, función avanzada)
En la pestaña **Luz** del editor del plano, con «Simular la luz»:
- **Equipos reales:** fresnel de tungsteno 650 W, 1 K y 2 K; HMI 1.2 K, 1.8 K y 4 K; LED COB 300 y 600 W; paneles
  LED; tubos; banco fluorescente; práctica; sol. Cada uno con su rendimiento (lux a 3 m), haz spot ↔ flood,
  temperatura y consumo. Valores aproximados de catálogo: confírmalos con la ficha de cada equipo.
- La luz **cae con la distancia** como en la realidad y las sombras se suavizan según el tamaño de la fuente.
- **Modificadores:** rejilla, softbox, octabox, paraguas, marcos de difusión y seda (cada uno con su pérdida en pasos).
- **Rebote** (blanco o plata: devuelve la luz que le llega como relleno) y **bandera** negra (tapa la luz que la cruza).
- **Exposición de cámara:** ISO, obturador, diafragma y ND, o diafragma automático para la figura que sigue la cámara.
- **Fotómetro** sobre cada figura: diafragma correcto, lux y diferencia en pasos (verde bien, naranja sobre, azul bajo).
- **Color falso** sobre la viñeta (negro, sombra, gris medio, piel +1, casi blanco, quemado).
- **Lista de equipos** del plano y del proyecto: cantidad a la vez, vatios, amperios a 220 V y generador sugerido;
  «Llevar al presupuesto» crea las líneas en «Cámara, luces y grip» con los días de rodaje enlazados.

### Animatic: herramientas de edición
- Dividir en el cabezal (S), quitar el comienzo o el final hasta el cabezal (Q / W), recortar con los bordes.
- Quitar cerrando el hueco (Supr) o dejando un negro (Mayús + Supr), duplicar (Ctrl + D).
- Títulos y negros (T / B), imán (N), deshacer y rehacer (Ctrl + Z / Ctrl + Mayús + Z), J K L, Alt + ← →.
- Arrastrar un clip lo mueve (los demás le hacen espacio); en el teléfono, mantener el dedo. Recuadro para
  elegir varios desde una pista vacía. Clic en un espacio vacío suelta la selección; otro clic sobre un clip
  elegido lo suelta.
- **V2 se edita como V1:** los insertos se eligen, se recortan con sus bordes (la acción copiada no se estira),
  se dividen, duplican y quitan, con deshacer. Arrastrarlos por V2 cambia dónde entran (su acción copiada se
  corre con ellos, sincronizada con el plano de abajo); llevarlos hasta V1 los vuelve un plano que corta el
  montaje, y un clip de V1 llevado hasta V2 pasa a ser un inserto. Al dividir un plano de V1, sus insertos de la
  segunda mitad pasan a ir encima de ella.
- **Cuchilla:** C (o las tijeras sin nada elegido) activa el modo de corte; una línea con el tiempo exacto sigue
  al puntero, pegada a los cuadros, y un toque sobre un clip de V1 o V2 lo corta ahí. C o Esc para salir. Con un
  clip elegido, las tijeras (o S) dividen en el cabezal; si el elegido es un inserto bajo el cabezal, se divide él.

### Plan de rodaje, calendario y tablero
- Mismo gesto en todas las barras: con el ratón, **se agarran al primer clic** y se arrastran (los demás hacen
  espacio, el cambio se aplica al soltar); en el teléfono, mantener el dedo un instante. Desde un espacio vacío
  se dibuja un recuadro para elegir varias. **Clic en un espacio vacío quita la selección** en todo el programa.
- Plan: cada jornada empieza con su **barra de inicio** (número, fecha, llamado, escenas y duración estimada) y
  termina con la de cierre. Sin el recuadro lateral, sin casillas ni asas ⠿. Clic derecho en una barra (en el
  teléfono, mantener el dedo y soltar) abre sus opciones; «Quitar corte» está en el menú del cierre. La jornada
  entera se mueve arrastrando su barra de inicio.
- Horas estimadas por escena en el plan y en la hoja de llamado.
- Calendario: abrir y desplegar con doble toque. Sin barras de zoom: **Tab + rueda** cambia el ancho de los días
  (también Ctrl + rueda), la **línea de la base** de la tabla cambia el alto de las filas (doble clic: normal) y
  en el teléfono se **pellizca** con dos dedos.
- Tablero del calendario: las fases con pocas tareas se acomodan debajo de otras para aprovechar el ancho;
  en el teléfono, una sola columna.

### Sin conexión
- La app se abre sin internet, los proyectos abiertos antes se editan y se exportan, y los cambios se envían
  solos al volver la conexión (con la fusión del trabajo en equipo).

### Diseño
- Más sobrio: superficies planas, avisos discretos, cifras del plan en una sola línea.
- En el teléfono, menús y ventanas suben desde abajo como hojas y siempre caben en la pantalla.
- Ícono de la pestaña del navegador sobre una baldosa blanca: se ve en pestañas claras y oscuras
  (más `favicon.ico` y el ícono para la pantalla de inicio del iPhone). Se generan con `desktop/marca/favicon.py`.
- El botón «Continuar con Google» ya no muestra un recuadro blanco en modo oscuro.

### Que no se pierda trabajo
- **Deshacer en todo el programa:** botones ↶ ↷ en la barra superior y Ctrl+Z / Ctrl+Mayús+Z (Ctrl+Y) en Desglose,
  Storyboard, Plan, Calendario, Hoja de llamado, Presupuesto, Proyecto, Hoja de script y en «Marcar» del guion.
  Cada pestaña deshace lo suyo sin tocar lo que se hizo después en otra; «Escribir» y el animatic conservan su
  propio deshacer. Los cambios que llegan del equipo no se deshacen. En el teléfono queda solo ↶ cuando hay algo.
- **Avisos con «Deshacer»** al borrar o mover: planos (con sus dibujos y tomas), tareas, tomas, líneas del
  presupuesto, elementos y marcas del desglose, fotos, proveedores, personas del equipo, logos, créditos,
  jornadas y escenas del plan. El aviso espera mientras el puntero está encima.
- **Ventanas que no descartan solas:** tocar fuera solo cierra si el toque empezó y terminó fuera (soltar un
  arrastre en el borde ya no cierra). Si hay cambios sin guardar, cerrar con ✕, Esc o tocando fuera pregunta
  «¿Descartar los cambios?» con Guardar, Seguir editando o Descartar. El editor del plano, la ficha del personaje,
  las fotos, el plano de planta, los accesorios y el dibujo de expresiones también preguntan, y el editor del plano
  no se cierra al tocar fuera. Esc cierra solo lo de más arriba (el menú, luego la ventana).
- Una ventana que se abre sobre el editor del plano (por ejemplo, la de Pro) ya no lo cierra: queda debajo.
- La exportación del video no se cancela con Esc ni tocando fuera, solo con «Cancelar».
- **Eliminar plano** pasa al menú ⋯ del editor (junto a Duplicar) y se puede deshacer.
- **Hoja de llamado:** la ✕ de una persona pregunta si «No viene esta jornada» (queda en el equipo y aparece en
  «No vienen esta jornada», de donde vuelve con un toque) o «Quitar del equipo del proyecto…» (con confirmación).
  El PDF y el Excel de la jornada no incluyen a quien no viene.
- **Presupuesto:** una línea enlazada a un personaje, locación o vehículo que ya no está en el desglose se borra
  solo si nadie la tocó; si tenía tarifa, cantidad o nota propias, queda «sin enlace» (con su tarifa) y se avisa.
  Si el elemento vuelve, se vuelve a enlazar.
- **El ejemplo no se guarda solo** (antes, abrir la hoja de llamado lo convertía en un proyecto y en el escritorio
  Free ocupaba el único lugar). Una banda arriba ofrece «Importar mi guion», «Empezar en blanco» y «Guardar el
  ejemplo como mi proyecto» (con sus dibujos); se puede ocultar.
- **Errores a la vista:** un solo aviso rojo, con «Reintentar» cuando se puede, si no se guardan dibujos o fotos,
  si no se copian los dibujos al duplicar un plano, si una imagen hecha sin conexión no se sube, si el PDF sale
  sin alguna imagen o si la música no queda guardada. Si la lista de proyectos no carga, se dice (antes parecía
  vacía) y se abre el último proyecto en vez del ejemplo.
- **Cerrar la pestaña de la web** pide confirmación si algo no llegó a guardarse, si el último guardado falló,
  si hay un editor con cambios o si se trabajó en el ejemplo.
- Los avisos de arriba (solo lectura, versión nueva, plan, ejemplo) van en su propia fila, uno debajo del otro.

### Rapidez
- **Storyboard:** las miniaturas se hacen solo para las viñetas a la vista o por aparecer (las demás, al desplazarse),
  de a una y sin trabar la pantalla; esperan a que carguen las figuras articuladas en vez de dibujar primero el
  maniquí simple y después otra vez. Cuando termina de cargar una imagen, una figura o un plano de planta, se rehace
  solo la miniatura que la usa (antes se borraban y rehacían todas). En la prueba, las miniaturas visibles del ejemplo
  pasan de 6,5 s y 21 dibujos 3D a 2,3 s y 7 dibujos.
- El aspecto de cada personaje (edad, cuerpo) se deduce una vez por nombre y no en cada dibujo (228 lecturas del guion
  por pintada del storyboard → 12 consultas en memoria), y la escena por defecto de cada plano se arma una vez
  por cambio del proyecto (48 → 0 por pintada).
- **Editor del plano:** los pedidos de dibujo se juntan en uno por cuadro de pantalla. 30 movimientos seguidos de la
  cámara: antes 30 dibujos 3D (12 s en un equipo sin tarjeta gráfica), ahora 1. Antes de medir o tocar una figura,
  la escena se prepara sin dibujarse. Abrir el editor: 790 → 450 ms.
- **Sombras:** se recalculan solo cuando cambia lo que las proyecta (figuras, posturas, objetos, luces, escenario),
  no al mover la cámara; reproduciendo, a lo sumo unas 8 veces por segundo.
- El lienzo del motor 3D ya no se reasigna al alternar miniaturas y editor: crece una vez y cada dibujo usa su zona.
- **Animatic:** reproduciendo, el cuadro se arma a 960 px como máximo y en pausa vuelve a tamaño completo. Abrir la
  pestaña: 965 → 540 ms.
- **Arranque:** el generador de PDF (jsPDF, ~115 kB) ya no se carga al abrir: llega en segundo plano unos segundos
  después o al exportar. El código de la app va compacto (sin espacios ni comentarios, con los mismos nombres):
  1,37 MB → 1,04 MB; transferido, 351 → 298 kB. Para depurar: `FS_NOMIN=1 sh build.sh`.
  **Nuevo requisito de compilación:** `npm install` en la carpeta del proyecto instala `esbuild` (devDependency);
  sin él, la app se compila igual, sin compactar.

### Comodidad
- **Calendario:** con el ratón un clic basta para abrir o desplegar (el doble toque queda solo para el dedo, donde
  evita abrir cosas al desplazarse). Tab vuelve a moverse entre botones: el ancho de los días es Ctrl + rueda
  (o Alt + rueda).
- **Editor del plano:**
  - la rueda del ratón mueve la cámara solo después de hacer clic en la viñeta (o con Ctrl, Mayús o Alt), así
    desplazar el panel pasando por encima ya no cambia el encuadre; la primera vez se explica con un aviso;
  - en la pestaña Dibujo, Ctrl+Z deshace el último trazo (ya no la escena 3D que no se está viendo);
  - Ctrl+S guarda, como en el dibujo 2D.
- **Storyboard (viñetas):**
  - arrastra una viñeta para cambiar su orden en la escena (con el dedo, mantenerla un instante); se puede deshacer;
  - cada viñeta tiene su menú ⋯: Abrir, Duplicar, Mover antes o después, Marcar como rodado y Eliminar;
  - mientras se genera, la viñeta muestra un brillo de carga en vez de quedar en blanco.
- **Avisos de la primera vez:** burbujas breves junto a lo que explican: mover la cámara y aislar la viñeta al abrir
  el editor, doblar el cuerpo al elegir una figura, el cubo en la vista libre y arrastrar viñetas en el storyboard.
  Se cierran con «Entendido» o solas y no vuelven.
- **Alcance claro:** «Confirmar N sugeridos · todo el guion»; renombrar un elemento con el nombre de otro dice que
  se unen y cuántas marcas pasan (con Deshacer); cambiar la categoría dice cuántas marcas cambian; en el guion, el
  menú de una marca dice «cambia sus N marcas» junto a la categoría.
- **PDF con viñetas:** primero prepara las viñetas con su avance («Viñeta 12 de 80») y «Cancelar», sin congelar.
- **Plan de rodaje:** la barra de inicio y la de cierre de cada jornada tienen un botón ⋯ visible con sus opciones
  (antes solo con clic derecho o manteniendo el dedo).
- **Teléfono:**
  - la pestaña activa se trae a la vista (también al abrir) y el borde izquierdo se difumina si hay más;
  - botones de al menos 34–40 px en pantallas táctiles; donde no caben, se agranda la zona que recibe el toque
    (botones chicos visibles en el editor del plano: 36 → 3; en el animatic: 26 → 3);
  - lo escrito en una toma de la hoja de script se guarda aunque se toque fuera;
  - en el plan, el menú de la escena tiene «+ Nota técnica» y «+ Observación» (las cajas vacías se esconden).
- Un toque que llega justo después de abrir una ventana (el segundo de un doble toque) ya no la cierra.

### Pulido visual y accesibilidad
- **Una sola escala:** 7 tamaños de letra (antes 27; quedan aparte los números grandes de portada y las marcas
  diminutas de los lienzos) y 4 radios de esquina más el círculo y la píldora (antes unos 20). Todo sale de
  variables (`--fs-1` … `--fs-7`, `--r-xs`, `--r-sm`, `--r`, `--r-lg`) en `src/shell.html`.
- **Un solo estilo para quitar:** ✕ en un círculo sin fondo, gris, que se pone rojo suave al pasar (créditos,
  equipo, etapas, locaciones, presupuesto, desglose, fechas y pendientes del calendario, hoja de llamado, consejos).
- **Íconos dibujados** en vez de emojis que cambian según el sistema: Ajustes, candado del presupuesto, Recortar,
  aviso de fecha del plan, inicio y fin del animatic.
- **Apariencia Clara / Oscura / Automática:** en ⋯ a la derecha de las pestañas (antes solo seguía al sistema). En
  oscuro, la planta, el papel de los accesorios y la vista de la ficha bajan su brillo.
- **Contraste:** el gris de ayuda pasa de 4,3:1 a 5,2:1; los textos de ejemplo de los campos, de 2,3:1 a 3,7:1; el
  sello «Rodado» y los textos verdes, de 3,1:1 a 5,4:1; los avisos amarillos, de 2,9:1 a 4,8:1; el botón rojo de
  borrar en modo oscuro, de 3,5:1 a 5,3:1; el naranja de los botones principales, de 4,4:1 a 4,8:1.
- **Teclado y lectores de pantalla:**
  - las pestañas del proyecto siguen el patrón de pestañas (la elegida recibe el foco con Tab; ← → Inicio Fin
    pasan a las demás) y la vista dice a qué pestaña pertenece;
  - los menús abiertos con el teclado reciben el foco, se recorren con ↑ ↓ Inicio Fin y, al cerrarse, el foco
    vuelve al botón que los abrió;
  - las ventanas llevan el foco adentro al abrirse (al primer campo, salvo en el teléfono y en el editor del plano)
    y Tab no se sale de ellas; al cerrarse, el foco vuelve a donde estaba;
  - al repintarse una pestaña, el foco vuelve al botón equivalente;
  - los avisos se anuncian, y el estado de guardado se anuncia solo cuando algo no se guarda;
  - los colores se nombran («Color rojo», «Etiqueta azul») y los botones de quitar dicen qué quitan;
  - con «reducir movimiento» del sistema, sin animaciones.

### Correcciones
- **Plano 1.1 del ejemplo (y cualquier plano general en una calle):** la cámara se calculaba a 11,9 m de la
  figura y quedaba dentro de los edificios de enfrente, así que la viñeta salía casi toda oscura. Ahora la cámara
  se detiene antes de los edificios y el lente se abre para mantener el encuadre (aquí, de 24 a 17 mm). Vale
  también para los muros de un plano importado; en un movimiento, todas las claves se acercan en la misma
  proporción (un dolly sigue siendo un dolly) y se conserva lo que el movimiento inclina o gira.
- **Tilt hacia abajo:** si la descripción del plano dice que la cámara baja («bajamos hasta la escalera»), el
  tilt va de arriba hacia abajo; si no, de abajo hacia arriba, como antes.
- **Calendario en el teléfono:** el texto «doble toque en ⌄ abre» cabe en una línea y ya no se monta sobre la
  primera fila; «Contraer todo» conserva su área de toque sin agrandar la cabecera, y los nombres de etapa
  largos terminan en «…» en vez de pasar bajo el botón +.
- **El piso se respeta solo:** las figuras, los objetos y las luces se apoyan en el suelo que tienen debajo. En la
  calle, las veredas tienen 15 cm y antes las figuras quedaban hundidas en ellas (se les veían las piernas sin
  pies); ahora se paran encima, y al cruzar de la pista a la vereda suben y bajan solas. «Altura» sigue sirviendo
  para subir algo a mano (una tarima, una mesa), contada desde ese suelo. La cámara nunca baja de 6 cm sobre el
  piso, y el encuadre automático mide las alturas desde donde pisa la figura. En los proyectos anteriores, a quien
  se subió a mano 15 cm para pararlo en la vereda se le quita esa altura una sola vez, para que no quede flotando.

### Notas, comentarios y actividad del equipo
- **Un solo botón** (el ícono de nota, junto a deshacer, con el número de notas abiertas). Arrastrarlo hasta un
  plano, una escena (en el guion, el storyboard o el plan), un elemento del desglose, una tarea del calendario,
  una línea del presupuesto o una pestaña pega la nota ahí: aparece un campo de una línea, se escribe y Enter
  la guarda (tocar fuera también; vacía no queda nada). Un clic en el botón ofrece «Pegar una nota» (el
  siguiente toque elige el lugar) y «Notas y actividad».
- **Nada tapa el área de trabajo:** las marcas son chicas y translúcidas (más visibles al pasar). En la
  computadora, la conversación y la lista se abren en una columna angosta a la derecha que corre la pantalla
  en vez de cubrirla; en el teléfono, en una franja translúcida abajo (y lo anotado se desplaza para quedar a
  la vista). Sin botones de texto: ✓ resolver, lápiz editar, papelera borrar (al pasar el puntero; en el
  teléfono, siempre), flecha enviar.
- **Comentarios:** responder, resolver o reabrir. Cada quien edita y borra lo suyo; producción puede borrar
  cualquier nota. Si está en una partida cerrada del presupuesto, la marca va en su título y la abre.
- **Quién cambió qué:** cada vez que alguien guarda, el servidor anota qué cambió («cambió el plano 1.2»,
  «movió la escena 5 a la jornada 2», «agregó la tarea «Casting»», «dejó una nota en el plano 1.3») y le avisa
  al resto del equipo con «Ver», que lleva a eso.
- **Cuántos cambios lleva cada persona:** en «Notas y actividad» › Actividad, cada persona con sus cambios y
  sus notas, y los últimos cambios. Los guardados seguidos de lo mismo (3 minutos) cuentan como un cambio.
- **Permisos:** todo el equipo puede dejar notas, aunque solo pueda ver la pestaña; cada nota y cada cambio
  los ve solo quien puede ver esa pestaña (una nota en el presupuesto no la ve quien no ve el presupuesto).
- **Servidor:** sección nueva «notas» y tablas `activity` y `act_count` (se crean solas al actualizar).
  Ruta nueva `GET /api/p/<id>/activity`. Pruebas en `server/test/notas.test.js`.
- **Sin equipo** (versión de prueba, proyecto propio): las notas se guardan con el proyecto y la actividad se
  lleva en el propio proyecto.
- **Corrección:** al llegar un cambio de otra persona, la pantalla no se repintaba (un comentario se había
  tragado esa línea en la fase 2). Ya se repinta.
- **Teléfono, menos recargado:** la banda del proyecto de ejemplo es una sola línea («Ejemplo: no se guarda» y
  un botón «Empezar» con las tres salidas), y los consejos de primera vez ya no aparecen encima de un menú,
  una nota o el panel.

### Animatic en el teléfono
- **El monitor no se va:** la pestaña queda fija. Arriba, el monitor a lo ancho; debajo, los controles en una
  sola fila (con «Bucle» como ícono) y las herramientas en otra que se desliza de lado; la línea de tiempo ocupa
  el resto y se desplaza sola, así que al editar siempre se ve el cuadro.
- **Menos información a la vez:** en pantallas angostas se guardan las cifras (duración, media, mediana,
  cortes/min), la pista de ritmo, la fila de escenas y el control de alto de pistas. Los detalles del clip
  elegido ya no empujan la línea de tiempo: se abren con el botón «i» como una hoja translúcida abajo.
- **Barra de cada pestaña:** en el teléfono, «Ajustes» y «Exportar» son íconos y «Añadir música» es «♪ Música».
- **Corrección:** el Animatic y el Plan de rodaje tenían una función con el mismo nombre y la del plan pisaba a
  la del animatic: al tocar un clip no se marcaba ni se abrían sus detalles hasta que algo repintaba la
  pantalla. Ahora se marca y se abre al instante (también en la computadora).

### Editor de plano: más grande y más simple
- **La viñeta manda:** en la computadora ocupa todo lo que entra a lo alto y la ventana mide lo que mide la
  viñeta (no quedan vacíos debajo de la viñeta ni de la planta). En una pantalla de 1483 × 1034 pasa de
  680 × 383 a 1107 × 623. A la derecha, la planta cuadrada y debajo el panel, que se desplaza solo.
- **Línea de tiempo en una fila:** ▶, tiempo y duración · la pista · animar (punto rojo), clave (un solo botón
  que pone o quita) y curva (ícono suave/lineal). En pantallas angostas la pista va en su propia fila.
- **Planta sin barra:** acercar, alejar, ajustar y pantalla completa son íconos sobre el dibujo (abajo a la
  derecha). «+ Figura» y «+ Objeto» están en la barra de la viñeta (siempre a la vista); «Copiar la escena del
  plano anterior» en el menú ⋯ del pie y en el panel cuando no hay nada elegido.
- **Pestañas con íconos:** Figura, Cámara, Escena, Luz y Plano; la elegida muestra su nombre. «Dibujo» pasó a
  un lápiz en la barra de la viñeta (con «Listo» para volver).
- **Panel de la figura en tres filas:** personaje con su ficha (ícono) y ⋯ (posición X/Z/giro, seguir con la
  cámara, quitar); expresión y postura como listas desplegables (la de expresiones con las caras y «Dibujar»);
  accesorios en un menú con editar, ocultar y borrar. Lo mismo para los objetos.
- **Cámara:** el lente con su barra y una lista de lentes de siempre; «Seguir a» en una lista; el recorrido
  con flechas; holandés y cámara en mano plegados. **Luz:** «+ Agregar ▾» (incluye el esquema de tres
  puntos), fotómetro, color falso y trípodes como íconos, equipos del plano plegados. **Dibujo:** herramientas,
  grosores, deshacer, borrar, guías e imagen de referencia como íconos.
- **Teléfono:** pie en una fila (◀ ▶ y Guardar), y los controles de cámara sobre la viñeta empiezan ocultos
  (la cámara se mueve arrastrando y pellizcando; el ícono de cámara los muestra). Los huecos de esos controles
  ya no tapan la figura.
- **Correcciones:** la planta y la viñeta a pantalla completa quedaban de 20 × 20 px en una esquina (heredaban
  su lugar de la cuadrícula); el panel tenía un desplazamiento lateral que cortaba la primera letra; los
  consejos de primera vez aparecían encima del editor de accesorios.

### Accesorios: cabello, detalles y materiales
- **Tipo «Cabello»:** se pinta dónde va en cada vista y queda como una capa sobre la cabeza, gruesa al centro y
  pegada a la piel en el borde (la cara queda libre). Reemplaza el peinado de la figura (también en la vista
  para dibujar). Paleta de colores de pelo; el volumen lo pega o lo esponja. Para pelo largo, «Cabeza y espalda».
- **Capa de detalle:** encima de la forma se pintan costuras, parches, botones, hebillas o mechones, cada trazo
  con su color y su material. Herramientas nuevas: pincel muy fino, línea recta y «Hebras» (varias líneas finas
  a la vez, para mechones o textura de tela). Borrar y deshacer trabajan en la capa elegida.
- **Materiales:** tela (mate), cuero (brillo suave), metal (reflejo fuerte, colores plata, oro y cobre) y pelo
  (brillo de su color). La pieza entera puede ser de cuero o metal y cada detalle tiene el suyo.
- **Nítido:** los detalles van a la figura como texturas y el brillo se calcula punto a punto, así se ven
  limpios aunque la malla sea gruesa. Lo dibujado de frente se ve de frente y a los lados; por detrás, solo lo
  que se dibuje en «Atrás».
- **Editor más liviano:** Forma/Detalle junto a las vistas, una sola fila de herramientas y sin el párrafo largo
  del tipo (cada botón lo explica al pasar el puntero).

### Guion: las transiciones no son personajes
- «CORTE A:», «FUNDIDO A», «DISUELVE A:», «FUNDIDO A NEGRO», «CUT TO:» y parecidas se reconocen como
  transiciones al importar (Fountain, texto y PDF) y al escribirlas en el editor, aunque la línea siguiente no
  esté separada. Ya no entran al reparto ni al presupuesto.
- **Proyectos ya cargados:** al abrirlos, esas líneas vuelven a ser transiciones (lo que quedó debajo como
  diálogo pasa a acción), salen del reparto y sus líneas del presupuesto se quitan si nadie las tocó.

### Vehículos más reales y muchos nuevos
- **Carrocerías de perfil real:** cada auto sale de su perfil lateral (carrocería baja con los pasos de rueda,
  cabina, ventanas laterales, parabrisas y luneta inclinados), llantas con aro y rayos, luces, parachoques,
  parrilla, placas, espejos, manijas y asientos por dentro.
- **Nuevos:** taxi (con su letrero), patrullero (puertas, sirena y «POLICÍA»), SUV, auto deportivo (con
  alerón), limosina, van, autobús (con ventanas y ruta), bicicleta, triciclo de carga, avioneta, avión de
  pasajeros y avión de combate.
- **Color:** cada vehículo tiene su color por defecto y se cambia con muestras (o cualquier color).

### Animales
- Perro, gato, caballo, toro, vaca, burro, llama, oveja, cerdo, gallina, dragón (con alas) y dinosaurio, con
  sus proporciones, orejas, cuernos, crines y colas. El pelaje se cambia como el color de un vehículo.

### Objetos comunes y armas de utilería
- Hoja de papel (impresa), libro, laptop, computadora (monitor, teclado y mouse), taza, botella, linterna,
  maleta con ruedas, paraguas, cuchillo, machete, pistola y ametralladora.
- **En la mano:** se eligen en «Lo sostiene»; la mano se cierra sola y el arma apunta hacia donde apunta el
  brazo. En el piso o en una mesa, el cuchillo, el machete y las armas quedan acostados de lado.
- **Con una figura elegida,** «+ Objeto» → un objeto de mano lo pone directo en su mano derecha.

### «+ Objeto» por grupos
- El catálogo tiene grupos (vehículos, animales, muebles, objetos, armas, puertas y exteriores, equipo de
  rodaje) y un buscador («taxi», «perro», «laptop»…). La lista de tipo del panel también va por grupos.
- Los objetos grandes (un avión, un bus) aparecen a la distancia justa para verse enteros.
- El desglose sugiere el vehículo o el animal con su nombre (un taxi como taxi, un caballo como caballo).

### Ambientes interiores y jardines
- **Escenario → Sala, Comedor, Cocina, Dormitorio, Baño u Oficina:** la habitación toma su tamaño, su piso
  (baldosas o madera), el color de sus muros (azulejos en el baño) y sus muebles contra los muros del fondo y
  de los lados, con ventana y puerta. Los muebles son objetos normales: se mueven, se cambian o se quitan. Al
  cambiar el tamaño, vuelven a su sitio contra los muros.
- **Muebles nuevos:** refrigeradora, cocina con horno, lavadero, muebles de cocina, televisor con mueble,
  sillón, mesa de centro, estante con libros, alfombra, planta, cuadro, ropero, mesa de noche, escritorio,
  silla de oficina, inodoro, lavamanos con espejo, tina, parrilla, banca de jardín y mesa con sombrilla.
- **Exteriores nuevos:** «Frente de la casa» (fachada con puerta y ventanas, camino de piedras, jardín con
  flores, cerco, buzón, vereda, pista y casas vecinas) y «Patio trasero» (patio de baldosas, cerco de madera,
  tendedero con ropa, parrilla, mesa con sombrilla y árbol).
- **Desde el guion:** INT. … COCINA / SALA / DORMITORIO / CUARTO / BAÑO / OFICINA / COMEDOR arma ese ambiente;
  EXT. … PATIO arma el patio y EXT. CASA DE … el frente de la casa. Una «sala de cine» o «sala de espera» no se
  amuebla como sala de casa.

### Vestuario
- **Botón «Vestuario»** de la figura (antes «Accesorios»): lo puesto, **Conjuntos** y **Prendas**, y dibujar un
  accesorio como siempre.
- **Conjuntos:** uniforme militar (camuflaje, casco y botas), doctor (bata), abogado (saco y corbata),
  albañil (chaleco reflectivo y casco), detective (abrigo largo y sombrero), ama de casa (falda y delantal),
  leñador (camisa a cuadros y gorro), pijama (a rayas), bikini y de verano.
- **Prendas:** polo, camisa, blusa, saco, abrigo largo, bata, chaleco, pantalón, jean, shorts, falda, delantal,
  bikini, zapatos, botas, cinturón, corbata, gorro, gorra, sombrero, casco de obra, casco militar, lentes y
  lentes de sol. Una prenda reemplaza a la del mismo lugar (una camisa al polo); un conjunto, a todas las
  prendas listas (lo dibujado se queda).
- **A la medida de cada cuerpo:** las prendas se miden sobre los huesos del maniquí (hombre, mujer, anciano) y
  se doblan con él al caminar, correr o sentarse; los faldones siguen a los muslos.
- **Editar una prenda:** color (muestras o cualquiera), estampado (cuadros, rayas, rayas horizontales,
  camuflaje) con su segundo color, material (tela, cuero, metal) y ajustada u holgada. Con un personaje, el
  vestuario lo lleva en todos los planos.

### Rendimiento
- **Objetos unidos:** las piezas fijas de cada objeto que comparten material se dibujan como una sola malla (un
  estante con sus libros, un auto con sus rayos, un perro con sus patas). Una sala amueblada pasa de ~420 a
  ~165 llamadas de dibujo; tres vehículos, de ~390 a ~130. La malla unida se guarda por tipo: todos los taxis
  de todos los planos comparten la misma. Lo que se mueve (puertas, ventanas, lo que se sostiene) queda aparte.
- **Menos triángulos donde no se ven:** las esquinas redondeadas de pocos milímetros usan menos segmentos, los
  libros del estante son casi rectos (de 62 000 a 14 000 triángulos), las ventanillas del avión y las partes
  chicas de los animales también se simplificaron.
- Las prendas se arman una vez por cuerpo (10–30 ms cada una la primera vez) y quedan guardadas.

### Imágenes del proyecto a medida que hacen falta
- **Antes:** al abrir un proyecto se descargaban todas sus imágenes (dibujos del storyboard, anotaciones,
  referencias, fotos del desglose) y quedaban todas en la memoria. Un largo con cientos de dibujos y fotos
  tardaba en abrir con datos móviles y podía trabar un teléfono.
- **Ahora (versión con cuentas):** al abrir llega solo el índice de imágenes y las fotos de los personajes (las
  usan las figuras 3D). El resto se baja cuando algo lo muestra: las viñetas que están a la vista en el
  storyboard y en el animatic (las que siguen en el montaje se piden antes de llegar a ellas), las fotos de una
  lámina al abrirla, las capas de un dibujo al editarlo, todas juntas para un PDF, el video, el ZIP o la copia
  de seguridad. Varios pedidos seguidos viajan juntos en un solo viaje.
- **Caché del navegador:** lo bajado queda guardado; la segunda vez el storyboard no pide nada al servidor.
- **Memoria acotada:** se guardan en la memoria solo las imágenes usadas hace poco (unos 40 MB en un equipo de
  4 GB, 24 MB en uno de 2 GB); lo demás se suelta y, si vuelve a hacer falta, se lee del navegador. Lo que está
  abierto en un editor y lo que usa un PDF o un video mientras se arma no se suelta.
- **Sin cambios de uso:** borrar un plano y deshacerlo devuelve sus dibujos aunque no estuvieran cargados;
  duplicar un plano copia sus dibujos; el PDF sale con todas las imágenes. Lo que otra persona cambia en un
  proyecto de equipo solo se baja si se está mirando.
- La app de escritorio y el modo sin cuenta guardan las imágenes en el equipo: siguen cargándose todas.

### Diseño más limpio en todo el programa
- **Esquinas al mínimo, cajas pegadas:** cajas, campos y botones con esquinas de 2 px. Las cajas que van juntas
  (desglose, Proyecto, hoja de llamado, presupuesto, hoja de script, resumen del plan) ya no tienen espacio entre
  ellas: cada área se distingue por un tono apenas distinto, en damero, y conserva solo la línea de color de su
  categoría arriba. Funciona en claro y en oscuro.
- **Barras de desplazamiento finas** (6 px, sin carril): aparecen al pasar el mouse sobre la lista o mientras se
  desplaza, en todo el programa.
- **Deslizadores finos:** carril de 3 px neutro con el tramo lleno en color; el círculo rojo plano aparece solo al
  pasar el mouse o al arrastrar (en el teléfono, al tocar). El valor de la derecha se escribe al tocarlo.
- **Íconos:** «Ajustes» es ahora un ícono de controles deslizantes, con el mismo trazo que el resto; la ayuda y
  el «▾» de Exportar también son íconos de trazo.

### Hoja de desglose
- Las cajas vacías ocupan una sola línea (título y «+») y van juntas al final; ya no hay tarjetas altas con «Sin
  elementos». Las que tienen elementos forman una grilla sin espacios.
- Sin el campo «Añadir…» siempre visible: se agrega con el «+» del título o escribiendo debajo del último
  elemento; el tipo (VFX, armas, maquillaje…) se elige ahí solo cuando la caja junta varios.
- La cámara de fotos aparece al pasar el mouse o cuando hay fotos, con cuántas son. Los sugeridos se ven en gris
  (sin subrayado punteado) y la numeración es más discreta.
- Decorado y Descripción se leen como texto y se editan al tocarlos. «Productora» sale de cada hoja: se escribe
  una vez en la pestaña Proyecto.

### Plan de rodaje sin jornadas automáticas
- Al importar o escribir un guion, las escenas quedan en «Sin programar». Las jornadas las armas tú con
  «+ Jornada» y arrastrando las escenas.
- **«Sugerir jornadas»** (opcional, se puede deshacer) propone jornadas por locación y día o noche con las
  escenas sin programar. Los proyectos que ya tenían jornadas las conservan.

### Hoja de llamado
- Almuerzo, amanecer, atardecer, clima, humedad, condiciones y catering en una sola franja compacta.
- Equipo técnico: solo las personas con nombre; cada área con su «+ Agregar» (elige uno de los cargos típicos o
  uno nuevo) y las áreas vacías plegadas en una línea.
- Reparto en filas de una línea (personaje, actor, teléfono, escenas, recojo y llamado), sin «Actor o actriz» ni
  «—» de relleno: los ejemplos aparecen al pasar el mouse.
- Centro de salud, Proveedores y Notas se leen como texto; vacíos, son una línea con «+ Agregar». El
  encabezado no cambia.

### Proyecto
- Proyecto, Dirección y Producción en una sola tarjeta: título, guion, versión, productora y formato se leen
  como texto y se editan al tocarlos; los nombres van en filas con «+ Agregar». Los logos son dos cuadros
  pequeños con «Subir».
- Equipo como tabla compacta: una fila por persona (nombre, cargo, teléfono, correo); el documento, las
  funciones y las notas se abren con la flecha de cada fila. Sin cargos vacíos de relleno; cada área con su
  «+ Agregar» y las vacías plegadas.

### Animatic
- Montaje vacío: un aviso con el botón para traer los planos del storyboard, en vez del monitor negro.
- A la vista solo cortar, deshacer, rehacer e imán; recortar, quitar, duplicar, títulos y negros pasan a «⋯».
- Duración, clips, media, mediana y cortes por minuto detrás del ícono «i».
- Un solo zoom (el deslizador y «Ajustar»); el alto de las pistas se cambia arrastrando el borde de V1.
- Las pistas vacías (ritmo, V2, diálogo, música) no se muestran hasta tener algo; «+ Pista» las agrega y desde
  ahí (o en la pista Música) se añade la música.

### Editor del plano (3D)
- **Barra afuera:** deshacer, rehacer, figura, objeto, entorno, atmósfera, nombres y dibujar quedan en una franja
  encima de la viñeta, solo íconos, un poco más grandes, casi negros y sin sombra (el nombre en la ayuda).
  Entorno y atmósfera muestran un ícono según lo elegido. «Vista libre» y pantalla completa van al final.
- **Sobre la viñeta, todo igual:** los controles de cámara, el cubo, la parte elegida y los avisos tienen fondo
  claro sólido, íconos casi negros y las mismas esquinas. Los nombres de las figuras son etiquetas sólidas con
  el color del personaje (letra clara u oscura según el color).
- **Paneles:** filas parejas (nombre, deslizador y valor), el lente como «35 mm ▾», «Seguir» como una fila con su
  ícono, el recorrido en una fila (seis flechas y «− 2 m +»), «Reencuadrar» y «Animar» livianos con ícono, y el
  «▾» del programa en «Holandés y cámara en mano». Lo mismo en Escena, Luz y Plano.
- **Listas tipo capas** (capas del dibujo 2D, vestuario, luces): ojo · miniatura · nombre · valor; la elegida con
  un fondo suave (sin el borde naranja grueso) y sus opciones debajo, con sangría, con «Eliminar» al final.
- **Mano boca abajo:** el giro de la mano llega a media vuelta para cada lado y la muñeca se dobla hacia la palma
  o el dorso. Al elegir el antebrazo o la mano aparecen flechas para girar la mano o doblar la muñeca de a poco.

### Dibujo 2D
- El panel de la derecha ya no corta textos ni valores (más ancho, filas que se acomodan).
- Un punto de fuga fuera de la vista se muestra como una marca en el borde que apunta hacia él: se arrastra para
  traerlo.
- El ojo junto a «Perspectiva» oculta las guías y los puntos de fuga sin perder la perspectiva configurada.

### Nuevo plano
- Todo el plano en una sola línea (escala, ángulo, movimiento y el nuevo **soporte**), la descripción en otra y
  un check para agregarlo (Intro también). «3D» agrega y abre el plano en 3D. El fragmento del guion va en el
  título.

### Guion: escribir con herramientas de revisión
- **Panel de revisión** a la derecha de «Escribir» (en el teléfono, desde «⋯»):
  - **Resumen:** páginas, escenas, palabras y minutos en pantalla, al día mientras se escribe.
  - **Carátula:** título, «escrito por», basado en, versión, fecha y contacto. Se ve como primera página del
    editor y va al inicio del PDF; se puede ocultar.
  - **Buscar y reemplazar** (Ctrl + F): siguiente y anterior, reemplazar uno o todos (se puede deshacer).
  - **Revisiones:** «Marcar los cambios» con su color (azul, rosa, amarillo…). Cada párrafo cambiado lleva un
    asterisco en el margen, también en el PDF, y las páginas con cambios llevan el color y la fecha arriba.
    Lista de escenas cambiadas y «Quitar todas las marcas».
  - **Personajes:** diálogos y escenas de cada uno. **Notas del guion** en lista.
- **Ícono del tipo de párrafo** a la izquierda del párrafo donde está el cursor; tocarlo cambia el tipo.
- **Límites de página** en el editor: una línea con el número de página, con la misma cuenta que el PDF.
- La lista de escenas muestra los encabezados largos en **dos líneas**.
- **Modo concentración:** al escribir, todo lo que rodea la página pasa a gris y se atenúa; al pasar el mouse
  por una zona se ve normal.
- En el modo oscuro **la hoja del guion también es oscura** (al escribir y al marcar), con letra clara.
- El editor del guion **ya no se desplaza a los costados** en el teléfono: solo arriba y abajo.
- En el teléfono, **tocar el guion para escribir ya no agranda la página**: la letra del editor es de 16 px
  (con menos, el iPhone hace zoom) y las sangrías de personaje y diálogo se ajustan al ancho. En iPhone y iPad
  pasa lo mismo con todos los campos de texto.

### Dibujo 2D
- **Código del color a la vista** (#C8382C) junto a la paleta: se lee, se copia y se escribe. También junto a
  los demás selectores de color del programa.
- **Flechas sin borde y rojas** de entrada; recuerdan su color aparte del de los lápices.
- **Mantener Alt** muestra el cuentagotas (clic toma el color). **Alt + clic derecho y arrastrar**: a los lados
  el tamaño del pincel, arriba y abajo la opacidad, con una vista previa.
- **El lazo protege lo de afuera:** mientras hay una selección, lápices, pinceles y borrador pintan solo dentro.
  Esc, Ctrl + D o un toque fuera la quitan.
- **Capas:** candado para bloquear (no se pinta, borra ni mueve), **se ordenan arrastrando** como las tiras del
  plan, y Duplicar, Vaciar y Eliminar pasan a íconos a un lado. La fila de la hoja queda solo con Papel / Viñeta 3D.

### Hoja de desglose
- Las cajas se acomodan en columnas sin huecos en el medio y terminan parejas abajo; las vacías completan la
  última fila a lo ancho.

### Cajas alineadas, «+» y barra del animatic
- **Las cajas lado a lado terminan siempre a la misma altura**, sin escalones: en la hoja de llamado la última
  caja de cada columna llena lo que falta, y en el tablero del calendario los carriles terminan parejos (y
  ocupan todo el ancho).
- Para agregar queda **solo «+»** (sin la palabra «Agregar») en la hoja de llamado y en Proyecto; al pasar el
  mouse dice qué agrega («Agregar en arte», «Agregar un proveedor»…).
- **Animatic:** el menú «⋯» desaparece; sus acciones quedan como íconos justo después del imán (quitar el
  comienzo, quitar el final, quitar y cerrar el hueco, quitar y dejar un negro, duplicar, insertar título e
  insertar negro). Cada uno muestra su nombre y su atajo; se apagan cuando no hay nada elegido.
- En el teléfono, las filas del reparto de la hoja de llamado vuelven a su orden (número, nombre, recojo y
  llamado).

### Controles de cámara en la viñeta 3D
- Solo se ve el ícono de la cámara: **las flechas aparecen al pasar el mouse por ella** (y se quedan mientras
  el mouse está sobre ellas). Un clic en la cámara las deja fijas; otro las esconde. En el teléfono, un toque
  las abre y otro las cierra. Con el teclado aparecen al llegar a la cámara con Tab.
- Ya no hacen falta el botón para ocultarlas ni el de volver a mostrarlas.

### Guion en el teléfono (y una barra más limpia en todas partes)
- **Una sola fila** al escribir: escenas (ícono de lista), Marcar | Escribir, tipo de párrafo (un menú compacto,
  sin números), deshacer y rehacer. El formato Cine / AV pasó a **Ajustes**, junto con Rayado y Cobertura.
- En el teléfono, **Ajustes, Ayuda y Exportar van juntos en «⋯»**, en todas las pestañas.
- Al marcar, en el teléfono se ocultan el zoom (se acerca con dos dedos) y Rayado / Cobertura (están en Ajustes).
- En pantallas táctiles ya no aparece el consejo de atajos de teclado.
- En el teléfono la barra superior queda con logo, proyecto, notas y «+»: **Compartir** y **Abrir otro
  proyecto** pasan al menú del título del proyecto.

### Proyecto: menú corto, formato .fsp y aviso cuando no se guarda
- El menú del nombre del proyecto queda con **Abrir**, **Guardar .fsp** y **Descargar ZIP**. Debajo aparece solo
  lo que corresponde a ese proyecto (mostrar el archivo en la carpeta, carpeta compartida, salir, archivar o
  eliminar). «Datos del proyecto, logos y créditos» sigue en la pestaña Proyecto.
- **.fsp es el formato del proyecto** (en la web y en el escritorio). Los archivos **.fmst** de versiones
  anteriores se siguen abriendo (también con doble clic en Windows) y el escritorio los sigue listando y
  respaldando; al cambiar de nombre un proyecto automático, su archivo pasa a .fsp. Las licencias no cambian.
- Sin la franja «Ejemplo: no se guarda» ni los textos al pie del menú. Cuando el proyecto **no se guarda** (el
  ejemplo, el plan gratuito lleno o una vista sin almacenamiento) aparece un **triángulo de alerta** junto al
  nombre; al tocarlo explica por qué y ofrece las salidas: guardar el ejemplo como proyecto, importar el guion o
  empezar en blanco (o «Guardar .fsp»).

### Animatic: «⋯» junto a las herramientas en el teléfono
- La fila de arriba, que solo tenía «⋯», desaparece: el **«⋯» va al final de la fila de herramientas** y queda
  siempre a la vista aunque la fila se deslice.

### Maniquíes de rostro liso y expresiones dibujadas
- **Caras lisas:** los maniquíes ya no tienen relieve de cejas, ojos ni boca; el perfil de la cara es limpio, como
  un huevo, con una **nariz simple y corta** entre los ojos y la boca. La expresión se dibuja encima.
- **Expresiones predefinidas de estilo neutro**, entre anime y cartoon, que sirven igual para personajes masculinos
  y femeninos: cejas casi rectas, iris ovalado y oscuro con un brillo pequeño bajo una línea de párpado pareja,
  sin pestañas, y bocas simples. Ojos, cejas y boca se ven grandes en la cara.
- **20 emociones:** neutral, feliz, risa, triste, enojado, sorpresa, miedo, pensativo, grito, ojos cerrados,
  preocupado, dolor (dientes apretados), asco, desconfiado, cansado (con ojeras), avergonzado (con rubor), guiño,
  decidido, llanto (con lágrimas) y confundido.
- **Lentes dibujados con lunas transparentes** (redondos, ovalados o rectangulares): se ve el ojo, con un reflejo
  suave. Se eligen en la ficha (pestaña Expresión), en el menú de expresiones del plano o en el editor; en un
  personaje valen para todas sus expresiones.
- **Una sola herramienta de expresiones, con una biblioteca por personaje:** cada personaje puede redibujar
  cualquier predefinida (vale en todos sus planos) y sumar expresiones propias. Se edita desde el plano
  (Expresión › **Editar esta expresión** o **Nueva**) o desde su ficha, en la nueva pestaña **Expresión** (con la
  cara de cerca). Las figuras genéricas guardan sus dibujos en el proyecto.
- **Los ojos predefinidos se pueden quitar** (para dibujarlos a mano en cada expresión).
- Herramientas: **pincel con presión** (con lápiz óptico; con el dedo o el ratón, más fino cuanto más rápido),
  **línea suave** (trazo limpio con puntas afinadas), relleno, borrador, **grosor**, **color** (con su código),
  **simetría** (se dibuja un lado y aparece el otro), deshacer, rehacer y limpiar. Un dibujo por expresión.
- Con «Ninguna» como base aparecen **guías tenues** (eje, línea de los ojos con su lugar casi imperceptible, nariz
  y boca) en el editor y **sobre el maniquí mientras se dibuja**: el dibujo se ve en vivo en la figura. Las guías nunca salen en la
  viñeta guardada ni en el PDF.

### Mano: el punto dobla la muñeca
- Con la mano elegida, **arrastrar el punto rojo dobla la muñeca** y el resto del brazo queda quieto (el punto
  sigue el camino que recorre la mano al doblarse). Con **Mayús**, como antes, el brazo entero sigue a la mano.
- El punto rojo central ya no tiene contorno blanco (una sombra suave lo separa del fondo), en todas las partes.

### Un solo ícono de nota
- Las marcas de notas, el botón de la barra y el globo clavado usan **el mismo ícono de globo de comentario**:
  relleno, sin contorno blanco y con las líneas de adentro caladas.

### Puño completo y vestuario para dibujar
- **El pulgar cierra con los demás dedos**: al cerrar la mano se dobla por delante del índice y del medio, como en
  un puño de verdad, en las dos manos.
- Junto a «Vestuario» está **«Modificar personaje»**, que abre su ficha (cuerpo, rostro, expresiones). En una
  figura sin personaje dice «Modificar figura» y abre sus ajustes de cuerpo.
- **Se quitaron los trajes armados** («Conjuntos»). El vestuario queda en «Puesto» y «Prendas», con
  **«Dibujar ropa»** y «Dibujar un accesorio».
- El editor de ropa trae herramientas para dibujar con precisión:
  - **polígono** (clic por clic; se cierra en el primer punto, con doble clic o con Intro);
  - **simetría**: lo que se dibuja de un lado aparece del otro;
  - **guías del cuerpo** (cuello, hombros, pecho, codos, cintura, cadera, muñecas, rodillas y tobillos);
  - **zoom** con la rueda o con − / + y desplazamiento con el botón derecho o con la barra espaciadora;
  - **rehacer**, y con Mayús las líneas van rectas, en horizontal, vertical o a 45°.

### Viñeta: barra siempre a la vista y líneas guía
- Al elegir el **lápiz** la barra de arriba de la viñeta ya no desaparece: el lápiz queda marcado y tocarlo otra
  vez vuelve a la escena. Mientras se dibuja, «Deshacer» quita el último trazo; agregar una figura, un objeto o
  cambiar el entorno sale del dibujo.
- Nuevo botón **«Líneas guía»** en esa barra (y en el panel de dibujo): un menú de íconos para encender o apagar
  cada guía, varias a la vez, o **ocultarlas todas** (también los tercios):
  tercios, cuadrícula, centro, diagonales, proporción áurea, espiral áurea, triángulos (simetría dinámica),
  zona segura y **horizonte de la cámara** (sigue a la cámara si sube, baja o se inclina).
- La elección se recuerda. Las guías solo se ven en el editor: no salen en la viñeta guardada ni en el PDF.

### Imagen de referencia detrás o delante, y una viñeta más limpia
- La imagen de referencia (p. ej. una foto de locación) **puede ir detrás o delante**, a elección, en el panel de
  dibujo:
  - **Detrás**: la foto es el fondo y encima se ven las figuras y los objetos, con sus sombras sobre la foto (sin el
    escenario 3D). Así queda también en el storyboard, el animatic y el PDF. Es la opción de una foto nueva.
  - **Delante**: la foto tapa la escena 3D, como antes.
  - En la vista libre se ve la escena 3D (la foto solo vale para el encuadre del plano).
- **Ventanas niveladas**: la planta empieza a la altura de la viñeta, no de la barra de íconos.
- La planta deja un margen: la cámara y su lente ya no quedan cortadas por el borde ni tapadas por los controles.
- El **cubo** de la vista libre y la **cámara** de la viñeta vuelven a ser **línea blanca con una sombra suave**,
  sin cajas, y se ven sobre fondos claros y oscuros. Las líneas guía usan el mismo estilo (todas blancas).

### Cabello realista con tarjetas de cabello, para todos los géneros y edades
- En el modo **Realista** (ver «Pelo en masas» más abajo), el pelo se arma con **tarjetas de cabello**, la técnica de los juegos y cinemáticas: láminas que siguen cada
  mechón con una **textura de hebras** transparente entre hebra y hebra, sobre un casquete con hebras densas
  que suaviza el nacimiento del pelo. Las hebras terminan sueltas, cada una a su largo, y el brillo se estira de
  lado a lado, como el anillo de luz del pelo real. Las texturas se dibujan en el momento: no pesan en la descarga.
- 13 peinados:
  - cortos: rapado, corto, despeinado, raya al lado, flequillo, entradas y calvicie;
  - medios y largos: melena, ondas, larga, cola, coletas y moño.
- Sirven para **hombre, mujer, niño, niña, anciano y anciana**: se ajustan solos a la forma y al tamaño de cada
  cabeza. **Tope de volumen**: de los ojos para arriba el pelo no se separa del cráneo más de ~1,4 cm a los lados y
  ~1,8 cm en la coronilla (se comprime suave, sin cortes). La cabeza queda redonda, sin esquinas ni la parte de
  arriba aplanada, y el pelo enmarca la cara sin deformarla. Solo la cola, las coletas y el moño salen de ese tope.
- El pelo largo, la cola y las coletas forman **una sola masa** que termina en pocas puntas grandes, no en un
  abanico de mechones sueltos.
- **Leyes físicas** revisadas en cada peinado y cuerpo con una prueba automática: ningún mechón atraviesa la
  cabeza, el cuello ni el torso (se apoya sobre ellos), las puntas caen con la gravedad (solo las puntas paradas,
  los rizos y el moño se salen de esa regla) y el pelo largo cae derecho por delante o por detrás. En figuras
  sentadas, caminando o con la cabeza girada, el pelo sigue a la cabeza y el largo se apoya en la espalda.
- En la ficha, el pelo se elige **viendo una miniatura 3D de cada peinado** (con el cuerpo y el color del
  personaje). Nuevo **color del pelo**: negro, castaños, rubio, pelirrojo, canoso, azul noche o el tono del
  maniquí. Lo mismo en «Modificar figura» del editor de plano.

### Cambiar de proyecto: activos y archivados de un vistazo
- El botón **«Proyectos»** de la barra muestra cuántos proyectos activos tienes (y, al pasar el mouse, cuántos
  archivados). En el teléfono, el menú del título dice «Cambiar de proyecto · 5 activos · 2 archivados».
- Al abrirlo, dos pestañas con su cantidad: **Activos** y **Archivados**. Cada proyecto dice cuándo se tocó por
  última vez, si es de equipo (o de quién es) y tu rol; el abierto aparece marcado.
- **Buscador** cuando hay más de 6 proyectos: se escribe, Intro abre el primero y las flechas recorren la lista.
- **Archivar y desarchivar sin abrir el proyecto**, con el botón de cada fila. En la web con cuentas el archivado
  deja el proyecto en solo lectura y libera su lugar del plan («3 de 5 proyectos activos de tu plan»); en el
  escritorio y en el navegador solo lo aparta de la lista de activos.
- Abajo, a mano: proyecto nuevo, abrir un archivo .fsp y el ejemplo.

### Cabello más bonito y más liviano
- **Brillo de pelo real:** dos anillos de luz que corren a lo largo de las hebras (uno claro y fino, otro del color del
  pelo), quebrados por la textura. Antes el reflejo salía en manchas, sobre todo en el pelo negro. En pelo claro
  (rubio, canoso y el gris del maniquí) el brillo es más suave, para que no se vea metálico.
- **Profundidad:** la capa de abajo y las raíces van más oscuras, y cada mechón tiene su propio tono (±9 %). Así se ven
  capas y volumen en lugar de un casco parejo. La luz envuelve las láminas, que ya no se cortan en negro.
- **Sombras con forma de hebras:** los mechones dan sombra recortada por la textura (antes, láminas enteras), y el
  casquete pegado al cráneo ya no calcula su propia sombra.
- **Menos recursos:** el material es mucho más liviano (antes era el material físico completo de three.js). En un
  peinado corto hay 35 % menos vértices (de 10 600 a 6 900), 41 % menos triángulos y 73 % menos triángulos en el
  cálculo de sombras. El pelo largo va de 13 300 a 9 600 vértices, con 61 % menos en sombras. Cada peinado ocupa ~25 %
  menos memoria. El casquete, que casi no se ve, usa columnas más espaciadas, salvo junto a las orejas.
- La raíz de cada mechón aparece de a poco en la textura: no queda una línea recta donde un mechón asoma bajo otro.

### Patillas, zoom con dos dedos y ajustes de diseño
- **Cabello con patillas:** el pelo baja por delante de la oreja (hasta la mitad en hombres, un tercio en mujeres y
  niñas), pasa justo arriba de la oreja y por detrás vuelve a bajar hasta la nuca; antes quedaba piel entre el pelo y la
  oreja. El nacimiento del pelo sigue una línea suave (antes se veía en escalones) y tiene hebras sueltas en patillas,
  sienes y nuca, en los peinados cortos. Se adapta a la oreja de cada cuerpo.
- **Zoom con dos dedos en el editor del plano:** pellizcar en la viñeta cambia el lente (abrir los dedos acerca, por
  ejemplo 50 → 85 mm) sin mover la cámara, y muestra los milímetros mientras tanto; en la vista libre acerca o aleja
  la mirada. En la planta, pellizcar acerca o aleja el mapa alrededor de los dedos. Al apoyar el segundo dedo se
  deshace lo que empezó el primero: ya no se elige ni se mueve una figura por error. Tocar un espacio vacío ya no hace
  que la cámara deje de seguir a la figura (solo arrastrar).
- **Plan de rodaje en el teléfono:** cada escena ocupa la mitad de alto (de 164 a 87 px): encabezado y sinopsis en una
  línea cada uno (se recorta el lugar, no el momento del día), y hora, locación y reparto en la segunda.
- **Hoja de llamado:** el encabezado y la franja de horarios forman una sola tarjeta (antes quedaba una muesca en la
  esquina); en el teléfono la franja va en una cuadrícula pareja, sin rayas sueltas.

### Pelo en masas (por defecto) y la cara despejada
- Por defecto el pelo se dibuja **en masas**: pocos volúmenes grandes y limpios, con el mismo contorno y sombreado
  de dibujo que el maniquí. Por dentro se ve como una sola forma, sin rayas negras entre mechones: el contorno
  marca solo la silueta del peinado contra el fondo y el cuerpo.
- **Ajustes del storyboard → «Pelo de las figuras»:** *Masas · dibujo* (por defecto) o *Realista · hebras* (las
  tarjetas con textura de hebras y brillo, para primeros planos). Vale para todo el proyecto y se comparte con el
  equipo; las viñetas, el animatic y los PDF se rehacen solos con el modo elegido.
- **La cara queda despejada** (en los dos modos): el pelo largo lleva flequillo en cortinas, abierto al medio y
  cayendo a los lados, y los mechones laterales van junto a las orejas, no delante de las mejillas. La melena tiene
  un flequillo corto de lado, el flequillo llega a las cejas (antes, a los ojos) y la cola y las coletas despejan la
  frente.
- **Calvicie:** la franja de pelo termina suave sobre el cuero cabelludo y los mechones nacen dentro de ella; antes
  asomaban como alas sobre las sienes.
- **Más liviano:** en masas, un peinado corto tiene 3 000 vértices y 5 600 triángulos (en tarjetas, 6 900 y 10 600),
  y el pelo largo 4 500 y 8 600 (en tarjetas, 9 700 y 14 300). No usa texturas ni transparencias, y en este modo
  las texturas de hebras ni siquiera se generan. La revisión física (nada atraviesa la cabeza ni el torso, las
  puntas caen) pasa en los 13 peinados y los 6 cuerpos, en los dos modos.
- **Ficha › Expresión: la cara al centro.** La vista de cerca encuadra la cabeza tal como se dibuja (cuerpo, postura,
  tamaño de cabeza, estatura y peinado): la cabeza entera al centro del cuadro con un poco de cuello, de frente, de
  perfil y de espalda. Antes se calculaba con una altura de ojos aproximada y, en cabezas grandes o en el anciano
  encorvado, se cortaba la coronilla y sobraba medio cuadro de cuello. De cerca ya no aparece el nombre encima.
- **Editor del plano, parte del cuerpo elegida:** la barra de arriba muestra solo el nombre de la parte (Torso,
  Antebrazo derecho…) con restablecer y soltar; ya no lleva la línea «Arrastra para…»: la zona marcada y su manija
  dicen cómo se mueve. La barra queda en una línea y tapa menos la viñeta.

### Página de entrada nueva, modo oscuro neutro y escribir sin cambios en el modo claro
- **Página de entrada (filmspiritpro.com):** al inicio, el encabezado de escena se escribe a máquina, el titular sube
  y se abre «la sala» como un telón: cuatro capítulos grabados de la app que pasan solos, cada uno con su barra de
  avance: **marcar el guion** (se marcan efectos, atrezzo y vestuario y el desglose se llena solo), **storyboard 3D**
  (la misma viñeta de noche, con lluvia y al atardecer; Ana levanta el brazo tomando su mano y Tito cruza los brazos
  desde la lista de posturas), **animatic** (se reproduce con sus cortes y diálogos) y **plan de rodaje** (una escena
  pasa a otra jornada y se ven los días por actor). Los videos están grabados en claro y en oscuro, y se ve el que
  corresponde al sistema. Se pausan con el botón de la sala o al salir de la vista; con «reducir movimiento» no pasan
  solos. Las pestañas se manejan también con las flechas del teclado.
- **«Un mismo plano, ocho atmósferas»:** la misma viñeta 3D en día, amanecer, hora dorada, atardecer, noche,
  nublado, lluvia y niebla, con el encabezado de escena que cambia («EXT. CALLE – NOCHE»). Pasan solas mientras se
  ven; al pasar el mouse por una o tocarla se queda esa. Al lado, «Poses a mano».
- **«Y todo lo que sigue, en la misma mesa»:** tarjetas con la pantalla real de escribir el guion, hojas de
  desglose, hoja de llamado, hoja de script, calendario y presupuesto (en claro u oscuro, como el sistema).
- Textos nuevos en los cinco idiomas. El segundo botón del inicio lleva a los planes.
- **Fuentes del servidor:** la web y la app del servidor vuelven a llevar Archivo y Courier Prime (el paquete
  anterior del servidor salió sin los archivos de las fuentes y se veía con la letra del sistema).
- **Una sola dirección:** quien entra por www.filmspiritpro.com pasa solo a filmspiritpro.com (o al revés, según
  `BASE_URL`). Antes el servidor rechazaba el inicio de sesión con Google que venía desde la otra dirección.
- **Modo oscuro neutro:** los fondos, paneles, campos, líneas, la hoja del guion y el animatic pasan de grafito
  azulado a grises sin tinte, en la app, la web y la ventana de escritorio.
- **Guion › Escribir en el modo claro:** la app se ve igual que siempre mientras se escribe (antes lo de alrededor de
  la página se ponía en gris y atenuado, y el naranja pasaba a gris). La concentración queda solo en el modo oscuro.

### Etapas con menús, Guion rayado aparte y estilo Color
- **Cuatro etapas en la barra:** Desarrollo, Imagen, Producción y Rodaje. Cada una abre un menú con sus pestañas
  (Desarrollo: Proyecto, Guion, Guion rayado y Desglose). La etapa abierta muestra la pestaña en la que estás. Se
  maneja también con el teclado: flecha abajo o Intro abre el menú, las flechas recorren sus pestañas y Escape lo
  cierra. Una etapa con una sola pestaña visible va directo a ella.
- **Guion rayado, su propia pestaña:** Guion queda para escribir y Guion rayado para marcar el desglose y crear
  planos. Allí los botones se llaman **Etiquetas** (los colores del desglose) y **Rayado** (las líneas de los planos,
  antes «Cobertura»). Al pasar de Guion a otra pestaña, el texto nuevo trae sus sugerencias del desglose, como antes
  al volver a «Marcar». Al importar un guion se abre el Guion rayado. En la ventana de escritorio: Ver › Guion rayado
  (Ctrl+Mayús+1).
- **Estilo «Color», el de siempre:** ⋯ › Estilo: Color o Clásico (el estilo Pastel de prueba ya no está; quien lo
  tenía pasa a Color). Color vive en la apariencia clara; en la oscura se ve el Clásico oscuro, con la estructura
  nueva. Colores por etapa: Proyecto pizarra, Guion gris claro, Guion rayado cobalto, Desglose índigo · Storyboard
  turquesa, Animatic azul acero · Plan de rodaje mostaza, Calendario oliva, Presupuesto verde · Hoja de llamado tabaco
  y Hoja de script arena (Rodaje deja el coral y el naranja).
- **En el estilo Color:** lo elegido en cada barra va en el color de la barra más saturado (antes, negro); los
  campos sobre la barra llevan un velo más oscuro del mismo color; la barra de Animatic va en negro junto a la mesa
  de montaje; Proyectos, Nuevo proyecto (naranja de la marca) y las notas no cambian con la pestaña; los datos del
  proyecto, el área de cada categoría del desglose y las columnas del tablero del calendario llevan un tono suave de
  su color; las cabeceras de escena de la hoja de script, su tira de día o de noche; las líneas entre filas del plan
  son grafito.
- **Plan de rodaje:** los números del reparto son texto de la fila (ya no parecen botones) y hay líneas verticales
  cortas entre las columnas.
- **Calendario:** las filas crecen hasta llenar la pantalla y los días siguen hasta abajo; las barras son más altas.
  La fila «+ Nueva tarea» queda solo en las fases vacías: con tareas, una nueva se dibuja arrastrando sobre los días
  en la fila de la fase (o con su «+»). Las líneas de los días son más suaves y las filas no llevan líneas entre sí.
- **Compartir:** al pasar el mouse se pone verde.

### Ficha del plano, barras sobrias y Rodaje en cian
- **Ficha del plano para consultar:** fuera del Storyboard (Guion rayado, Animatic, Hoja de script) un plano se abre en
  una ficha que no se puede cambiar: la viñeta, la planta de cámara y sus datos (tamaño, ángulo, movimiento, soporte,
  lente, altura de cámara, duración, quién está en cuadro, luces, interior), la descripción y las notas, con Anterior y
  Siguiente. «Editar en el Storyboard» lleva a esa pestaña y abre ahí el editor. «+ Plano» desde el guion crea el plano
  y muestra su ficha (con «Quitar el plano» por si fue sin querer). Quien no tiene acceso al Storyboard solo consulta.
- **Barras más claras y lo elegido, sobrio:** la barra de cada pestaña es un poco más clara que su color; el botón
  elegido va en el mismo matiz, oscuro y apagado, con letra blanca, de arriba abajo de la barra. Los demás botones
  usan la misma tinta legible y los campos de la barra ya no son un bloque de otro color, solo un filete fino.
- **Mesas más claras:** el fondo de cada pestaña es un 30 % más claro (también el del Storyboard).
- **Rodaje en cian:** Hoja de llamado en cian y Hoja de script en cian claro.
- **Animatic:** su barra, completamente negra.
- **Etiquetas del guion más visibles:** más color de fondo y una raya más oscura debajo (punteada en las sugeridas).
- **Acción principal en naranja:** Guardar, Crear, Aceptar, «+ Plano», «+ Figura» y «+ Objeto» en el naranja clásico.
- **«+ Nuevo plano»** vuelve a tener su borde punteado.
- **Planta de cámara siempre clara:** blanco o gris muy claro; en la playa el mar es un gris apenas más frío y la orilla,
  una raya punteada.
- **Lazo:** mientras hay una selección, lo de afuera se ve en sombra (ahí no se pinta).
- **Arreglo:** el primer elemento de los menús de etapa (Plan de rodaje, Storyboard, Hoja de llamado) salía corrido a
  la derecha. Y el menú de una etapa se cierra si la pestaña cambia desde otro lado o se abre una ventana.

### Etapa Guion: Construcción y Guion; Scouting y Casting en Desarrollo
- **Cinco etapas:** Guion (Construcción y Guion), Desarrollo (Proyecto, Guion rayado, Desglose, Scouting y Casting),
  Imagen, Producción y Rodaje. En la ventana de escritorio, Ver lleva las nuevas pestañas (Construcción con
  Ctrl+Alt+1, Scouting con Ctrl+Alt+2 y Casting con Ctrl+Alt+3).
- **Construcción · Argumento:** logline, storyline, sinopsis y argumento, de lo más corto a lo más largo, con la cuenta
  de palabras y lo usual de cada uno. «Exportar › Argumento» arma un PDF con portada y los textos elegidos seguidos.
- **Construcción · Escaleta y Tarjetas:** dos vistas de las mismas escenas, por actos. Las escritas salen solas del
  guion, en su orden, con su sinopsis (la misma del Guion rayado). «+ Escena» agrega escenas por escribir (borde
  punteado) que se arrastran a su lugar; «Pasar al guion» crea su encabezado ahí, con su número (1A, 2B…) y su
  sinopsis. Mover una escena escrita pregunta antes de moverla en el guion, con su texto, sus marcas y sus planos
  (se puede deshacer). Cada acto empieza donde se marca (⋯ › «El Acto II empieza aquí»); los actos se renombran y
  se agregan; cada escena lleva el color de su trama («Tramas…»). Se exportan la escaleta (tabla por actos) y las
  tarjetas para recortar (cuatro por hoja).
- **Scouting:** para cada lugar del guion, sus locaciones candidatas con fotos, dirección, enlace al mapa, contacto,
  teléfono, permiso, costo por día, estado y notas. «Elegir esta locación» la deja en el plan de rodaje (y de ahí en
  la hoja de llamado) con su dirección. Dossier en PDF con o sin fotos, o solo las elegidas.
- **Casting:** para cada personaje del reparto, el perfil buscado y sus candidatos con fotos, edad, contacto, agencia,
  enlace a la prueba, estado y notas. «Elegir para el papel» lo deja como actor o actriz en la hoja de llamado, con
  su teléfono (si ahí no se escribió otro nombre). PDF por personaje o solo el reparto elegido.
- **Equipo:** Construcción viaja con el guion, Scouting con el plan de rodaje y Casting con el desglose (lo edita el
  área de reparto). Sus fotos viajan con esas mismas secciones; las del scouting y el casting son de Pro y Studio,
  como las del desglose. El ZIP del proyecto suma el argumento, la escaleta, el scouting, el casting y sus fotos.
  **Hay que subir la nueva versión del servidor a la VPS** para que las fotos del scouting y el casting se guarden
  con sus permisos.
- **Arreglo:** un jefe de área que guardaba el desglose ya no borra el casting (el filtro de áreas lo conserva).
- **Ejemplo:** «La última función» trae su argumento, la escaleta con sus tres actos, dos tramas y una escena por
  escribir.

### Paleta de las etapas, argumento en hoja A4, biografías, marcador y sensor
- **Paleta nueva del estilo Color:** cada etapa con su familia, a partir de las referencias de la marca. Guion en
  neutros (gris cálido y gris claro, lo elegido en grafito); Desarrollo en cálidos (rosa suave, coral, rojo, naranja
  brasa y frambuesa); Imagen en azules (lo elegido en azul noche); Producción en amarillo, oro y verde agua; Rodaje en
  aqua y cian (lo elegido en petróleo). Todo se comporta igual: barra clara, lo elegido sobrio y el velo de fondo.
- **Argumento en una hoja A4:** el argumento se escribe en una hoja blanca; a la izquierda, Logline, Storyline y
  Sinopsis con su cuenta de palabras. Al elegir uno, su cuadro se abre arriba en la hoja y empuja el argumento hacia
  abajo (se apilan en su orden; se cierran con ✕ o tocándolos otra vez).
- **Biografías de personaje** (Construcción): edad, papel en la historia, apariencia, personalidad, historia previa,
  qué quiere, qué necesita, qué teme, arco, relaciones y notas. Los del reparto aparecen solos; «+ Personaje» crea uno
  que aún no está en el guion y, cuando aparece con su nombre, la biografía lo sigue. «Usar en el Casting» lleva la
  edad y la apariencia al perfil buscado. PDF con la ficha de cada personaje (también en el ZIP).
- **Tarjetas lisas:** sin las líneas de ficha.
- **Marcador en el Guion rayado:** se elige una categoría del desglose y todo lo que se selecciona en el guion queda
  marcado en ella al soltar (un doble clic marca una palabra), sin la cajita de categorías. Alt + rueda del ratón
  pasa a la categoría siguiente o la anterior, con un aviso junto al cursor; Esc lo apaga. El cursor es un resaltador
  del color de la categoría. En el teléfono, la cajita sigue y pone primero la categoría del marcador.
- **Tamaño de sensor:** en el panel Cámara del editor del plano (full frame, Super 35, APS-C, Micro 4/3, 1", Super 16,
  teléfono, cámara de acción y formato grande). El mismo lente abarca menos con un sensor más chico: el 3D y el cono
  de la planta se recalculan y se ve el equivalente en full frame. En Ajustes del storyboard, la cámara del proyecto
  vale para los planos nuevos y los automáticos (los que ya ajustaste no cambian). La ficha, las viñetas del
  storyboard y el PDF muestran el sensor.

### Tipografía unificada, barras más suaves y marcador en su color
- **Tipografía:** los títulos principales (de cada vista, ventanas, escenas, personajes y cifras grandes) van en
  Familjen Grotesk, en Clásico y en Color. El texto estándar es Archivo de 13 px y la escala de tamaños queda en 11,
  12, 13, 15, 18 y 24 px. Las descripciones (sinopsis, descripción de los planos, escaleta y tarjetas, la sinopsis
  en el plan de rodaje) van en Courier Prime, la letra del guion; las ayudas en párrafo, en cursiva. Familjen
  Grotesk (OFL) va dentro del programa (desktop/fuentes) y en la web se carga con las demás; los PDF siguen en Archivo.
- **Barras:** lo elegido tiene la mitad de contraste con su barra (a medio camino entre el tono sobrio y la barra),
  con letra oscura o blanca según se lea mejor en cada pestaña. Los selectores y campos de la barra se ven como un
  botón más: sin borde ni fondo, con su flecha y el mismo velo al pasar el mouse.
- **Marcador:** ícono de un solo trazo (también el cursor). El botón de la barra se pinta entero, de arriba abajo,
  con el color de la categoría, y el aviso de Alt + rueda también; la letra va oscura o blanca según el color.

### Hoja de llamado como orden de rodaje, plan más claro y barras sin «Ajustes»
- **Hoja de llamado reordenada** por jerarquía de una orden de rodaje, en bloques compactos (pantalla, PDF y Excel):
  - arriba, los teléfonos clave (asistente de dirección y jefatura de producción), el título y los jefes de equipo
    (dirección, producción, fotografía, arte, sonido) con los logos;
  - una franja de tres columnas: clima (previsión, temperatura, humedad, amanecer, anochece) · la fecha con el
    llamado general · la jornada (horario de–a, listos motor, almuerzo, catering, centro de salud);
  - la **nota para el equipo** a todo el ancho, debajo de las locaciones;
  - el **cronograma a todo el ancho**: si el storyboard tiene planos, va plano por plano (horario, descripción
    con tamaño, quién, soporte y ángulo, acción, set, lente, sonido y personajes); las escenas son franjas con sus
    horas del plan (cada plano toma una parte igual de su escena) y los eventos (traslado, almuerzo) son bandas;
  - el **cierre**: los eventos después de la última escena (desmontaje, regreso) y «Fin de jornada»;
  - el **reparto** (recojo, llamado, vestuario, maquillaje, listos y observaciones) junto a la **citación del
    equipo** por área (cada área con su hora; cada persona puede tener la suya) y los proveedores;
  - el **punto de encuentro** (dirección, referencia, enlaces, «Abrir en Google Maps» con el enlace de Maps o
    buscando la dirección, y fotos, de Pro y Studio) junto a la **movilidad** (vehículos con conductor y pasajeros
    del equipo y del reparto; «Copiar la de la jornada anterior»).
- **Sonido por plano** (Sí, Ambiente, No/MOS): en el editor del plano, en la lista de planos del storyboard y en
  la hoja de llamado (lo cambia quien edita el storyboard).
- Las fotos del punto de encuentro (`cl~<jornada>~<foto>`) viajan con la hoja de llamado: en el servidor y en la
  carpeta compartida del escritorio solo las leen y guardan quienes tienen esa sección. **Hay que subir la carpeta
  `server` nueva al VPS.** También salen en el ZIP del proyecto.
- **Barras:** sale el botón «Ajustes» de todas las pestañas; sus opciones están en «⋯» (solo ícono) al final de la
  barra, junto a la ayuda y Exportar. Dos botones elegidos seguidos (Etiquetas y Rayado) quedan separados por un
  corte fino del color de la barra. El ícono de los campos de fecha y hora se dibuja entero en la tinta de la barra
  (antes casi no se veía sobre el amarillo).
- **Plan de rodaje:**
  - los nombres de locación, del evento y su detalle pasan a la línea siguiente en vez de cortarse (la fila crece);
  - las líneas verticales entre columnas, un 30 % más cortas y centradas;
  - «+» en la barra negra de cada jornada para agregar un evento con hora;
  - «Locaciones…», «+ Etapa» y «+ Jornada» a la derecha de la barra;
  - el menú de una escena es más corto: «Mover a» como una fila de números de jornada (la fecha al pasar el
    mouse), «Cortar la jornada aquí», «Dividir (18A)», «Nueva etapa aquí», colores de resaltado de la paleta
    nueva en una fila y «Ver en: Desglose · Guion»;
  - «Por actor» ocupa todo el ancho: las jornadas se reparten el espacio (hasta un máximo) y los totales quedan
    al final, a la derecha.
- **Guion rayado:** el marcador acompaña al ratón con un círculo pequeño del color de la categoría; el nombre
  completo aparece solo al cambiar de categoría con Alt + rueda. En Ajustes quedan solo las categorías, pintadas
  con su color entero (las ocultas, solo con su borde).
- **Globo de nota:** mira el color de lo que tiene detrás y elige amarillo, grafito o blanco, el que más se
  distinga, con un filete de contraste; el número siempre se lee.
- El menú de cada etapa ya no tiene recuadro blanco: solo sus pestañas apiladas, cada una con su sombra. El
  verde de «Compartir» al pasar el mouse es más sobrio.

### PDF y Excel con el diseño de la app, a todo color
- **Cada documento con el color de su pestaña** (estilo «Color»): arriba, la barra de la pestaña de borde a borde
  con el nombre del proyecto en la letra de los títulos, el documento y la fecha (y los logos, si están); en las
  páginas que siguen, una barra angosta del mismo color; al pie, un cuadrito de su color con el documento y el
  número de página. Las cabeceras de las tablas van en el color de la barra y las filas de grupo con su velo; sin
  rayado gris alternado.
  - Plan de rodaje: las tiras de día y de noche enteras (amarillo y azul, como en pantalla), la jornada en negro y
    su cierre en negro.
  - Hoja de llamado: el centro como en la app (jornada, fecha, «LLAMADO GENERAL» y la hora grande) entre el clima
    y los horarios en celeste; la nota para el equipo en amarillo suave; el cronograma con las escenas en su tira
    y su número en un cuadro negro; las secciones en el color de la barra.
  - Hoja de desglose: la barra roja con «HOJA DE DESGLOSE» y el número en negro; cada caja con su cabecera en el
    color de su categoría y el área en un tono suave, sin bordes negros (se sigue pudiendo escribir encima).
  - Hoja de script y guion técnico: cada escena en su tira de día o de noche con su número en negro; lo rodado en
    verde suave.
  - Calendario: primero la **línea de tiempo** como en la app (cada tarea una barra de su color, fines de semana y
    días de rodaje sombreados, por fase) y después la lista de tareas.
  - Presupuesto: el TOTAL grande en la letra de los títulos. Días por actor: «trabaja» en negro como en pantalla.
  - Storyboard, animatic, Construcción (argumento, escaleta, tarjetas, biografías), scouting, casting, láminas,
    parte diario y reportes de cámara y sonido: con su barra, sus tablas y sus títulos en el color de su pestaña.
- **Letras de la app en los PDF:** los títulos en Familjen Grotesk, el texto en Archivo y el guion (y lo que viene
  de él) en Courier Prime, la Courier de los guionistas que usa la app (mismo ancho de letra: el formato y la
  paginación no cambian). Solo se incrustan las que usa cada documento.
- **Excel** (plan de rodaje, días por actor, hojas de llamado y calendario) con la misma paleta: título en una
  franja del color de la pestaña, cabeceras en el color de la barra, las tiras de día y de noche, la jornada y los
  cierres en negro, bordes finos del color de la pestaña y las letras Archivo y Familjen Grotesk (si no están
  instaladas, Excel usa las suyas).

### Logo nuevo, extras en multitud, notas al margen y rayado sobre el texto
- **Logo nuevo (propuesta A):** «FilmSpirit» en Familjen Grotesk dentro de una pestaña, como las del programa.
  Una variante por edición, con el nombre de la edición al lado:
  - **Free:** pestaña naranja con letras blancas (como hasta ahora);
  - **Light:** blanca con borde y letras plata (una variante discreta: no es un plan);
  - **Pro:** blanca con borde y letras naranjas (el naranja invertido);
  - **Studio:** blanca con borde y letras negras.
  El ícono es la pestaña naranja con «FS». `desktop/marca/generar.py` produce todo: los SVG de cada edición
  (`marca/svg/`), el ícono y el ícono de los archivos del proyecto (`build/icon.*`, `build/doc.*`), las imágenes
  del instalador, los favicon de la web (`marca/web/`), las láminas PNG y `src/marca.js`. Salen los antiguos
  `*-naranja.svg`.
- **Menús desplegables de las barras** (escena del storyboard, jornada…): la lista se abre con el mismo diseño
  de los menús de la sección (en el teléfono sigue la lista del sistema).
- **Barras más equilibradas:** el mismo espacio entre grupos y en los bordes; los botones cortos (− +) con un
  ancho mínimo parejo.
- **Planta de cámara sin cuadrícula:** el fondo liso.
- **Extras (sin rostro) en multitud:** «+ Figura → Extras…» pide cuántos y la situación (Concierto, Protesta,
  Público uniforme, Público sentado, Maratón, Feria, Transeúntes, Fila, Fiesta) y lo apretados que están. Hasta
  6 son figuras sueltas; desde 7, un solo objeto «Extras» que se mueve y gira entero. Cuantos más hay, menos
  detalle: figuras simples hasta 40, siluetas desde ahí (hasta 500). En su panel se cambia la cantidad, la
  situación, la densidad, la ropa (variada o gris) y «Mezclar» los reacomoda. En la planta se ve como un área
  con un punto por persona y hacia dónde miran.
- **Guion rayado, rayado sobre el texto:** como en el papel, cada plano tiene su línea vertical sobre la columna
  del texto, repartidas a lo ancho en el orden de los planos, con una raya corta donde empieza y donde termina y
  el número del plano arriba (tocarlo abre el plano; en la página que sigue, el número más claro). La línea no
  estorba para elegir el texto. Igual en el PDF.
- **Notas al margen con fecha y flecha** en el guion rayado: se suelta el botón de nota sobre una palabra (o se
  toca «Pegar una nota» y luego el texto), o se elige texto y «Nota». La nota queda al costado de la página con
  la fecha del día y una flecha fina que corre entre los renglones hasta ese lugar, resaltado. Las notas de una
  página se acomodan sin taparse. Tocarla abre su conversación (responder, editar, resolver, borrar). Quien la
  escribió cambia la fecha (en la tarjeta o en la conversación) y arrastra la punta de la flecha a otro lugar.
  Si el guion cambia, la nota busca el texto que señalaba. En pantallas angostas es una marca en el margen.
  Salen en el PDF del guion rayado (en el margen derecho, o en el izquierdo si la página tiene asteriscos de
  revisión), con su leyenda en la portada. Son notas del equipo: las ve quien puede ver el guion. **Hay que
  subir la carpeta `server` nueva al VPS** (guarda el punto del texto y la fecha, y deja que su autor la mueva).

### Observaciones de diseño (octubre de 2026)
- **Pestañas en el orden de una producción**, en cuatro grupos separados por una línea fina: Proyecto · Guion ·
  Desglose ┊ Storyboard · Animatic ┊ Plan de rodaje · Calendario · Presupuesto ┊ Hoja de llamado · Hoja de script.
  Las tablas de permisos del equipo siguen el mismo orden.
- **Guion › Escribir: formato y revisión.** Negrita (Ctrl+B), itálica (Ctrl+I), subrayado (Ctrl+U) y resaltar, en
  la barra junto a deshacer y rehacer. Se elige el texto (o se deja el cursor en una palabra) y se toca el botón; los
  botones se encienden según el texto donde está el cursor. Lo que se escribe al final de un tramo sigue con su
  formato. Se ve en el guion rayado, sale en el PDF (negrita, itálica y subrayado; el resaltado es una marca de
  trabajo y no se imprime) y en Fountain (`**negrita**`, `*itálica*`, `_subrayado_`); al importar Fountain o Final
  Draft se lee su formato. El último botón es la **revisión**: marca los cambios con un asterisco del color que se
  elija, sin abrir el panel; con el guion cerrado, cierra la revisión abierta.
- **PDF con el diseño del programa:** la letra de la app (Archivo, incrustada en cada PDF), encabezados de tabla en
  gris claro con letra oscura, líneas finas, el nombre del documento en naranja con una línea de acento, y las líneas
  de cobertura del guion rayado en naranja (antes, azul). El guion sigue en Courier. **Excel:** los mismos
  encabezados claros y bordes suaves (en Calibri, que tienen todos los equipos).
- **Plan de rodaje:** la sinopsis de cada escena va en *cursiva* bajo el encabezado, en la pantalla, en el PDF y en
  el Excel (en la misma celda).
- **Animatic:** las pistas Ritmo, Insertos (V2), Diálogo y Música son íconos en la barra de herramientas, junto a
  «Insertar un negro»; se encienden cuando la pista se ve. Sale el menú «+ Pista».
- **Barra de arriba:** el nombre del proyecto ya no abre un menú. Sus acciones (guardar .fsp, descargar ZIP,
  archivar, salir del equipo, eliminar, y en escritorio mostrar el archivo o la carpeta) están en «Proyectos», en el
  botón ⋯ de la fila del proyecto abierto. En el teléfono, «Proyectos» se ve como ícono con su contador.
- **Contadores:** el de «Proyectos» y el de notas van en naranja con el número en blanco (más de 9 notas: «9+»). El
  ícono de notas tiene el trazo de deshacer y rehacer y se ve en modo claro y oscuro.
- **Proyecto:** los cuadros de logo vacíos dicen «Logo» en gris tenue.
- **Modo oscuro:** las listas desplegables se abren con fondo oscuro y letra clara (antes, fondo blanco).

### Las claves no se mueven al cambiar la duración del plano
- En el editor del plano, cambiar la duración ya no estira ni encoge la animación: **cada clave se queda en su
  segundo**. Acortar corta el final del plano; alargar deja quieta la última pose. Una clave puesta en 4 s sigue en
  4 s aunque el plano pase de 20 a 10 s.
- Las claves que quedan **después del final** se conservan: se ven atenuadas sobre la zona rayada de la línea de
  tiempo y vuelven a contar si se alarga el plano (el último cuadro muestra el punto intermedio del movimiento).
- El aviso trae **«Estirar la animación»**, para repartir las claves en el nuevo largo como antes, cuando sí se
  quiere un movimiento más rápido o más lento. Se deshace con Ctrl+Z.
- En el animatic vale lo mismo: el borde derecho de un clip y el cambio de duración ya no estiran la acción del
  plano.

### Rodaje: días por actor, parte diario y reportes de cámara y sonido
Sin pestañas nuevas: todo sale de lo que ya se anota en el plan, el desglose, la hoja de llamado y la hoja de script.
- **Plan de rodaje › «Por actor»** (junto a «Jornadas»): cada personaje del reparto en una fila y cada jornada en una
  columna, con **I** inicio, **T** trabaja, **E** en espera (entre su primera y su última jornada, sin escenas),
  **F** fin e **IF** un solo día. Al lado, sus jornadas de trabajo, de espera, el total de su contrato y las fechas de
  inicio y fin; abajo, cuántos actores trabajan cada jornada. Un punto avisa si al actor le quedan escenas sin
  programar. Tocar el número de una jornada la muestra en el plan; tocar el nombre abre la ficha del personaje.
  **Exportar › Días por actor (PDF)** (varias páginas si hay muchas jornadas) y una hoja más en el **Excel del plan**.
- **Hoja de script › Parte diario:** con una jornada elegida, además del llamado, la primera toma y el fin, se anotan
  las **horas extra** y las **incidencias**; la duración de la jornada se calcula sola. **Exportar › Parte diario
  (PDF)**: horarios, avance de la jornada (escenas, páginas, planos, tomas buenas y NG, tarjetas y rollos), las
  escenas con su estado, el reparto con su actor, su llamado y su día en el plan, el **avance del rodaje** hasta esa
  jornada comparado con el plan (atraso o adelanto en páginas), incidencias, notas y firmas de script, asistencia de
  dirección y jefatura de producción.
- **Rollo de sonido:** junto a la tarjeta en cámara; las tomas nuevas lo anotan solas y en cada toma se puede corregir
  (o escribir **MOS** si se grabó sin sonido).
- **Exportar › Reporte de cámara (PDF):** las tomas agrupadas por tarjeta, en el orden en que se grabaron, con escena,
  plano, toma, hora, duración, lente, estado y nota. **Reporte de sonido (PDF):** por rollo de sonido, con las tomas
  MOS aparte. Los dos valen para la jornada elegida o para todas las escenas.

### Guion final cerrado con código
- **Guion › Ajustes → «Cerrar el guion final…»** (también en el panel *Revisión del guion* y en «⋯» del teléfono).
  Lo cierra producción con su código de 4 dígitos (con equipo: quien administra o un cargo de producción con permiso
  para editar el guion). Se muestra una sola vez un **código de recuperación**.
- **Queda de solo lectura para todos.** En la barra aparece el candado *Guion cerrado*; «Escribir» lleva a abrir una
  revisión. Importar otra versión, cambiar el formato (cine / AV) o renumerar las escenas no se puede con el guion
  cerrado. Marcar el desglose y crear planos sigue igual.
- **Los números no se mueven.** Al cerrar se fijan los números de escena y cada página recuerda dónde empieza: una
  escena nueva va con letra (12A, también al final del guion) y lo que se agrega y no cabe en su página va en una
  página con letra (30A, 30B); lo que se quita deja la página más corta. Si se borran páginas enteras, la que sigue
  lleva sus números (30-32). El guion, el PDF, el plan de rodaje y las hojas usan esos números de página.
- **Revisiones de color.** Una persona autorizada entra con su código y abre una revisión: azul, rosa, amarillo,
  verde, dorado, salmón, cereza, blanco (sugiere el color que sigue). Cada párrafo que cambia queda con un asterisco
  de ese color en el margen; las páginas revisadas llevan en el PDF «Rev. rosa · fecha» arriba y la carátula lista
  las revisiones. Al cerrar la revisión el guion vuelve a quedar cerrado y queda anotado cuántos párrafos y qué
  escenas cambiaron (una revisión sin cambios no gasta su color).
- **Quién revisa.** Por defecto: producción, guion y dirección. Con equipo, producción marca a las personas del
  equipo y cada una crea su propio código la primera vez; sin equipo, cada persona escribe su nombre, cargo y código.
  Producción agrega o quita personas y restablece códigos. Hay un cargo nuevo, **Guion**, en *Equipo y permisos*.
- **Reabrir:** solo producción, con su código o con el de recuperación. Las páginas vuelven a acomodarse solas; los
  números de escena, los asteriscos y el registro se conservan.
- **Registro y avisos.** Cerrar, abrir y cerrar revisiones, autorizar, quitar, cambiar códigos, reabrir y exportar
  copias quedan en el registro con nombre y hora (panel *Guion cerrado*). Con equipo, cada paso llega como aviso.
- **Copia con nombre.** Al exportar el guion cerrado se pide para quién es la copia y se puede poner su nombre en cada
  página (marca de agua y pie «Copia de … · fecha · No distribuir»). Con equipo, quien no es de producción exporta
  siempre con su nombre. También se baja la **versión cerrada** (como se cerró, sin revisiones).
- **Quién puede guardar lo decide el servidor**, no la página: con el guion cerrado, el texto solo se guarda con una
  revisión abierta y por una persona autorizada (en la web, aunque su permiso del guion sea «ver»); cambiar quién
  revisa o reabrir, solo producción; el registro no se puede borrar. En el equipo de escritorio lo comprueba cada
  integrante al recibir el cambio (ahí quien revisa necesita permiso para editar el guion). Sin equipo es una
  protección dentro del programa y lo dice. Pruebas: `server/test/guion-cierre.test.js` y
  `test/team/guion-cierre.test.js`.

### Seguridad (revisión de octubre de 2026)
- **Datos de colaboradores y archivos .fsp:** todo lo que viene de otra persona se valida antes de mostrarse (tipos de
  párrafo, números, colores, fechas, notas e imágenes) y cada dato que va dentro de la página pasa por un escape. Un
  colaborador, un .fsp o un .fdx ya no pueden inyectar código ni botones invisibles. Tampoco pueden alterar los objetos
  internos de la app con claves especiales (`__proto__`).
- **App de escritorio:** la política de seguridad ya no permite código en línea; la ventana solo muestra la app (soltar
  un archivo o un enlace file:// no la reemplaza); el puente con el sistema solo responde a la página de la app; se
  niegan cámara, micrófono y ubicación; «Guardar» acepta solo un nombre de archivo de un tipo conocido; la carpeta
  compartida se crea solo donde se eligió en el diálogo.
- **Carpeta compartida:** la firma de cada archivo vale solo para su sección (quien edita la hoja de script no puede
  reescribir el guion ni las imágenes); no se aceptan versiones anteriores de una sección ni una copia vieja del
  manifiesto (nadie puede deshacer una baja del equipo restaurando archivos); las contraseñas nuevas usan scrypt 2^17
  (las anteriores se vuelven a cifrar al entrar) y la de producción pide 12 caracteres con letras y números.
- **Servidor:**
  - cuota real: las secciones y su historial cuentan para el espacio del plan, y los proyectos archivados tienen tope
    (10, 60 y 200); antes una cuenta gratuita podía llenar el disco;
  - equipo: a una cuenta existente le llega una **invitación** que acepta al abrir el proyecto (o rechaza desde la
    lista de proyectos); ya no queda dentro sin querer ni se revela su nombre. Quien pidió entrar se agrega directo;
  - las páginas con permiso (app y panel) ya no se sirven escribiendo la dirección de otra forma;
  - al salir o al suspender una cuenta se cierran sus conexiones en vivo;
  - los avisos de Mercado Pago exigen la clave secreta, y una suscripción de Lemon Squeezy a otro producto no activa
    ningún plan;
  - libro de reclamaciones: como mucho 2 copias por correo al día a una misma dirección y 100 en total (la hoja se
    guarda siempre y la copia se ve en pantalla), con un campo trampa para programas;
  - desglose por áreas: un jefe de área ya no puede borrar marcas de otras áreas.
- **Otros:** al entrar con otra cuenta en el mismo navegador se borran los datos guardados de la anterior; el CSV del
  equipo no deja fórmulas de Excel; jsPDF pasa a 4.2.1 (con jsPDF-AutoTable 5.0.9), sin las fallas conocidas de la
  2.5.1; el aviso del código del presupuesto aclara que oculta pero no cifra.

### Rendimiento: viñetas guardadas, animatic fluido y arranque más rápido
Medido con un proyecto grande (56 escenas, 96 planos):
- **Las viñetas del storyboard quedan guardadas en el navegador.** Al volver a abrir el proyecto aparecen al
  instante (0,2 s en vez de dibujar las 96 de nuevo). La clave de cada viñeta reúne todo lo que se ve en ella
  (escena 3D, personajes, caras, referencia, anotación, planta, atmósfera del guion y la versión del programa):
  si algo cambia, solo esa se rehace. Se guarda solo la versión final y se borran al cerrar sesión.
- **Cada viñeta se dibuja una sola vez:** el animatic usa la misma del storyboard (antes dibujaba otra más chica)
  y el PDF del animatic la achica sin volver a dibujar la escena.
- **Las viñetas que faltan se dibujan en los ratos libres**, de a una, y esperan mientras arrastras algo, mientras
  el animatic reproduce o graba y mientras el editor del plano está abierto. Antes de dibujar una viñeta se
  esperan su referencia y las fotos de sus personajes (así no se dibuja dos veces). En las viñetas la sombra
  del sol usa un mapa de 1024 (en ese tamaño no se nota y cuesta la cuarta parte); el visor y el video siguen a 2048.
- **PDF del storyboard en 0,1 s** cuando las viñetas ya están (antes 29 s): usa las guardadas y solo trae
  imágenes y maniquíes de las que faltan.
- **Animatic: los planos quietos se reproducen fluidos.** Un plano sin movimiento (una sola posición, sin
  cámara en mano, lluvia ni olas) se dibuja una vez y después se repite la imagen; el plano que sigue se prepara
  mientras se ve uno quieto. Con movimiento, se dibuja en vivo como antes. El video exportado también lo
  aprovecha. Al abrir el animatic el visor se dibuja una vez (antes, dos).
- **Arranque:** el programa se trababa ~0,4 s al abrir el ejemplo o importar un guion por las ~250 expresiones
  del desglose automático (bordes de palabra Unicode). Ahora ~0,13 s, con el mismo resultado del desglose.
  El proyecto se ve a los 0,6 s.
- **Cabello:** las hebras se preparan por partes en segundo plano (antes congelaban la pantalla 0,6 s) y quedan
  guardadas en el navegador; las miniaturas del selector de peinados también (la segunda vez aparecen al instante).
- **Editor del plano:** aparece enseguida con la viñeta del storyboard y la escena 3D se dibuja justo después.
- La ficha del personaje y la pestaña de expresiones bajan solo el cuerpo que se muestra (antes los seis, ~2,3 MB);
  el PDF y el video, solo los cuerpos que salen.
- Los cambios del equipo que llegan con un diálogo abierto se revisan solo mientras hay pendientes (antes cada
  0,9 s siempre).

### Ficha y vestuario más simples
- La ficha del personaje se ordena en filas «etiqueta | control», sin cajas: tipo de cuerpo, complexión y estatura a
  la vista; las demás proporciones en **«Más proporciones»** (con un punto si tienen cambios; queda abierto o cerrado como lo dejes); pelo, piel,
  color, tallas y fotos en una línea cada uno. En «Expresión», lentes y ojos van igual.
- Vestuario › Prendas: **tocar una prenda puesta la quita** (antes no se podía deseleccionar) y la lista sigue
  abierta para poner o quitar otra. Las prendas son etiquetas compactas en lugar de cajas grandes.

### Notas
- La nota queda clavada donde se suelta: un globo de diálogo en el punto exacto (sobre un plano, una escena, una
  tarea… o en cualquier lugar de una pestaña, y se mueve con ella). Tocarlo abre ahí mismo su conversación.
- **Solo quien escribió una nota puede borrarla** (también producción solo las suyas; lo controla el servidor).
- Cualquiera puede **ocultar las notas** en su pantalla mientras mira (botón de notas › «Ocultar las notas en mi
  pantalla», o el ojo de la conversación). No se borra nada y los demás las siguen viendo.

### Web pública (filmspiritpro.com)
- Nuevo diseño editorial: barra simple con un solo botón, titular grande con dos botones, las cuatro funciones
  numeradas (01–04) con su video, etiquetas en mayúsculas y enlace, bloques separados por líneas finas,
  planes en columnas, preguntas y un llamado final; pie sobrio. Textos en los cinco idiomas.
- **Videos de 10 segundos** grabados de la app (guion, desglose, storyboard 3D, plan y hoja de llamado): sin
  sonido, en bucle, livianos (65–265 kB) y solo se reproducen mientras se ven. El servidor los entrega por
  partes, como piden Safari y los teléfonos.
- **Testimonio:** la sección aparece solo si hay uno real en `DATA_DIR/testimonio.json`
  (`{"text": "…", "name": "…", "role": "…", "photo": "https://…"}`); se lee al iniciar el servicio.

### Colores: leyendas, temas y ajustes de pantalla
- **Una leyenda arriba de cada tabla** (plan de rodaje, hoja de llamado, hoja de script, calendario, desglose y
  guion rayado con etiquetas): dice qué significa cada color. **Los colores se cambian desde la leyenda**, no fila
  por fila: tocar un color abre su paleta, su nombre, «Otro color…» y «Volver al original», y cambia todo lo que
  lo usa, en la pantalla de todo el equipo, en los PDF y en los Excel.
- **Resaltar con un color de la leyenda:** en el menú de una escena, un evento o una jornada (y en la etiqueta de
  una tarea del calendario) se elige un color con nombre de la leyenda; «+ Color» o «Nuevo color en la leyenda…»
  suma uno (p. ej. «Toma compleja»). Quitar un color devuelve lo resaltado con él a su color de siempre.
- Los colores de la leyenda y de las 14 pestañas **se guardan en el proyecto**, cada uno en su sección: los cambia
  quien edita esa pestaña (el plan, el calendario, la hoja de llamado, todo el desglose; las pestañas, quien
  edita el guion).
- **PDF y Excel con la misma leyenda**, debajo de su barra (o arriba del cronograma en la hoja de llamado), solo con
  los colores que aparecen en el documento. Los días de rodaje del calendario toman el color de «Rodaje».
- **Colores y temas** (⋯ de las pestañas › Colores y temas…): un panel a la derecha con los temas Original, Pastel,
  Sobrio y Alto contraste y los tuyos («Guardar como tema…», actualizar, cambiar el nombre, borrar), los colores de
  las pestañas por etapa y, **solo en tu pantalla**: barras de color entero, suaves o blancas; alto compacto o
  normal; grosor de las líneas finas y de las gruesas (finas, normales, gruesas). Los temas quedan en tu cuenta (sin
  cuenta, en el navegador) y se cargan en cualquier proyecto; lo que no puedes editar de ese proyecto no cambia.
- Los colores sueltos de antes (de filas del plan y de tareas) pasaron a la leyenda con su nombre. El ajuste
  «Cierre de jornada negro/blanco» se reemplaza por el color «Jornada y cierre» de la leyenda.
- Servidor: `GET/PUT /api/me/themes` (hasta 30 temas, 48 kB, validados) y la migración 7 de la base
  (`users.themes`). Hay que subir la carpeta `server/` a la VPS.

### Logo
- **Siempre letra blanca sobre la pestaña roja**, con la edición al lado en blanco: FilmSpirit Free, Indie, Pro y
  Studio (la versión Light pasa a ser Indie). Solo para fondos rojos queda la versión invertida (`logo-naranja.png`).

### Prueba de uso con un largometraje (125 páginas, 105 escenas, 26 personajes, 35 jornadas)
- **Reparto sin duplicados:** quien se presenta en la acción con nombre completo y edad («MARÍA QUISPE (42)»,
  «INSPECTORA ROSA CHÁVEZ (45)», «EL CHOLO BENAVIDES (50)», «UNA MUJER DEL MERCADO (50)») y después habla con parte de
  ese nombre («MARÍA», «ROSA», «CHOLO», «MUJER DEL MERCADO») es un solo personaje. Antes salían 44 personajes en vez de
  26, con números, días por actor, hojas de llamado y presupuesto de elenco equivocados.
- **Nombres en español:** las locaciones y los nombres llevan las palabras chicas en minúscula («Casa de María»,
  «Mercado Central de Trujillo», no «Casa De María»).
- **Otra versión del guion sin perder el trabajo:** al actualizar el guion, las dos versiones se comparan como un
  «diff». Cada escena conserva su número (el plan de rodaje, las notas y la hoja de script siguen a su escena), las
  nuevas toman letra (50A) y quedan en «Sin programar», y las marcas siguen su texto aunque el párrafo cambie. Antes,
  quitar una escena y agregar otra renumeraba todo (el plan apuntaba a escenas equivocadas) y se perdían 591 de 618
  marcas. Al terminar, el aviso dice qué escenas entraron y cuáles salieron (y de qué jornada).
- «Importar otra versión…» (o un guion con el mismo título) propone **«Actualizar el guion»** en lugar de crear un
  proyecto nuevo.
- **Jornadas realistas:** las horas estimadas parten de 2 horas por página (antes 1), así una jornada sugerida de
  4,5 páginas termina a media tarde y no a las 11 de la mañana. Las páginas por jornada de «Sugerir jornadas» se
  ajustan en Ajustes del plan, y la sugerencia evita cambiar de locación a mitad de jornada si ya va más de la mitad.
- Proyecto: la versión ya no muestra un ejemplo que parecía un dato («v6 · 05/10/2026»).


### Planes Guion, Indie, Pro y Studio (según «Planes y precios»)
- **Guiones y proyectos de producción.** Cada proyecto es un *guion* (solo texto y notas, hasta 4 personas
  coescribiendo, solo con permiso sobre el guion) o un *proyecto de producción* (todas las pestañas). El plan Guion
  solo crea guiones; Indie, Pro y Studio eligen al crear (el guion no ocupa un lugar de producción).
- **Llevar a producción:** desde la pestaña Proyecto o desde cualquier pestaña de producción de un guion, que muestra
  qué se gana y el botón. Sin plan de pago abre los planes con la prueba de Pro de 30 días y, al volver del pago, lo
  lleva a producción solo. El servidor no acepta datos de producción en un guion.
- **Límites:** Guion 5 guiones activos; Indie 2, Pro 7 y Studio 20 proyectos de producción activos (20, 60 y 200
  archivados); personas por proyecto contándote: Indie 1, Pro 30, Studio 60; espacio 5, 20 y 100 GB. Al bajar de
  plan, lo que pasa el límite queda en solo lectura.
- **Ventana de planes** con cuatro columnas, «Todo lo que incluye cada plan», precio de fundador, prueba de Pro, anual
  = 10 meses y lista de espera de Studio. Menú de la cuenta con guiones y proyectos usados.
- **Precio de fundador:** hasta el 28 de febrero de 2027, Pro a S/ 39 al mes en Mercado Pago; fuera del Perú, el
  código FUNDADOR (20 % recurrente) en Paddle. No se suma otro código.
- **Paddle** para pagos fuera del Perú (Lemon Squeezy queda de respaldo): transacción con el precio del plan, página
  `/pagar` con Paddle.js, avisos firmados (`Paddle-Signature`, 5 minutos), cobros registrados una sola vez,
  devoluciones, portal de recibos y cancelación. Al pasar de Indie a Pro o de Pro a Studio, la anterior se cancela.
- **Web pública:** cuatro planes, tabla para comparar, condiciones, lista de espera de Studio y textos en cinco
  idiomas. Términos y privacidad al día (Paddle como revendedor, prueba, fundador, eliminar la cuenta).
- Corregido: una suscripción Indie daba Pro; con un 409 («ya tienes ese plan») la app iba a «undefined».
- Servidor: migraciones 8 (`projects.kind`, lista de espera) y 9 (cuentas eliminadas); `POST /api/p/:id/produce`,
  `POST /api/waitlist`, `GET /api/admin/waitlist`, `POST /api/billing/portal`, `/api/billing/paddle-webhook`.
  **Los precios cambian de nombre** (`PEN_PRO_MONTH`, `USD_INDIE_YEAR`…): los viejos (`PRICE_MONTH`…) ya no se leen y
  el servidor avisa al arrancar si siguen en la configuración.

### Inicio de sesión y cuentas
- **Eliminar mi cuenta** (menú de la cuenta): se confirma escribiendo el correo; cancela las suscripciones en su medio
  de pago (si no responde, no elimina nada), borra los proyectos propios (también para su equipo), las membresías,
  invitaciones, sesiones y navegadores. Quedan los cobros (contabilidad) y una huella SHA-256 de la cuenta de Google
  para que la prueba de Pro no se repita al volver.
- **Cerrar sesión en todos los equipos.**
- Las llaves de prueba de Google (`GOOGLE_JWKS_FILE`) no se aceptan con una dirección https pública aunque falte
  `NODE_ENV=production`; una llave desconocida relee las de Google como mucho una vez por minuto; la foto de Google
  solo se guarda si es https y el nombre sin caracteres de control.

### Pruebas extremas (sobre una copia del proyecto)
- Resistió: carreras de límites de plan, firmas y repeticiones de avisos de pago, permisos por pestaña y por área,
  rutas raras, cuerpos y cabeceras gigantes, conexiones lentas, ~2000 pedidos por segundo y XSS en la app y el panel.
- Corregido: un JSON con miles de niveles dejaba una sección sin poder guardarse (error 500); ahora se rechaza al
  entrar (máximo 64 niveles). Las áreas del desglose «__proto__», «constructor»… ya no se guardan como permisos. Las
  imágenes se revisan por su cabecera (PNG, JPEG o WebP de verdad, hasta 40 megapíxeles). El servidor avisa si llegan
  cabeceras de proxy sin `TRUST_PROXY=1`.

### Menús de las etapas en el teléfono
- Con la barra de etapas desplazada (por ejemplo, después de tocar Producción o Rodaje), el menú se abría por detrás
  de la página: el desvanecido del borde de la barra también lo tapaba. Ahora el desvanecido se quita mientras el
  menú está abierto.

### Exportar una parte: escenas, jornadas o páginas
- En el menú Exportar de todas las pestañas, cada PDF tiene **«Elegir…»**: todo, algunas escenas («1-5, 8, 12A»; un
  rango incluye las escenas con letra), algunas jornadas («1-3») o algunas páginas («2-4, 7»). El clic de siempre
  sigue exportando todo.
- **Escenas:** hojas de desglose (con o sin fotos), storyboard (con o sin planta), guion técnico, guion, guion rayado y
  hoja de script. **Jornadas:** plan de rodaje y hojas de llamado. **Páginas:** todos los PDF.
- Hay un botón para la escena o la jornada que estás mirando («Esta escena (12)»). La ventana recuerda lo último que
  elegiste en cada documento, y el archivo lleva la parte en el nombre (`_desglose_escenas_2-4.pdf`).
- Con escenas o jornadas, el documento sale solo con eso y numerado de nuevo (las hojas de desglose sin el reporte de
  elementos). Con páginas, cada una conserva su número. En el guion, las páginas son las del guion (12, 12A…), sin la
  carátula.
- En la web con cuentas, el PDF del guion sale sin marca de agua en todos los planes, como dice la tabla de planes.

### Inicio, «Nuevo» y «Mis guiones»
- **Inicio:** al entrar a la app se ven tus proyectos y guiones, del último que abriste al primero, con su tipo
  (guion o producción), cuándo lo abriste, si es de equipo y dónde se abre. Las invitaciones van arriba y los
  archivados aparte. Al tocar uno se abre **donde lo dejaste**: la misma pestaña y la misma escena (en este navegador).
  Un guion del plan Guion siempre se abre en el guion. El logo de la barra (y «Inicio» en Proyectos) vuelve aquí; un
  enlace a un proyecto (`?p=…`), un archivo abierto en el escritorio o la vuelta del pago abren directo el proyecto.
- **«Nuevo» ▾** (el botón rojo): **Guion** crea uno en blanco y abre el editor listo para escribir; **Proyecto** crea
  un proyecto de producción (en el plan Guion abre los planes con la prueba de Pro). Ya no aparece la ventana que
  preguntaba «¿producción o solo guion?». Los nombres no se repiten («Guion sin título 2»).
- **«Mis guiones»** en la barra de la pestaña Guion (y en la pantalla del guion vacío): cambiar de guion o empezar
  uno nuevo sin pasar por Proyectos.

### Versión nueva con la pestaña abierta
- El servidor dice su versión en cada respuesta. Si se actualizó mientras una pestaña seguía abierta, esa pestaña
  (que tiene el código anterior) se recarga sola si está en Inicio sin nada por guardar; si no, avisa con «Recargar».
  Al volver a la pestaña después de un rato también se revisa.

### Torso: hacia adelante y no al costado
- Al arrastrar el punto del torso (o de la cabeza, un brazo o un muslo), si la cámara ve los dos movimientos casi en
  la misma línea (de tres cuartos, inclinarse adelante y al costado mueven el cuello casi igual) o uno va hacia la
  cámara, gana el primero (inclinarse hacia adelante) y el otro pasa al arrastre perpendicular. Arrastrar hacia donde
  mira la figura la inclina hacia adelante; antes, a veces se iba de costado. De frente, arrastrar hacia abajo inclina
  hacia adelante (y la cabeza mira hacia abajo).

### Calendario: vista «Meses»
- **«Meses»** es ahora la vista de entrada del calendario (con «Línea de tiempo» y «Tablero» al lado; la app recuerda
  la última que usaste). Cada mes es una hoja como la de un calendario de pared: el nombre del mes en una franja de
  color con el año al lado, los días de la semana cada uno en un color del tema, los días con su número en la
  esquina (los del mes de al lado, más claros; hoy, resaltado) y una fila de **Notas** abajo, para todo el equipo.
- Las tareas y las jornadas de rodaje son barras de color que cruzan los días y siguen en la semana de abajo (las
  jornadas seguidas, en una barra: «Rodaje · J1–J3»). Si en una semana no caben todas, el día muestra «+2».
- Se ven **1, 2, 3 o 4 meses** a la vez (en pantalla ancha 2×2 o en fila; en el teléfono, uno debajo del otro). Se va
  a cualquier fecha con ‹ ›, con «Hoy» o tocando el nombre del mes (mes y año, sin límite).
- Al **elegir una tarea que dura varios meses**, la vista se abre hasta verla entera (hasta 4 meses; si dura más,
  desde su comienzo).
- Con el mouse: arrastrar una barra la mueve; sus bordes cambian el inicio y el fin; arrastrar sobre los días crea una
  tarea; doble clic en una barra la abre y en un día vacío crea una de un día; el número de un día abre lo de ese día.
  En el teléfono, mantener el dedo levanta la barra.
- Nuevo PDF **«Calendario por meses»**: una hoja por mes, como en la app, con sus notas.

### Colores: Pastel de entrada, estudio tonal, Monocromo y letras
- **Pastel** es el tema de siempre: lo tienen los proyectos sin colores propios, los nuevos y las cuentas nuevas.
  «Restablecer» vuelve a Pastel; **Original** (los colores de antes) sigue en la lista. Los proyectos con colores
  elegidos o con otro tema no cambian.
- **Estudio tonal:** cada pestaña tiene una escala de su mismo matiz (OKLCH, pasos iguales de luz): la barra, al pasar
  el mouse, lo elegido (más vivo, sin mezclar con gris, con la letra que se lee por contraste), el tono profundo, la
  mesa y el papel. Se usa en las pestañas, las etapas, los botones de modo, los menús y lo elegido, con cualquier tema
  y con colores propios (una barra de color oscuro lleva letra clara).
- Tema nuevo **Monocromo** (en grises, para imprimir en blanco y negro). Elegir un tema en la apariencia oscura pasa a
  la clara para verlo, con «Volver a oscuro» en el aviso.
- En «Colores y temas»: **Tipografía** y **Líneas** (ver más abajo, «Fondos blancos y personalización simple»).
- **Clic derecho** (en el teléfono, mantener el dedo) sobre la barra de una pestaña, una pestaña, una etapa o una barra
  del calendario abre su color: los del tema, más colores, otro a elección y «Restablecer». Si no puedes editarlo, lo
  dice.
- El estilo **Clásico** también lleva los colores del tema: la línea de la pestaña elegida, lo elegido en la barra y un
  filete del color de la pestaña.
- **Los PDF salen como la pantalla de quien exporta:** el tema del proyecto (pestañas, leyendas y resaltados), las
  letras, el tono y el grosor de las líneas y las barras (de color, suaves o blancas). Revisado documento por
  documento: guion rayado, desglose, storyboard, plan, días por actor (inicio y fin en los tonos del plan), calendario
  (las dos vistas), hoja de llamado, presupuesto, hoja de script, partes, scouting, casting y Construcción.

### Hoja de llamado, Construcción y barras
- **Hoja de llamado:** dos columnas con los anchos de arriba (ancha y angosta): Reparto y debajo Punto de encuentro;
  Citación del equipo y debajo Movilidad. Las dos terminan parejas (la última caja de la más corta se estira). En el
  teléfono, una columna como antes.
- **Construcción · Tarjetas:** cada acto es una franja de lado a lado (Acto I, debajo el II, el III) y sus tarjetas van
  en filas, de izquierda a derecha, en el orden de lectura; se arrastran dentro del acto y de un acto a otro como
  antes. Cada acto con un fondo apenas distinto (el mismo matiz, un paso de luz). En el teléfono, una tarjeta por fila.
- **Guion rayado:** «Etiquetas» y «Rayado» (que se prenden cada uno por su lado) quedan separados con el mismo espacio
  que el resto de la barra.

### Fondos blancos y personalización simple
- **Fondos siempre blancos** (en la apariencia clara, en los dos estilos): la mesa, los paneles y el papel ya no llevan
  el velo del color de la pestaña; los paneles se separan con una línea fina. El color queda en las pestañas, las
  barras, las etiquetas y las leyendas. La cabecera de la hoja de llamado, en blanco con su recuadro del llamado.
- **Campos para escribir en gris neutro** (sinopsis, perfil buscado, datos de la locación y del reparto…), no del
  color de la pestaña. Los actos de Construcción se distinguen con un gris apenas distinto.
- **Monocromo en todo lo que lleva color:** las tiras de día y noche y los resaltados del plan, las etapas, las
  etiquetas del guion rayado y las cajas del desglose, el calendario (las fases con trama), los días por actor, las
  tramas de Construcción y los responsables de las tareas, en la pantalla y en los PDF. Los colores guardados no se
  pierden: con otro tema vuelven.
- **La letra sobre un color oscuro pasa sola a blanca** (una pestaña, una etapa, una barra, una caja del desglose, una
  columna del tablero o un color de la leyenda). Ya no se elige el color de las letras.
- **Marcador:** el puntero es la flechita de siempre, pintada del color de la categoría, sin contorno.
- **Tipografía:** cinco, de la más formal a la más informal: Formal (Lora), Sobria (IBM Plex Sans), Neutra (Archivo,
  la de siempre), Redonda (Nunito) e Informal (Comic Neue). Cambia la letra del programa y de los PDF; el guion sigue
  en Courier. Las cinco van dentro del programa (sin internet en el escritorio); licencia SIL OFL 1.1.
- **Personalización más simple:** en orden, el tema, «Colores de cada pestaña» (plegado, justo debajo), la tipografía
  («Se aplica al programa y a los PDF») y, en tu pantalla, barras (color, suaves o blancas) y líneas (finas, normales
  o gruesas: el grosor y el tono juntos). Las muestras de letra sin recuadro: la elegida, con fondo gris suave y el
  nombre en negrita. Los ajustes de antes se convierten solos.
- **Ayuda y soporte** (el ícono junto a «Compartir»): cómo se usa la pestaña abierta, preguntas frecuentes, escribir a
  soporte (al correo `SUPPORT_EMAIL` del servidor, con la versión y la pestaña), volver a ver los consejos y, en la
  web, el libro de reclamaciones.

### Inglés (con los términos de Hollywood)
- **Idioma junto a «+ Nuevo»:** Español / English (en el teléfono, en el menú de ayuda, porque en la barra no cabe).
  Se recuerda en el equipo y, en la web, en la cuenta (`PUT /api/me/lang`); en un equipo nuevo se usa el de la cuenta.
  También vale `?lang=en` en la dirección.
- **Todo el programa en inglés:** pestañas, menús, avisos, ayudas, títulos y descripciones; los PDF (encabezados,
  tablas, leyendas), los Excel (hojas, celdas y título) y los nombres de los archivos
  (`_call_sheet_day_1.pdf`, `_shooting_schedule.xlsx`…). Fechas y horas en el formato de EE. UU. (Mon, Oct 26;
  10/26/2026), los días de la semana en inglés y las jornadas abreviadas D1, D2.
- **No es una traducción literal:** se usan los nombres del set de Hollywood: Lined Script, Breakdown, Shooting
  Schedule, Call Sheet, Day Out of Days (con sus códigos SW, W, H, WF, SWF), Script Supervisor Report, Daily Production
  Report, Shot List, Step Outline, Treatment; Cast, Background, Props, Set Dressing, Picture Vehicles; WS, MS, MCU, CU,
  ECU, OTS; las etapas Writing · Development · Previs · Prep · Shoot. El glosario para revisar está en
  `i18n/glosario-en.md` (manda sobre todo lo demás; las correcciones sueltas van en `i18n/en-manual.json`). Al cambiarlos
  hay que volver a armar el programa (`sh build.sh`).
- **Lo que escribe cada persona no se traduce:** el guion, los nombres, las notas, las sinopsis, los títulos de las
  tareas. Lo que el programa crea en inglés queda en inglés: el proyecto de ejemplo («The Last Show», con su guion,
  planos, sinopsis, construcción y notas), las líneas del presupuesto (en US$ y con «Sales tax»), las tareas del
  calendario, los actos y las tramas.
- **Desglose automático también para guiones en inglés:** el programa reconoce el idioma del guion y busca utilería,
  vestuario, vehículos, efectos, figuración… con su diccionario en inglés (y las franjas MORNING, EVENING, SUNSET…).
- **Por ahora, solo inglés.** Los correos del servidor siguen en español; los otros idiomas, más adelante.
- **Arreglos de paso:** el subtítulo del parte diario se lee «Jornada 1 de 2 · fecha».
- **Teléfono · el menú de cada etapa** (Guion, Desarrollo, Imagen, Producción, Rodaje) se despliega justo debajo de
  la etapa, con sus pestañas y el color de cada una. En el iPhone el menú desplegable no llegaba a verse: ahora va
  fuera de la barra que se desplaza. En la computadora sigue siendo el desplegable de siempre, y ya no se cierra solo por el rebote de
  la barra al final ni porque el navegador muestre u oculte su barra.

### Teléfono: la pantalla de trabajo, limpia
- **Barra de arriba:** el logo, el título del proyecto (ahora se lee entero o casi), las notas, «+» y un menú (la
  cuenta, o «⋯» si no hay cuenta) con Proyectos (y Compartir), el estado del guardado, Ayuda y soporte e Idioma. Un
  punto amarillo avisa si algo no se guarda.
- **Las barras se esconden al bajar:** al desplazarte por el trabajo se ocultan la barra de arriba y la de las etapas;
  vuelven al subir un poco, al llegar arriba o al cambiar de pestaña. Son unos 110 px más para el trabajo.
- **La barra de cada pestaña, en una línea:** las vistas en un selector cuando no caben (Construcción, Calendario,
  Desglose); lo de menos uso pasa al «⋯» de la barra (Inicio del rodaje y «+ Jornada» en el Plan; «+ Tarea» y «Hoy» en
  el Calendario; Personajes en el Storyboard; «Confirmar sugeridos» en el Desglose). El «⋯» queda siempre a la vista.
- **Leyenda plegada:** un botón con sus colores en la barra; se abre al tocarlo.
- **Consejos fuera de la pantalla:** los recuadros de consejos y el aviso de las tarifas de ejemplo no ocupan lugar;
  se leen en la ayuda de la pestaña («Consejos», también en la computadora).
- **Cifras en una línea:** el resumen del Plan y el avance de la Hoja de script en una tira; en el Presupuesto, el
  total y «Por partida» se pliegan (se abren al tocarlos).
- **A todo el ancho:** sin el marco ni el margen del panel, menos relleno; fuera los títulos repetidos (el del
  proyecto en la hoja de llamado y en la hoja de desglose). El guion, con la hoja al ancho de la pantalla.
- **Menús que cuelgan:** lo que se abre desde una barra (la de arriba, las etapas, la de cada pestaña) se despliega
  debajo de su botón; lo demás sigue subiendo desde abajo.
- En la computadora no cambia nada. Ejemplos en un teléfono de 390 px: el Plan muestra su primera jornada a 237 px de
  arriba (antes a 650), el Calendario su mes a 173 px (antes a 445).


### Etapas con íconos y menú vertical a la izquierda
- **Íconos propios en el estilo «línea y forma»:** cada uno es una forma sólida con su sombra corrida, en tres tonos
  del color de su etapa. Los de las etapas llevan además líneas finas:
  - Guion: las hojas del guion.
  - Desarrollo: la carpeta del equipo, con la ficha de un miembro asomando.
  - Imagen: el encuadre.
  - Producción: la tablilla.
  - Rodaje: la claqueta.
- **Las 14 pestañas, con su ícono simplificado** (sin líneas sueltas): Construcción, Guion, Proyecto, Guion rayado,
  Desglose, Scouting, Casting, Storyboard, Animatic, Plan de rodaje, Calendario, Presupuesto, Hoja de llamado y Hoja de
  script. Tienen versión clara, oscura y monocromo.
- **Computadora: una franja vertical a la izquierda** con solo los íconos de las etapas, y ya no hay fila de etapas
  arriba.
  - Al tocar una etapa, a su lado se abre la lista de sus pestañas con sus íconos.
  - Al elegir una pestaña, la lista se cierra y queda marcada la etapa, con el cuadro pastel de su pestaña.
  - El nombre aparece al pasar el puntero.
  - Con el teclado: ↑ ↓ pasan de una etapa a otra, → (o Intro) abre la lista y ← o Esc la cierra.
  - El «⋯» de la vista (apariencia y pestañas visibles) queda al pie de la franja.
- **El nombre de la pestaña abierta, al inicio de su barra de color** (en pantallas de más de 1100 px).
- **Teléfono: los cinco íconos en la barra de arriba, sin el título del proyecto.**
  - La lista de cada etapa cuelga debajo de su ícono, con los íconos de las pestañas.
  - «Deshacer» aparece solo cuando hay algo que deshacer, y entonces los íconos se juntan para que quepa todo (también
    en pantallas de 360 px).
  - «Vista» (apariencia y pestañas visibles) pasa al menú de la cuenta.
- **Lo elegido en la barra de cada pestaña, con solo una línea debajo** (Jornadas, Meses, Etiquetas…), en el tono
  hondo de la pestaña y sin fondo de color. En el modo oscuro la línea va en el color de la pestaña.
- **La barra de cada pestaña, en un gris muy suave:** el color de la pestaña pasa a la raya de 4 px bajo el botón
  elegido. Al pasar el puntero sobre los demás botones aparece un velo suave del mismo color.
  - Quien prefiera las barras de antes las elige en «Colores y temas… › En tu pantalla › Barras»: Gris (por defecto),
    Color, Suave o Blanca. Con las de color, la raya va en el tono hondo de la pestaña.
  - Este cambio de ajuste se hace una sola vez: lo que estaba guardado como «Color» de antes pasa a Gris.
- **Franja de la computadora más grande:** íconos de 52 px (el doble) y el doble de espacio entre ellos (12 px).
  La etapa elegida sigue marcada con el cuadro pastel de su pestaña.
- Si el nombre de la pestaña haría que la barra pase a dos líneas, no se pone.
- **Íconos de las etapas más simples:** sin las líneas finas ni los puntos sueltos. Quedan solo las formas sólidas,
  su sombra y los recortes.
- **La etapa elegida se destaca sin cuadro de fondo:**
  - Está en su color, crece al tamaño de antes y lleva una línea del color de su pestaña, un poco más honda: al
    costado derecho en la computadora y debajo en el teléfono.
  - Las demás etapas quedan con poco color (−76 %) y más claras. Son un 20 % más chicas: 42 px en la franja, que
    mantiene su ancho, y 21 px en el teléfono.
  - En la lista de la etapa elegida todas sus pestañas van en su color. En las otras etapas se ven apagadas, como su
    ícono, y recuperan el color al pasar el puntero.
- **El ícono salta:** al pasar el puntero (o al tocarlo en el teléfono), da un pequeño salto con zoom. Al elegir una
  etapa salta y queda más grande. No salta con «reducir movimiento».
- **El botón elegido de la barra** (Jornadas, Etiquetas…) lleva un velo muy suave del color de la pestaña en todo el
  botón y la raya de abajo un 10 % más oscura.
- **Hoja de llamado alineada:** el recuadro de arriba, la nota para el equipo, los títulos, las tablas (cronograma,
  reparto), la citación del equipo, la movilidad, el cierre de jornada y la próxima jornada comparten el mismo margen.
  Las franjas de color quedan a plomo: 20 px en la computadora y 14 px en el teléfono.
- **Arreglo · el menú de una etapa en el modo oscuro mientras se escribe:** ya no queda transparente ni se cierra
  antes de poder elegir una pestaña.

### Encabezados como en el guion, fechas a mano, Animatic y la marcha de las figuras
- **Los encabezados de escena se escriben tal cual en el guion:** en Courier y en mayúsculas, enteros (pasan a la
  línea siguiente, sin «…»). Debajo va una línea que cuenta la escena: su sinopsis o, si no tiene, el comienzo de la
  primera acción.
  - En la lista de escenas (Guion, Guion rayado y Desglose), el Storyboard, el Plan de rodaje, la Hoja de llamado
    (en las escenas que van por planos) y la Hoja de script.
- **Fechas escritas a mano:** el «Inicio» del plan se escribe como se dice: «19/10/2026», «19-10», «19 oct»,
  «19 de octubre», «lunes 19», «el jueves que viene», «hoy», «mañana». Lo que no se entiende queda escrito (no se
  borra) y el campo se marca en rojo para corregirlo; Esc vuelve a la fecha de antes.
  - El botón del calendario abre un mes grande, con los días de rodaje marcados y atajos: hoy, mañana, el próximo
    lunes y una semana después. Con el teclado: flechas para moverse, Re Pág / Av Pág para cambiar de mes.
  - «Cambiar la fecha…» de cada jornada usa el mismo calendario.
- **Hoja de script:** los cuadros de los planos son blancos (marcados, en verde con su visto), y las tablas de las
  escenas van al mismo margen que los datos de la jornada.
- **El nombre de la pestaña, separado del resto de su barra** por una línea fina que no llega a los bordes.
- **Hoja de llamado:** la cruz de «Movilidad» queda alineada con las demás.
- **Construcción · Biografías:** la barra ya no se corre al abrir la lista de personajes; la lista va dentro de la
  misma tarjeta, debajo de la barra (en el teléfono sigue abriéndose con «Personajes»).
- **Animatic:**
  - Sin líneas claras alrededor de la mesa de montaje (ni entre el visor y las herramientas).
  - La línea de tiempo se contrae: con el botón al final de la fila de herramientas, o arrastrando el separador
    hacia abajo, queda una franja fina con el color de cada escena y el número de cada plano, y el visor gana el
    espacio. Arrastrando hacia arriba (o con el mismo botón) vuelve. La computadora recuerda cómo se dejó.
- **El logo, a lo ancho de la franja de las etapas** en la computadora, con la línea de la franja hasta arriba.
- **Modo oscuro:**
  - Al escribir, todo conserva sus colores (ya no se apaga ni pasa a gris lo de alrededor de la página).
  - La etapa elegida se distingue mejor: las demás más apagadas, la elegida sobre un gris apenas más claro y su
    línea más clara que el color de la pestaña.
  - Negros y grises neutros (sin tinte azul ni verde) en el cierre de la hoja de llamado, la pista de música del
    Animatic y la franja de las claves del editor de planos.
- **Editor de planos:**
  - Un toque de Ctrl sola (⌘ en la Mac) pasa de la vista de la cámara a la vista libre y de vuelta, como el botón.
    Ctrl con otra tecla, con la rueda o con un clic sigue haciendo lo de siempre; escribiendo en un campo, nada.
  - Doble clic (o doble toque) sobre la figura suelta la parte del cuerpo elegida y deja elegida la figura entera.
- **Las figuras caminan y corren con naturalidad** al desplazarse entre claves:
  - El largo del paso sale de la altura de la figura y el pie que apoya queda quieto en el suelo (no patina).
  - Caminando: el talón toca primero, el pie apoya plano y el talón se levanta antes de despegar; la rodilla se
    dobla al pasar la pierna; la cadera sube y baja, gira y se inclina un poco, y el tronco gira al revés.
  - Los brazos van opuestos a las piernas, con el codo algo doblado (más adelante que atrás); las manos, sueltas.
  - Corriendo: paso más largo, tronco inclinado, rodillas altas, un vuelo sin pies en el suelo y rebote al caer;
    codos a unos 90° con un braceo fuerte y las manos cerradas.
  - Al empezar y al terminar el recorrido la marcha entra y sale de a poco.
