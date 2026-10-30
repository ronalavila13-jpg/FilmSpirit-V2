# Lote AA · zoom en las imágenes de fondo (26-oct-2026)

Base: lote Z (que trae los lotes T a Y). Rama `lote-aa`.

**Cómo aplicarlo.** El `filmspirit-servidor.zip` de este lote trae todo lo anterior más este cambio. En la VPS, como
siempre: `cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
Viene sin los maniquíes 3D (el actualizador conserva los instalados). No hay variables ni migraciones nuevas.

## Zoom en las imágenes de fondo (editor 2D del plano)
- En Capas, al elegir una capa de imagen (una foto de referencia o de fondo), debajo de Opacidad hay un deslizador de
  **Zoom**, de 100 % a 400 %: la foto se acerca alrededor del centro del cuadro, sin estirarse.
- Con zoom, la herramienta **Mover** (la flecha, V) arrastra la foto para elegir qué parte se ve. La foto siempre cubre
  el cuadro (no se puede correr de más).
- **Encuadre original** la devuelve a como estaba. Todo se deshace con Ctrl+Z.
- No recorta ni cambia la foto guardada: el zoom se puede cambiar o quitar cuando se quiera. Vale también para las
  fotos que ya estaban cargadas.
- Si la capa está en «Igual en todos los cuadros», el zoom es el mismo en todos.
- Se ve igual en la viñeta del storyboard, en el editor 3D (vista de cámara), en el animatic y en el PDF.
- Sobre una foto con zoom no se pinta ni se usa el lazo (la foto se ve más grande de lo que está guardada): un aviso
  pide dibujar en otra capa o volver el zoom a 100 %.
- La foto se guarda a la resolución de la hoja, así que con mucho zoom se ve más suave.

## Pruebas
- Nueva: `test/zoom-aa.test.js` (el zoom, el encuadre que siempre cubre el cuadro y la firma de la viñeta).
- Todas las pruebas de la app pasan, salvo `test/pdf.test.js`, que ya fallaba antes (le falta el módulo canvas). Las
  del servidor pasan todas.
- En el navegador: soltar una foto, zoom al 200 %, correrla con Mover, el aviso al pintar, deshacer y rehacer, guardar
  y ver la viñeta del storyboard con el zoom, sin errores.
