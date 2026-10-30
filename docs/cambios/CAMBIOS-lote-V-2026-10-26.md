# Lote V · clonar los atributos de un plano en otros (26-oct-2026)

Base: lote U (trae también el lote T). Solo la app (storyboard).

**Cómo aplicarlo.** El `filmspirit-servidor.zip` de este lote trae los lotes T, U y V. Igual que siempre, en la VPS:
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
El zip viene sin los maniquíes 3D: el actualizador conserva los que ya están instalados. No hay variables nuevas. La base
de datos suma sola, al arrancar, la columna de la racha de escritura del lote U (migración 10; el actualizador respalda
antes). Probado actualizando desde una base de la versión anterior (9 → 10).

- **Elegir viñetas**: **Ctrl+clic** (⌘ en Mac) o Mayús+clic en una viñeta la elige o la suelta, sin abrir su editor. Se
  pueden elegir viñetas de cualquier escena. En el teléfono: «⋯ › Elegir para clonar». Las elegidas llevan borde rojo y
  fondo tenue; abajo aparece una barra con cuántas son, sus códigos y «Quitar». Esc o un clic en un espacio vacío sueltan
  la selección (Esc primero cierra el menú o la ventana que haya abierta).
- **Clic derecho en una viñeta**: abre su mismo menú «⋯» (antes no hacía nada). Con otras viñetas elegidas, lo primero
  es **«Clonar sus atributos en 1.4 y 1.5…»**.
- **La ventana «Clonar los atributos del plano 2.2»**: dice qué planos cambian (y si son de otra escena) y trae casillas
  con el valor del origen a la derecha:
  - Datos del plano: tamaño, ángulo, movimiento, soporte, lente, sonido y duración (la que muestra la viñeta, aunque sea
    la estimada).
  - Espacio 3D: **cámara 3D** (posición, altura, giro, recorrido, a quién sigue —por personaje; si no está, la figura que
    ocupa su lugar—, temblor, sensor, desenfoque y cámara B) y **puesta en escena 3D** (decorado, figuras, objetos, luces
    y su animación, con la cámara del destino). Con las dos, el 3D del destino es una copia del origen.
  - La primera vez todo va marcado; después recuerda lo de la última vez (`ls 'sbClone'`). Sin nada marcado, el botón se
    apaga. Un origen dibujado a mano no ofrece el 3D (su dibujo no se clona: para eso, «Duplicar»).
- **Qué no cambia nunca**: la descripción, el diálogo, el tramo del guion, las notas, «Rodado», la marca de máster, las
  imágenes subidas y los dibujos 2D de cada plano. Un dibujo 2D que recibe el 3D lo muestra debajo, como su capa «Viñeta
  3D» (lote U), y se sigue abriendo en el 2D; el aviso lo dice, y también si una imagen subida tapa la escena 3D del
  destino. Un plano 2D sin dibujo pasa a abrirse en el 3D. Un origen dibujado a mano sin la Viñeta 3D no ofrece el 3D.
- **Con el máster (lote U)**: un plano que recibe cámara o puesta en escena 3D queda con lo suyo y deja de seguir al
  máster («Volver a seguir al máster» en su editor lo devuelve). Si un destino es el máster de su escena, la ventana avisa
  que los planos que lo siguen también tomarán la puesta en escena.
- **Detalles**: la copia del 3D no queda ligada al origen (en el animatic no pasa a ser un inserto encima de él, a
  diferencia de «Copiar la escena del plano anterior»). Con la puesta en escena, los personajes del plano pasan a ser los
  de su escena 3D (como al guardar el editor). El lente, si se elige, va también en las claves de la escena 3D. Un plano en
  blanco que recibe el 3D vuelve a mostrarlo. Todo es un solo paso de «Deshacer».
- **Ayuda** del storyboard: «Clonar atributos». Textos en inglés en i18n/en-manual.json.

Código: `s3MapObj`, `s3TakeCam`, `s3TakeStage`, `shotHas3D`, `shotLens` y `shotCloneFrom` en src/s3d-model.js (probados en
test/clonar.test.js, `node test/clonar.test.js`); la selección, el menú (`sbMoreMenu`) y la ventana (`sbCloneDialog`,
`sbCloneApply`) en src/tab-board.js; estilos `.pcell.sel`, `.sb-selbar` y `.sb-cl-*` en src/shell.html.

Archivos: src/s3d-model.js, src/tab-board.js, src/shell.html, i18n/en-manual.json, test/clonar.test.js.
