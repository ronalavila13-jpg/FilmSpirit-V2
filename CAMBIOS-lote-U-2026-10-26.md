# Lote U · quince cambios pedidos el 26-oct-2026

Base: lote T. Se hizo en cuatro frentes en paralelo y se unió en la rama `lote-u`. El detalle de cada frente (cómo se usa,
decisiones, archivos y pruebas) está en su propia nota:

- [CAMBIOS-lote-U-guion.md](CAMBIOS-lote-U-guion.md): puntos 1, 2, 11 y 12
- [CAMBIOS-lote-U-produccion.md](CAMBIOS-lote-U-produccion.md): puntos 5 a 10
- [CAMBIOS-lote-U-vehiculos.md](CAMBIOS-lote-U-vehiculos.md): puntos 3, 13 y 14
- [CAMBIOS-lote-U-storyboard.md](CAMBIOS-lote-U-storyboard.md): puntos 4 y 15

## Los quince puntos

1. **Revisiones por palabra.** Con «Marcar los cambios» o con el guion cerrado en revisión, lo que se escribe o cambia queda
   con fondo del color de esa revisión, y lo borrado con una marquita. El asterisco y la raya del margen siguen. El PDF no
   cambia (solo asteriscos).
2. **Resaltador de seis colores** (amarillo, verde, celeste, rosa, naranja, lila), con una flechita junto al botón para elegir
   y «Quitar resaltado». Recuerda el último color. Con el guion cerrado los resaltados se ocultan; no se imprimen.
3. **Escenario «Interior de vehículo»** con cinco modelos (sedán, SUV, van, pick-up doble cabina y bus urbano con chofer de
   relleno), huecos por dentro y con color a elegir. Las figuras se sientan solas y la cámara de inicio va por el parabrisas
   (en el bus, al frente del pasillo). El guion propone el modelo. La pick-up también está como objeto en Vehículos.
4. **Puesta en escena del máster.** Los demás planos de la escena toman la posición de los personajes, el escenario y los
   objetos del máster; solo cambia su cámara (regla de los 180°, plano y contraplano). El máster se detecta solo o se elige
   con «Usar como máster». Los planos ajustados a mano conservan lo suyo y pueden «Volver a seguir al máster».
5. **Calendario:** vistas en el orden Meses · Tablero · Línea de tiempo.
6. **Plan de rodaje arriba, Stripboard abajo** (junto a DOOD). En inglés: Shooting Schedule y abajo Stripboard · DOOD.
7. **Horas de cada plano** en la hoja de llamado: se nota que se pueden tocar, y una hora fuera de su escena alarga o corre la
   escena en vez de rechazarse.
8. **Hoja de llamado con la estructura de la referencia:** encabezado en tres columnas, nota y utilería especial, cronograma en
   lista, una tabla de personas, pie con centro de salud y canales de radio. «Hecha con FilmSpirit».
9. **Stripboard con la estructura de la referencia:** tiras a todo el ancho con los colores de la industria, columnas en el
   orden pedido y orden por columna dentro de cada jornada.
10. **Avance de la jornada siguiente** en la hoja de llamado (pantalla, PDF, Excel y resumen). En la última: «Fin de rodaje».
11. **Contadores de escritura y racha:** palabras netas del día, tiempo escribiendo y pensando, meta (100 palabras o 15 min),
    un día de descanso por semana, la llama de FilmSpirit y Tito celebrando a los 3, 7, 14, 30, 50 y 100 días.
12. **Anotar a mano en el guion rayado:** lápiz, marcador, flechas, cuadros de texto, borrador, colores y grosores; ancladas al
    texto; las ve el equipo; salen en el PDF (con casilla para quitarlas).
13. **Importar desde SketchUp para web:** además de .glb/.gltf/.fbx/.vrm, se leen .kmz, .dae, .obj (+.mtl) y .zip.
14. **Piso de los escenarios importados:** cuenta las caras al revés y, si solo hay techo, el piso va a la base. Avisa si el piso
    quedó en el techo.
15. **2D y 3D juntos:** la Viñeta 3D es una capa del 2D; las fotos van detrás de las figuras y el dibujo encima, y se ven en el
    editor 3D (vista de cámara), en la viñeta, en el PDF y en el animatic.

## Al unir (rama lote-u)

- La lista de módulos de build.sh y las traducciones (i18n/en-manual.json) se juntaron a mano.
- En inglés, «Avance» de Gastos sigue siendo «Used»; el título del avance de la hoja de llamado usa su propio texto.
- La celebración de la racha usa la cara de orgullo de Tito de su hoja de modelo (Archivos/instagram/personaje-tito).

## Pruebas

Todas las de `test/` pasan salvo `test/pdf.test.js`, que ya fallaba antes por el entorno (le falta el módulo canvas); las de
`test/team` y las 17 del servidor pasan una por una. Nuevas: produccion-u, vehiculos, guion-lote-u, master (app), escritura y
anotaciones (servidor), y casos nuevos en modelos y planta. Se recorrieron todas las pestañas y se abrieron todos los planos
del proyecto de ejemplo, en claro y oscuro, sin errores.
