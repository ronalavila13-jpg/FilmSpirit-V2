# Lote U · vehículos: interior de vehículo con modelos y color, pick-up, escenarios de SketchUp y el piso al revés (26-oct-2026)

Base: lote T. Rama u-vehiculos. Solo la app (el servidor no cambia: el plano guarda un dato más dentro de su escena 3D).

## Para Ronald: qué cambia y cómo se usa

**Interior de vehículo (antes «Interior de automóvil»).** En el storyboard 3D, panel **Escena › Escenario** (o el botón de
entorno arriba de la viñeta), ahora hay cinco interiores, en la misma lista, como las habitaciones:

| En la lista | Puestos | Quién maneja |
| --- | --- | --- |
| Interior de vehículo: sedán | 5 (2 adelante, 3 atrás) | la 1.ª figura |
| Interior de vehículo: SUV | 5 | la 1.ª figura |
| Interior de vehículo: van o combi | 8 (2 adelante y dos filas de 3) | la 1.ª figura |
| Interior de vehículo: pick-up | 5 (doble cabina; atrás, la tolva abierta) | la 1.ª figura |
| Interior de vehículo: bus urbano | 33 (7 filas de 2 + 2 con pasillo y la banca de 5 al fondo) | un **chofer de relleno** |

- Cada uno tiene **por fuera** la silueta real del vehículo (ruedas con aro, faros, parachoques, espejos, manijas) y **por
  dentro** está hueco y completo: tablero con instrumentos, pantalla y salidas de aire, volante con rayos y columna, consola
  con palanca y freno de mano, asientos con cabecera, banca trasera, paneles de puerta con apoyabrazos, manija y parlante,
  techo forrado con parasoles y retrovisor. Las **lunas son transparentes**: desde dentro se ve la pista y desde fuera se ven
  las figuras. El bus trae pasamanos en el techo, barras verticales junto al pasillo, la **puerta de subida** a la derecha
  con sus escalones, y el chofer: una figura gris sin rostro que es parte del bus (no es un personaje y no se elige).
- **Color**: debajo del escenario aparece una fila de muestras (los mismos colores de los vehículos del menú, más «otro
  color»). Pinta solo la carrocería; el interior queda neutro. Se guarda en el plano y se deshace con Ctrl+Z.
- **Las figuras se sientan solas** al elegir el modelo; la **cámara de inicio** mira por el parabrisas a los de adelante (en
  el bus, desde el frente del pasillo hacia los pasajeros). En el bus todas las figuras van de pasajeras; si son más que los
  asientos, las que sobran quedan de pie en el pasillo.
- **Desde el guion**: «INT. AUTO / TAXI / COCHE» arma el sedán; «CAMIONETA» o «SUV», la SUV; «PICK-UP», la pick-up;
  «COMBI» o «VAN», la van; «BUS», «CUSTER», «MICRO» u «ÓMNIBUS», el bus. (Las escenas EXT siguen siendo la calle.)
- **La planta de cámara** dibuja cada vehículo visto desde arriba: contorno, ruedas, espejos, cabina, tablero, volante,
  asientos; la tolva de la pick-up; en el bus, la puerta, los asientos por filas y el chofer.
- **Los planos de antes** con el auto quedan igual: sedán rojo, con las figuras en los mismos asientos y la misma cámara.
  El sedán es más detallado y ahora tiene ruedas y altura real.

**Objetos › Vehículos.** Nueva **Pick-up doble cabina** (con su color, como los demás). El **Auto** (y el taxi y el
patrullero) se arman como el sedán del interior: lunas transparentes e interior completo, así una figura puede ir sentada
adentro. En los vehículos del menú el volante quedó a la izquierda (estaba a la derecha).

**Escenarios 3D desde SketchUp.** El importador acepta, además de .glb, .gltf, .fbx y .vrm:
- **.kmz** (recomendado para SketchUp para web: un solo archivo con el modelo y sus texturas),
- **.dae** (Collada),
- **.obj**, con su **.mtl** y sus texturas si se eligen juntos (se pueden elegir o arrastrar varios archivos a la vez); sin
  .mtl queda en un color neutro,
