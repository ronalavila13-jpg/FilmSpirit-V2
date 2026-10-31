# Lote AG · la etiqueta «Ejemplo» en rojo y el botón cuadrado en la portada (27-oct-2026)

Base: lote AF (que trae los lotes AD y AE). Rama `lote-ag`.

**Cómo aplicarlo.** En la VPS, como siempre:
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
Viene sin los maniquíes 3D (el actualizador conserva los instalados). No hay variables ni migraciones nuevas. Si ves la
versión anterior, recarga con Ctrl+F5.

1. **En el programa, solo la palabra «Ejemplo» en rojo.** La tarjeta del ejemplo vuelve a ser blanca como las demás
   (título y texto en el color normal) y sigue primera. La etiqueta «EJEMPLO» es roja llena con letra blanca, para que no
   se confunda con «GUION» (letra roja sobre rosado). En la lista de Proyectos, la fila del ejemplo es como las demás,
   con la misma etiqueta roja delante del texto.
2. **En la portada, «Explorar con un proyecto de ejemplo» es cuadrado**, con las esquinas apenas redondeadas, como los
   botones del programa y «Crear cuenta gratis» de la barra de arriba (antes tenía forma de píldora).

## Pruebas
- Actualizadas `test/acceso-ad.test.js`, `test/lote-ae.test.js` y `test/lote-af.test.js`. Todas las pruebas de la app
  pasan, salvo `test/pdf.test.js`, que ya fallaba antes (le falta el módulo canvas). Las del servidor pasan todas.
- En el navegador, con un servidor local y una cuenta del plan gratis: Inicio, la lista de Proyectos y la portada.
