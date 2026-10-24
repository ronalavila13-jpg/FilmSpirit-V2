# FilmSpirit · lote G (22 de octubre de 2026): la planta de cámara

Las mejoras 1 a 4: salir de la planta completa, la planta general de la escena, la cámara B en un mismo plano y
exportar solo la planta.

**Cómo aplicarlo.** Viene junto con los lotes H e I en `filmspirit-lotes-G-H-I.zip` y en `filmspirit-servidor.zip`.
Gastos (lote J) va en una entrega aparte. Después de descomprimir el ZIP encima de tu carpeta `octavos/`, arma las tres
versiones en este orden:

1. `sh build.sh`
2. `node server/make.js`
3. `cd desktop && node make.js`

`build.sh` cambia porque hay un archivo nuevo (`src/planta-general.js`).

## Qué cambió

### 1. La planta completa se cierra solo cuando tú quieres
Se sale de tres formas:
- tocando la viñeta de arriba a la derecha (ahora es un botón: «Volver al editor»);
- con la ✕;
- con Esc.

El doble toque **ya no la cierra**, pero sigue abriéndola desde el editor.

Si hay un menú abierto (Exportar, Luz…), Esc cierra solo el menú. Antes cerraba también la planta.

### 2. Planta general de la escena
Junta las cámaras de todos los planos de la escena en una sola planta. Se abre desde dos lugares:
- **Storyboard:** el botón «Planta general» en cada escena que tiene planos.
- **Planta completa del editor:** el botón «Planta general» de la barra de arriba. Muestra también los cambios que
  todavía no guardaste.

Qué se ve:
- **El lugar, una vez:** muros, interior, calle o plano importado, y sus objetos.
- **Cada cámara en el color de su plano:**
  - su cuerpo y el contorno de su cono (corto, para que varias no tapen la planta);
  - una pastilla con el código («1.2», o «1.2·A» y «1.2·B» si tiene dos cámaras) y su lente.
- **Las figuras, una vez,** donde están en el primer plano en que aparecen.
  - Si en otro plano están en otro lugar, va un punto tenue con el código de ese plano.
- **Flechas finas:**
  - una figura que se desplaza: su recorrido, en su color, con el código del plano;
  - una cámara que se mueve (travelling, dolly): su recorrido, punteado, en el color del plano.
- **Sin luces:** en una planta de varias cámaras estorbaban.
- **Al lado, la lista de planos:** color, código, lente (A y B) y una descripción corta. En el teléfono va debajo.

Cómo se usa:
- **Tocar una cámara o un plano de la lista** lo resalta y deja tenue lo demás. Aparece «Abrir el plano ›».
- **Doble toque** en la cámara (o doble clic en la lista) abre ese plano. Desde el editor, primero se guarda el
  plano que estabas editando.
- **Para moverte:** arrastra para mover la planta, la rueda acerca y aleja, y los botones − + y «Ver todo».
- **Los rótulos no se pisan:** cada uno busca un lugar libre.
- **Planos dibujados a mano (2D):** no tienen planta; la ventana avisa cuántos quedaron fuera.

### 3. Cámara A y cámara B en un mismo plano
En el editor, pestaña **Cámara**: «+ Cámara B».

- **Dónde aparece:** al lado de la A (1,2 m a su derecha), a la misma altura, con un lente más cerrado. Sigue a la
  misma figura que la A.
- **Cambiar de cámara:**
  - en el panel de **Cámara**, con **A** y **B**;
  - con la letra en la barra de la viñeta (toca para pasar a la otra);
  - tocando la otra cámara en la planta.
- **Lo que tiene cada cámara:** su posición, lente, altura, a quién sigue, recorrido y movimiento. Todo lo de siempre
  (arrastrarla, el lente, Reencuadrar, Animar, los travellings) vale para la que estás viendo.
- **En la planta del plano:** las dos, cada una con su letra. La A en azul, la B en naranja tostado; la que no estás
  editando, más tenue.
- **«Quitar B»:** el plano queda como antes de agregarla.
- **Deshacer y rehacer** funcionan igual con las dos cámaras.

Dónde se ve la B:
- **Storyboard:** la viñeta de la A, y la de la B más chica al lado, con su lente («B 85 mm»). El sello «Rodado» va
  sobre la A.
- **Guion técnico:** debajo del lente de la A, el de la B.
- **PDF:**
  - el storyboard (con y sin planta): las dos viñetas, con su lente;
  - el guion técnico: los dos lentes;
  - la planta de cada plano: las dos cámaras;
  - el texto de la cámara: los datos de la B.
- **Animatic:** usa la A.