- y un **.zip** con cualquiera de ellos (así lo baja SketchUp para web cuando el modelo lleva texturas).
La ventana dice qué exportar: SketchUp de escritorio, *Archivo › Exportar › Modelo 3D › «Archivo binario glTF (*.glb)»*;
SketchUp para web, *Exportar › KMZ*. Las medidas de SketchUp (pulgadas, eje Z hacia arriba) se leen solas.

**El piso de los escenarios importados.** En SketchUp el piso suele venir con la cara al revés (o no venir), y la app lo
tomaba por el techo: la figura quedaba parada encima del edificio. Ahora:
- las caras del piso al revés también cuentan;
- si la única superficie grande es el techo, el piso va a la base del modelo;
- si el piso queda arriba (por ejemplo, se eligió el «Nivel 2» que es el techo), la ventana avisa **«¿El piso quedó en el
  techo? Muévelo en Piso.»**, y el panel **Escena** del plano también lo avisa («… Muévelo en Piso (Ajustar…)»).

Un detalle que queda: en la **planta** del importador (y en la imagen de planta que se guarda), un piso al revés se ve
oscuro, del mismo color que los muros cortados (desde arriba se ve su cara de atrás). El piso queda bien puesto igual. Si
molesta, en SketchUp: clic derecho en el piso › **Invertir caras** antes de exportar.

## Notas técnicas

**Datos.** `s3.set = 'auto'` como siempre y, nuevo y opcional, `s3.car = { m, c }`: `m` el modelo (`suv`, `van`,
`pickup`, `bus`; sin `m` es el sedán) y `c` el color de la carrocería (`#RRGGBB`; sin `c`, el de fábrica del modelo: el
sedán, `#9C3E36`, el rojo de siempre). Lo de siempre no se anota (un plano viejo no cambia). `carClean` (s3d-entornos.js)
lo sanea al abrir el proyecto (src/proyectos.js, junto a `s3CleanB`): solo un modelo que existe y un color válido.
Las figuras del interior llevan `p.h` (la «Altura» de siempre) para quedar sobre el cojín: 0 en el sedán (como antes),
≈0,2–0,3 m en SUV, van y pick-up y 0,74 m en el bus. Al salir del interior de vehículo se les quita.
`P.sets3d[id].dn` (nuevo, opcional): cuánto del escenario importado queda debajo del piso (para el aviso del editor; los
escenarios de antes lo calculan del modelo si ya está abierto).

**Archivos.**
- `src/s3d-cabinas.js` (nuevo, en build.sh después de s3d-vehiculos): `vehShell` (carrocería hueca a partir del perfil:
  costados finos de punta a punta, lo macizo recortado del perfil con `vehClipZ`, cabina con los vanos de las ventanas
  ajustados al contorno redondeado `cabFitHoles`, forros por dentro, techo, lunas `cGlass` transparentes, bandeja oscura que
  tapa las piernas de las figuras bajo el piso), `vehInterior` (tablero, instrumentos `cabDial`, volante `cabWheel`,
  consola, asientos `cabSeat`, paneles de puerta, parasoles, retrovisor; `cabLayout` ubica tablero y volante según la primera
  fila), `vehMicro` y `VEH_MICRO`/`microSeats` (el bus del escenario, con el chofer de relleno hecho con `genteSimpleGeo`).
- `src/s3d-vehiculos.js`: perfiles con datos del interior (`fh`, `rows`, `hb`, `bed`, `hollow`); sedán con más techo atrás
  (cabe la fila trasera); nuevo perfil `pickup` y objeto `pickup` (S3_PROPS, VEH_PAINT); `vehCar(kind, inner, paint, { hollow })`
  arma hueco el auto, taxi, patrullero y pick-up; volante a la izquierda; luces y patente traseras de la van más abajo.
- `src/s3d-entornos.js`: `CAB_MODELS`, `carOf`, `carSet`, `carClean`, `carFromLoc` (lo que dice la locación), `carSeats`,
  `envSeatCar` y `envCarCam` por modelo, `carPlan` (la planta), `envCarSync` (arma cada modelo la primera vez, lo une por
  material con `propMerge`, le pone contorno y le cambia el color). El set «auto» ahora es solo la pista con su bosque.
