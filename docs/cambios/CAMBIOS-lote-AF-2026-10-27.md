# Lote AF · el ejemplo en la portada y el texto de su tarjeta (27-oct-2026)

Base: lote AE (que trae el lote AD). Rama `lote-af`.

**Cómo aplicarlo.** En la VPS, como siempre:
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
Viene sin los maniquíes 3D (el actualizador conserva los instalados). No hay variables ni migraciones nuevas. Después de
instalar, recarga la portada con Ctrl+F5 si todavía ves la versión anterior.

1. **«Explorar con un proyecto de ejemplo» bien ubicado en la portada.** Ya no está entre el texto «Escribe en esta
   hoja…» y la hoja (confundía). Ahora:
   - **debajo de la hoja y su ayuda**, en su propia franja separada por una línea: «¿Prefieres ver un proyecto ya
     armado?», el botón grande «Explorar con un proyecto de ejemplo» y la nota «Sin cuenta: un proyecto completo, del
     guion a la hoja de llamado»;
   - **en la barra de arriba**, el enlace «Ver un ejemplo» al lado de «Planes» (en pantallas anchas);
   - **al final de la página**, junto a «Escribe tu primera escena», como segunda opción (con borde).
   En los cinco idiomas. En el celular, los botones ocupan todo el ancho.
2. **El texto de la tarjeta del ejemplo** (Inicio y lista de Proyectos): «Explora todas las funciones del programa»
   (en inglés, «Explore all the app's features»).

## Pruebas
- Nueva: `test/lote-af.test.js`. Todas las pruebas de la app pasan, salvo `test/pdf.test.js`, que ya fallaba antes (le
  falta el módulo canvas). Las del servidor pasan todas.
- En el navegador, con un servidor local: la portada en computadora (1366) y en celular (390), sin errores y sin que
  nada se salga de la pantalla; la tarjeta del ejemplo con el texto nuevo en Inicio.
