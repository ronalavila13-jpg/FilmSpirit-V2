# Lote AD · zoom con dos dedos y exportar una parte del animatic (27-oct-2026)

## 1. Zoom con dos dedos en el celular (Guion rayado, Guion y editor)

**Qué pasaba.** En el iPhone, al pellizcar la hoja del Guion rayado, la letra no cambiaba, la hoja se corría hacia
un lado y la barra de arriba se escondía y volvía. Lo reproduje igual en el navegador de prueba y eran tres cosas:

- **La letra no cambiaba:** en pantallas de teléfono el tamaño de la hoja lo fijaba el estilo de la página (para que
  la hoja quepa a lo ancho) y no dejaba que el zoom lo multiplicara. El zoom calculaba que la hoja había crecido,
  movía el desplazamiento a donde «debía» estar el texto y por eso la hoja saltaba arriba y abajo.
- **La hoja se corría de lado:** la capa de las anotaciones a mano (y la de las notas al margen) es más ancha que la
  hoja. Aunque no se vea, hacía que la hoja se pudiera desplazar hacia la derecha: quedaba cortada a la izquierda y
  con un espacio vacío a la derecha. Pasaba también con un solo dedo y en la computadora.
- **La barra de arriba se escondía:** en el teléfono la barra se esconde al bajar por el trabajo. Los saltos del
  zoom la hacían esconderse y volver.

**Cómo queda.**
- Al pellizcar se agranda o se achica **solo la hoja**, alrededor del punto entre los dedos. Mientras los dedos se
  mueven la hoja solo se escala, sin rearmar el texto, así no da saltos aunque el guion sea largo. Al soltar, la letra
  queda en su nuevo tamaño y lo que estaba entre los dedos sigue ahí. Va de 50 % a 400 %.
- Con dos dedos sin separarlos, la hoja se desplaza.
- La barra de arriba no se mueve durante el gesto y la página entera no se corre ni se amplía (en el iPhone el
  navegador ya no hace su propio zoom sobre la hoja).
- Con un dedo la hoja sube y baja normal: al 100 % ya no se puede correr de costado. Con zoom, de costado se llega
  justo hasta el borde de la hoja.
- Al llegar arriba o abajo del todo, solo rebota la hoja, no la pantalla entera.
- **Editor del guion (pestaña Guion):** ahora también se pellizca. Ahí la hoja sigue al ancho de la pantalla y el
  texto se acomoda a la nueva letra. En el iPhone la letra del editor no baja de su tamaño normal (con letra menor
  que 16 px, el iPhone agranda la página entera cada vez que tocas para escribir).
- El guion AV (de dos columnas), rayado y en el editor, también cambia de letra con el pellizco.
- **Anotar a mano:** con el lápiz activo, un dedo dibuja y dos dedos acercan o desplazan, sin dejar rayas.
- **Calendario:** su pellizco (ancho de los días y alto de las filas) sigue igual, pero en el iPhone tampoco deja que
  el navegador amplíe la página ni esconda la barra.
- **Notas al margen en el teléfono:** su marca quedaba fuera de la hoja (solo se veía corriéndola de lado) y el
  resaltado caía unas letras más a la derecha. Ahora la marca queda en el borde de la hoja y el resaltado sobre la
  palabra.

## 2. Exportar una parte del animatic (I y O)

- En la línea de tiempo, **I** marca la **entrada** y **O** la **salida** donde está el cabezal. También están los
  botones **{** y **}** en la barra de herramientas (para el iPad y el teléfono, sin teclado).
- La parte elegida se ve **sombreada** de arriba abajo, con una franja más fuerte sobre la regla. La **×** junto a la
  salida quita las marcas.
- Se puede poner una sola: solo la entrada va hasta el final; solo la salida, desde el comienzo. Si pones la entrada
  después de la salida (o al revés), la otra se quita y te avisa.
- **Mayús + I** y **Mayús + O** llevan el cabezal a la entrada o a la salida.
- Las marcas se guardan en el proyecto: siguen ahí al volver a abrirlo. No son un paso de deshacer: deshacer una
  edición del montaje no las mueve.
- I y O no hacen nada mientras escribes en un campo (la descripción de un plano, el texto de un título). Ninguna otra
  función usaba esas teclas.
- **Al exportar el video** (Exportar → Video) primero eliges qué: **Todo**, **De la entrada a la salida** (elegido
  por defecto si hay marcas) o **Una escena** (eliges cuál en la lista; si el montaje la parte en pedazos, se graban
  seguidos). Después la ventana de exportación es la misma de siempre, y el video graba solo esa parte, así que
  tarda lo que dura. El archivo lleva la parte en el nombre: `…_animatic_00m02s-00m05s.webm` o
  `…_animatic_escenas_7.webm`.

## Cómo lo probé

- Pruebas nuevas en `test/zoom-ad.test.js`: el pellizco con una hoja de prueba (acercar, alejar, el punto bajo los
  dedos, dos dedos que desplazan, los límites, la página que no se mueve, la barra que no se esconde) y las marcas
  del animatic (la parte marcada, marcar en un cuadro, qué se graba de cada opción, el tiempo mientras graba). Todas
  las demás pruebas siguen pasando (salvo `pdf.test.js`, que ya fallaba antes por el módulo canvas).
- En el navegador, con un teléfono de 390 × 844 con pantalla táctil y pellizcos de dos dedos de verdad (no
  simulados en el código): Guion rayado, Guion (editor), guion AV, anotar a mano, notas al margen y calendario. En
  todos: la letra cambia, el texto bajo los dedos se queda, la página no se mueve ni se amplía y la barra sigue a la
  vista. De control: pellizcar sobre la barra de arriba sí amplía la página, o sea que la prueba detecta el zoom del
  navegador. También el caso del iPhone en que un dedo ya estaba desplazando cuando llega el segundo.
- En la computadora: la hoja centrada como antes, los botones − y + de zoom (con zoom se llega al borde izquierdo de
  la hoja) y las notas al margen en su columna.
- Animatic con el proyecto de ejemplo: marcas con el teclado y los botones, guardar, volver a abrir el proyecto (las
  marcas siguen), deshacer una edición (no se mueven), escribir «io» en la descripción (se escribe y no marca), y la
  ventana en inglés. Exporté de la entrada (2 s) a la salida (5,5 s): el primer cuadro del video marca 00:02:00, el
  último 00:05:12 y dura 3,5 s. Exporté la escena 7: graba solo de 155 a 173 s del montaje.
- No pude probar en WebKit (el motor del iPhone): no se pudo descargar en este equipo. Lo del iPhone está hecho con
  lo que el iPhone respeta (touch-action, cancelar el gesto con dos dedos y los gesture de Safari, y que la hoja no
  rebote la pantalla), pero conviene que lo pruebes en tu iPhone.