- `src/s3d-model.js`: S3_SETS (los cinco interiores), detección de la pick-up en el desglose (y la camioneta que no es
  pick-up), no se pone otro vehículo dentro del interior, y la línea de `envSeatCar` en `s3Default` anota el modelo.
- `src/s3d-plan.js`: `planCar` y el encuadre de la planta incluye el vehículo entero.
- `src/shot-editor.js` (solo el panel del escenario): `setCur`/`pickSet` con `auto:<modelo>`, la fila de colores
  (`data-c="carpaint"`, `data-cpc`, se deshace como un paso), el aviso del piso en el techo, el título del botón de importar,
  `ENV_SHORT.auto = 'Vehículo'`.
- `src/escenarios-3d.js`: `set3dFloors` cuenta las caras horizontales al revés y, si solo hay superficie grande arriba, pone
  el piso en la base (`roof: true`); `set3dRoofy` (aviso del editor); la ventana: texto de SketchUp, varios archivos a la vez,
  aviso «¿El piso quedó en el techo?», guarda `dn`.
- `src/modelos.js`: `m3Read(file, extra)` lee .kmz y .zip (fflate `unzipSync`; del .kmz, el modelo que dice doc.kml), .dae
  (ColladaLoader), .obj (OBJLoader + MTLLoader) con un administrador de carga propio: las texturas y el .mtl se buscan entre
  los archivos elegidos por su nombre, lo que falta no se pide a internet (`data:,`), y se espera a que terminen de cargar.
  Mensajes de error nuevos (.kmz sin modelo, .zip sin modelo, .dae ilegible, comprimido dañado). `M3_SET_FILES`, `m3Main`.
- `tools/glb-lib.mjs` y `src/glb-lib.js` (regenerado, 260 KB): suman ColladaLoader (con TGALoader), OBJLoader, MTLLoader y
  `unzipSync`. **No va el KMZLoader**: arma su propio administrador de carga y no avisa cuándo llegan las texturas (se
  perdían; probado); el .kmz se abre igual que él pero con el de la app.
- `src/shell.html`: `.e3-warn` (usa `--warn-soft`/`--warn-text`, que ya cambian en modo oscuro).
- `src/proyectos.js`: una línea, `carClean` al abrir.
- `i18n/en-manual.json`: bloque «// lote U · vehículos».

**Rendimiento.** Cada modelo se arma una sola vez por sesión y solo cuando se usa; sus piezas se unen por material:
unas 40 mallas por vehículo con contorno (≈ 60–75 mil triángulos sin contorno). Arma en 25–90 ms.

**Pruebas.**
- Nueva `test/vehiculos.test.js` (9): lo que dice el guion, la lista de escenarios, los puestos de cada modelo, el sedán de
  antes igual (asientos y cámara), el bus (pasajeros y cámara), la altura sobre el cojín, `s3.car` y su limpieza, la planta, la
  pick-up en el menú.
- `test/modelos.test.js` (+4): `set3dFloors` con una caja sin piso, con el piso al revés y con el piso normal (las dos
  primeras fallan con el código anterior: el piso salía en 3 m, el techo), y `set3dRoofy`.
- Antes y después: pasan todas las de la app salvo `pdf.test.js` (ya fallaba: necesita el módulo canvas), las del equipo
  (test/team, 5 archivos) y las del servidor (15 archivos).
- Probado en Chromium con Playwright: los cinco modelos por dentro y por fuera, de día y de noche, claro y oscuro, escritorio
  y teléfono; la planta; el color y deshacer; la pick-up y el auto como objetos; en inglés; y el importador con modelos
  hechos a mano como los de SketchUp (casa de 5 × 4 m con puerta, piso al revés, en pulgadas y Z arriba): .kmz con textura,
  .dae, .obj + .mtl + .jpg, .obj solo, .zip con .dae y textura, caja sin piso, un .glb con el piso al revés (el caso de
  SketchUp de escritorio; antes el piso salía en el techo) y un .kmz dañado (mensaje claro). En todos el piso quedó en 0 m.
