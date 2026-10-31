# Lote AD · dibujo 2D de las viñetas (27-oct-2026)

Rama `lote-ad-dibujo`. Las cuatro observaciones sobre el editor 2D (Storyboard → una viñeta → «2D»). Todo está en
`src/s2d-editor.js`, con sus estilos en `src/shell.html` y su inglés en `i18n/en-manual.json`. Los dibujos guardados
se abren igual que antes: no cambió nada de lo que se guarda.

## 1. Bote de pintura (tecla F)

Herramienta nueva entre el Borrador y el Lazo, con su ícono de bote.

- **Cómo se usa:** toca (o haz clic) dentro de una zona cerrada por líneas y se rellena con el color elegido, en la
  capa activa. En el celular basta con tocar; con dos dedos se pellizca y no rellena.
- **El borde** son las líneas de todas las capas visibles: dibujas el contorno en una capa y pintas en otra que
  está debajo. Las fotos de referencia y la Viñeta 3D no hacen de borde (si no, la pintura chocaría con cada detalle
  de la escena). Si la capa activa es una foto, cuenta lo de la foto misma.
- **«Solo esta capa»:** el borde es solo lo que hay en la capa activa.
- **«Tolerancia»** (20 % de entrada): toma también los colores parecidos al que tocaste.
- **«Cerrar huecos»** (4 px de entrada, hasta 24): una línea de boceto con aberturas chicas no deja escapar la
  pintura a toda la hoja. Si se escapa igual, sube este valor y vuelve a tocar (Ctrl + Z deshace).
- **Sin filo blanco:** el relleno entra 2 px bajo la línea. Si la línea está en la misma capa, la pintura va por
  detrás de ella; si está en una capa de debajo, solo se cubre su borde suave (la línea se sigue viendo entera); el
  relleno no asoma del otro lado de una línea fina.
- **Cambiar el color de un relleno:** toca otra vez con otro color; también cambia la parte que estaba bajo la línea.
- Con una **selección del lazo**, rellena solo dentro de ella.
- No pinta en capas ocultas, bloqueadas o con zoom (avisa por qué). Se deshace y se rehace como un trazo.
- Alt + clic toma un color de la hoja (como con los pinceles).

## 2. El Lazo

- El Lazo ya no cambia solo: sigue elegido y **cada arrastre dibuja un lazo**. Ya no aparece la caja al cerrar el
  lazo, y empezar un lazo cerca de la selección ya no la agranda ni la mueve.
- **Un lazo nuevo se suma** a la selección. **Con Ctrl apretado antes de empezar a trazar, resta** (el lazo que resta
  se ve en rojo mientras lo trazas). La selección puede tener varias partes y huecos, con su **contorno de hormigas**
  que camina, y lo de afuera en sombra.
- **Ctrl + clic sin arrastrar sobre la selección** muestra la caja para agrandar, achicar, girar y mover lo de la capa
  activa que está dentro. **Intro o Esc terminan** la caja (quedan los cambios; «Cancelar» del panel o Ctrl + Z los
  deshacen). La selección acompaña a lo que moviste.
- **Un clic sin arrastrar fuera de la selección, o Esc, la quitan** (Ctrl + D también).
- **Celular y tableta** (sin Ctrl): el panel muestra **«Sumar»** y **«Restar»** (qué hace el próximo lazo) y
  **«Expandir»** (la caja). Un toque fuera de la selección la quita. Estos botones aparecen cuando dibujas con el dedo;
  con el mouse se ven las teclas al lado de cada botón.
- **Copiar, cortar, borrar y pegar** (antes no había): Ctrl + C, Ctrl + X, Supr y Ctrl + V, o los botones del panel.
  Lo pegado aparece en el mismo lugar, con la caja para moverlo, en la capa activa (sirve también en otro plano).
  Si copias una imagen desde afuera, Ctrl + V la sigue poniendo en una capa nueva, como antes.
- Lápiz, tinta, pinceles, marcador, borrador y el bote pintan solo dentro de la selección combinada.
- «Seleccionar todo» (Ctrl + A) rodea lo dibujado en la capa activa, sin abrir la caja.
- Cambiar la selección (sumar, restar, quitarla) también se deshace con Ctrl + Z, pero no cuenta como un cambio del
  dibujo (no pide confirmación al cancelar).

## 3. Flechas nuevas sin contorno

Cada flecha nueva sale **sin contorno**, aunque la anterior lo tuviera. Las flechas que ya existen quedan tal cual, y
«Contorno: Sin / Blanco / Oscuro» se sigue eligiendo en cada flecha (aparece al elegirla, justo después de trazarla).
En el panel de la herramienta, sin una flecha elegida, ya no está el contorno (no hacía nada para las nuevas).

## 4. «Agregar imagen» a la vista

En Capas, arriba de la lista, un botón grande con ícono y texto, **«Agregar imagen»**, y debajo la línea «También
puedes arrastrarla a la hoja o pegarla con Ctrl+V». El ícono chico junto al «+» ya no está.

## Cómo lo probé

- `test/dibujo-ad.test.js` (nueva): el relleno (zona cerrada, aberturas con y sin «Cerrar huecos», selección, misma
  capa, línea de una capa de debajo, cambio de color, tolerancia, que no asome de una línea fina), el contorno de una
  selección de varias partes con hueco, el lugar y la tecla de la herramienta, las flechas y el botón de imagen.
- Todas las pruebas de la app pasan, salvo `test/pdf.test.js`, que ya fallaba antes (le falta el módulo canvas).
- En el navegador (Chromium), pestaña Storyboard → una viñeta → 2D, con el mouse (1440 × 900) y con el dedo
  (celular 390 × 844): el bote con un toque y pellizcar sin rellenar; relleno en otra capa sin filo blanco (mirado
  con zoom ×8); el lazo sumando, restando con Ctrl y con «Restar», la caja con Ctrl + clic y con «Expandir», mover,
  Intro, Esc, clic fuera; copiar, cortar, borrar y pegar; pincel dentro de la selección; flechas; «Agregar imagen»
  con un archivo; guardar. Deshacer y rehacer en todo lo nuevo. En inglés y con el tema oscuro, sin errores en la
  consola.
- Tiempos en esta máquina: un relleno de toda la hoja tarda unos 100 ms; armar la selección después de cada lazo,
  entre 25 y 50 ms.