**Los datos:**
- La viñeta de la B no es una imagen guardada: se dibuja de la escena, como la de la A. No ocupa espacio y viaja con
  el plano en la web con cuentas y en el escritorio.
- Los proyectos de antes no cambian. Al abrir uno, la cámara B se limpia: queda solo lo que se conoce.

### 4. Exportar solo la planta
- **Desde la planta completa:** el botón «Exportar» de la barra de arriba. Exporta la planta del plano (con lo que
  no guardaste) o la general de la escena.
- **Desde la planta general:** «Exportar» exporta la general. Si hay un plano resaltado, también ese plano solo.
- **Formatos:**
  - **PDF:** una página horizontal con el título del proyecto, la escena y el código del plano; la planta grande y,
    al lado, los datos del plano o la lista de planos.
  - **PNG:** la misma página como imagen (2400 × 1560), para mandarla por chat.
- **Plan:** es de Pro y Studio, como el storyboard con planta.
- **Nombres de los archivos:** `…_planta_1.2.pdf` y `…_planta_general_esc1.pdf`. En inglés, `…_floor_plan_…`.

## Lo que queda para otra ronda, y por qué
- **La B comparte los tiempos de las claves con la A.** Si pones una clave en una cámara, la otra también la tiene,
  con su posición de ese momento: su movimiento no cambia. Separar del todo las dos pistas pide otra línea de tiempo
  en el editor.
- **En la planta general no se pellizca para acercar en el teléfono.** Se acerca con − + y se arrastra para moverla.
- **La hoja de llamado y la hoja de script no muestran la B.** No se pidió; la hoja de script anota tomas por plano.
- **Ya estaba antes:** el PDF «Lámina» falla en la prueba automática que exporta todo sin opciones, porque pide un
  área. No es de este lote: desde la app sale bien.

## Pruebas
- **`test/planta.test.js`** (nueva, 10 pruebas):
  - agregar, cambiar y quitar la B;
  - cambiar dos veces deja la escena igual, con el mismo orden;
  - la limpieza al abrir (proyectos viejos sin B no cambian);
  - juntar claves, correr la acción y copiar la escena del plano anterior conservan la B;
  - el plano visto por la B y su lente;
  - la viñeta de la B va con el storyboard (reglas comunes);
  - qué dibuja la planta general con tres planos: uno con B, uno fijo, uno a mano, figuras que se mueven y otras
    posiciones; con el editor abierto, sus cambios sin guardar.

  Fallan con el código de antes y pasan con el de ahora.
- **Pasan todas:**
  - las de `test/`;
  - las 11 del equipo de escritorio y `unit.js`;
  - las 68 del servidor.

En el navegador, con el proyecto de ejemplo:
- **Planta completa:** se abre con ⤢ y con doble toque. Dentro, el doble toque no la cierra. La cierran la viñeta, la
  ✕ y Esc; Esc con el menú Exportar abierto cierra solo el menú.
- **Cámara B:**
  - agregar, mover el lente y animar un travelling solo de la B (la A no se movió);
  - pasar de A a B y de vuelta con el panel, con la letra de la viñeta y tocando la cámara en la planta;
  - deshacer y rehacer, guardar, y verla en el storyboard, el guion técnico, la planta general y el animatic.
- **Exportar:**
  - todos los tipos de PDF (la Lámina sin opciones ya fallaba antes, ver arriba);
  - el storyboard con y sin planta y el guion técnico, con una B;
  - la planta de un plano y la general en PDF y PNG, en español e inglés.
- **Pantallas:** computadora y teléfono (390 px), claro y oscuro, español e inglés (sin textos sin traducir en lo
  nuevo).

## Archivos
- **Nuevo:** `src/planta-general.js` (la planta general, su ventana y exportar la planta).
- **Cambiados:**
  - `src/s3d-model.js` (los datos de la cámara B)
  - `src/s3d-plan.js` (el lugar como función común; la otra cámara en la planta)
  - `src/shot-editor.js` (salir de la planta completa, A/B, Planta general y Exportar)
  - `src/tab-board.js` (el botón por escena; la viñeta de la B; el lente de la B)
  - `src/pdf.js` (las dos viñetas; los dos lentes; la planta con las dos cámaras; los PDF de la planta)
  - `src/s3d-render.js` (las viñetas de la B)
  - `src/proyectos.js` (limpiar la B al abrir)
  - `src/shell.html` (estilos)
- **Armado y textos:** `build.sh`, `i18n/en-manual.json`, `i18n/hacer.js` (nombres de archivo en inglés)
- **Pruebas:** `test/planta.test.js`
