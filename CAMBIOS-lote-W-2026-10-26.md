# Lote W · trece observaciones del 26-oct-2026

Base: lote V (que trae los lotes T y U). Se hizo en cinco frentes en paralelo y se unió en la rama `lote-w`. El detalle
de cada frente (cómo se usa, decisiones, archivos y pruebas) está en su propia nota:

- [CAMBIOS-lote-W-produccion.md](CAMBIOS-lote-W-produccion.md): observaciones 1, 2 y 3
- [CAMBIOS-lote-W-personalizacion.md](CAMBIOS-lote-W-personalizacion.md): observaciones 4 y 5
- [CAMBIOS-lote-W-scouting.md](CAMBIOS-lote-W-scouting.md): observación 7
- [CAMBIOS-lote-W-editor3d.md](CAMBIOS-lote-W-editor3d.md): observaciones 6, 8, 9 y 10
- [CAMBIOS-lote-W-escenarios.md](CAMBIOS-lote-W-escenarios.md): observaciones 11, 12 y 13

**Cómo aplicarlo.** El `filmspirit-servidor.zip` de este lote trae los lotes T, U, V y W. En la VPS, como siempre:
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
El zip viene sin los maniquíes 3D: el actualizador conserva los que ya están instalados. No hay variables nuevas. La
base de datos suma sola la migración 10 del lote U (si todavía no se aplicó). El servidor suma un servicio nuevo
(`POST /api/maps/resolve`, para los enlaces cortos de Google Maps) y su política de seguridad permite las teselas de
OpenStreetMap; no hay que configurar nada.

## Las trece observaciones

1. **Stripboard sin íconos de más.** En la computadora ya no salen el asa, el ícono de la hoja de desglose ni el ⋮ de
   cada escena, ni el «⋯» del cierre de jornada: todo eso está en el clic derecho (que empieza con «Abrir hoja de
   desglose»). En pantallas táctiles se quedan, porque ahí mantener el dedo mueve la fila.
2. **Hoja de llamado con la estructura nueva y los datos de antes.** Cabecera de tres columnas con producción, cliente,
   catering, clima y el punto de encuentro completo; cronograma por escena con sus planos debajo (hora, miniatura,
   técnica, acción, set, lente, sonido, personajes); una sola tabla de personas con recojo, llamado, vestuario,
   maquillaje, listos, teléfono y observaciones; movilidad y proveedores; el centro de salud al pie. Sin la segunda
   parte repetida. Igual en pantalla, PDF y Excel.
3. **Sin «Hecha con FilmSpirit»** en la hoja de llamado (pantalla y PDF).
4. **Personalización en el panel lateral.** El botón de la barra de pestañas abre «Personalización»: en «Tu pantalla»,
   Modo, Pestañas visibles, Color de las etapas, Letra y Barras y líneas; «Colores del proyecto» sigue igual. Ya no hay
   menú chico ni Modo repetido.
5. **Grafito no apaga la marca.** El logo y los íconos de las etapas (y los de las pestañas) quedan con su color; solo
   las barras y los acentos van en gris.
6. **Aviso de encuadre.** Si la viñeta 3D no coincide con el guion técnico (tamaño, ángulo o movimiento), el panel
   Plano lo dice, con «Usar lo de la viñeta» y «Reencuadrar».
7. **Mapa general de locaciones en Scouting.** «Por lugar | Mapa general»: todas las candidatas en un mapa de
   OpenStreetMap, con pines por estado, tarjeta con «Abrir ficha» y «Cómo llegar», leyenda, «Ver todas» y «Ubicar en el
   mapa» para las que su enlace no ubica. El lugar sale solo del enlace de Google Maps (los enlaces cortos los resuelve
   el servidor).
8. **Foco a mano.** «Foco en › A mano» con la distancia, la línea de foco que se arrastra en la planta y un botón para
   enfocar tocando la viñeta.
9. **El máster cambió de escenario.** Los planos ajustados a mano lo avisan, con «Actualizar escenario» (sin tocar su
   cámara ni sus figuras) y «Mantener así»; en el máster, «Actualizar los N planos».
10. **Escala de los objetos** (10 % a 500 %, con esquinas en la viñeta y «Tamaño original»).
11. **Escala del escenario** (25 % a 400 %, con «Tamaño original»), guardada en el escenario: todos sus planos lo ven
    igual; las figuras no cambian.
12. **Constructor de escenarios** (primera versión): muros, piso, puertas, ventanas, volúmenes, muebles y luces del
    catálogo, colores, deshacer y «Asignar a locación». Desde Scouting («Construir su escenario») y desde Escena ›
    Escenario («Construir uno nuevo…»).
13. **Al importar un escenario:** «Replicar como escenario editable» (muros, piso, huecos y volúmenes; para interiores
    de muros rectos) y «Versión liviana»; después de replicar se puede borrar el original (con deshacer).

## Pruebas
- Todas las pruebas de la app pasan (con las nuevas: encuadre, escenario del máster, escenarios, enlaces de mapas y
  la hoja de llamado), salvo `test/pdf.test.js`, que ya fallaba antes (le falta el módulo canvas). Las del servidor
  pasan todas, también las nuevas del servicio de mapas.
- Recorrido en el navegador con todo unido (computadora y teléfono): todas las pestañas, el editor del plano, la hoja de
  llamado, el mapa de Scouting y el constructor, sin errores.
