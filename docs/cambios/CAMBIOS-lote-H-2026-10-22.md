# FilmSpirit · lote H (22 de octubre de 2026): Apariencia

La mejora 6: el panel «Colores y temas» pasa a llamarse «Apariencia» y separa lo tuyo de lo del proyecto.

## Cómo aplicarlo
Viene junto con los lotes G e I en `filmspirit-lotes-G-H-I.zip`; Gastos (lote J) va en una entrega aparte. Después de
descomprimirlo encima de tu carpeta `octavos/`, arma las tres versiones como siempre:
1. `sh build.sh`
2. `node server/make.js`
3. `cd desktop && node make.js`

En la VPS, `filmspirit-servidor.zip` ya lo trae.

## Qué cambió

### 1. Dos pestañas: «Tu pantalla» y «Colores del proyecto»
Antes, un solo bloque mezclaba lo que cambia solo en tu pantalla con lo que cambia para todo el equipo. Ahora cada
pestaña dice arriba a quién afecta.

- **Tu pantalla.** Arriba, en azul: «Solo para ti, en este navegador. Nadie más lo ve y el proyecto no cambia» (en el
  escritorio dice «en esta computadora»).
  - **Modo:** automático, claro u oscuro.
  - **Color de las etapas:** Vivos o Suaves (antes Sólidos y Pastel), con su muestra.
  - **Letra.**
  - **Barras y líneas**, con la nota de que la letra, las barras y las líneas también se usan en los PDF que tú
    exportas.
  - **«Volver a lo de siempre (solo tu pantalla)».**
- **Colores del proyecto.** Arriba, en ámbar: el nombre del proyecto y «lo ve todo el equipo y sale en los PDF y
  Excel».
  - **Paleta**, en lugar de «Tema»: Estándar, Original, Sobria, Alto contraste y Escala de grises (para imprimir en
    blanco y negro). Cada una con una frase y sus cuadritos: día, noche, evento, rodaje y nota.
  - **Color por color:**
    - Plan de rodaje: Día, Noche, Jornada y Evento.
    - Calendario: Preproducción, Rodaje, Posproducción y Otras.
    - Hoja de llamado: Nota para el equipo.
    - Desglose: el número de categorías y «editar en el desglose ›», que te lleva al desglose con la leyenda abierta.

    Tocar un color abre la misma paleta de siempre.
  - **Mis paletas:** las tuyas, en tu cuenta (en la web con cuentas) o en este navegador o esta computadora. Se
    guardan con «+ Guardar esta paleta…». Cada una tiene su menú: guardar los colores de ahora, cambiar el nombre y
    borrar.
  - **«Volver a la paleta Estándar».**

### 2. La paleta elegida queda marcada aunque cambies un color
Si eliges Original y después cambias el color de la noche, Original sigue marcada con «con 1 color cambiado».
- **El proyecto guarda qué paleta se eligió**, y lo ve todo el equipo.
- **Un proyecto de antes**, que no lo tiene guardado, muestra la paleta que coincide con sus colores o la más parecida,
  con cuántos colores cambian.

### 3. Una paleta ya no cambia tu pantalla
- **Elegir una paleta solo cambia los colores del proyecto:** no toca la letra, las barras, las líneas ni el modo.
- **Ya no se pasa a modo claro** al elegir una paleta: en oscuro sigues en oscuro.
- **Se puede deshacer** desde el aviso.

### 4. Si no puedes editar los colores del proyecto
- **Solo puedes mirarlos.** El panel lo dice y nombra a quién puede cambiarlos, por ejemplo: «Solo puedes mirarlos:
  los cambia Grace y Ronald». Las paletas no se pueden elegir.
- **Si puedes editar solo una parte** (por ejemplo, el plan y no el calendario), la paleta cambia lo tuyo y el aviso
  dice que se aplicó en lo que puedes editar.

### 5. Tus temas de antes son tus paletas
- **Los temas que ya tenías guardados** (en tu cuenta o en este equipo) aparecen en «Mis paletas» y se usan igual.
- **Lo que traían de la pantalla** (barras y líneas) ya no se aplica.
- **Los proyectos abren con los mismos colores de siempre.**

### 6. Cómo se llega
- **Desde la Vista** (el «⋯» de las pestañas): sigue el cambio rápido de modo (Automático, Claro, Oscuro) y el botón
  «Apariencia…» abre «Tu pantalla».
- **Desde la Leyenda:** al abrirla, «Colores del proyecto…» abre esa pestaña.

### 7. En el servidor
- **La Escala de grises se guarda.** Una paleta propia en grises se guardaba en la cuenta sin el gris; ahora lo
  conserva.
- **Las paletas de ahora no llevan ajustes de pantalla**, así que el servidor ya no les agrega unos inventados.

## Lo que queda para otra ronda, y por qué
- **El color de cada categoría del desglose** se sigue cambiando en la leyenda del desglose, no en el panel. Son
  15 colores y el panel quedaría muy largo; el enlace «editar en el desglose ›» lleva directo ahí.
- **Si un compañero eligió una paleta suya** (que tú no tienes guardada), tú ves la más parecida de las tuyas o de
  las de siempre, con los colores que cambian. Para ver su nombre habría que guardar la paleta dentro del proyecto.

## Pruebas
- **`test/apariencia.test.js`** (nueva):
  - la paleta elegida con un color y con tres colores cambiados;
  - un proyecto sin paleta guardada: la que coincide y la más parecida;
  - la Escala de grises;
  - aplicar cualquier paleta no toca el modo ni la pantalla;
  - un tema guardado de antes sirve como paleta y no cambia la pantalla;
  - solo lectura, con quién puede, y el permiso solo en el plan;
  - la limpieza de la paleta guardada en el proyecto.
- **`server/test/temas.test.js`:** la Escala de grises se guarda y no se inventa una pantalla.

Las pruebas nuevas fallan con el código de antes y pasan con el de ahora. Pasan todas las del programa, las 11 del
equipo del escritorio, `test/team/unit.js` y las 69 del servidor.

En el navegador:
- las dos pestañas en claro y oscuro, en la computadora y el teléfono, en español y en inglés;
- cada paleta, también en oscuro, sin saltar a claro;
- «con 1 color cambiado» al cambiar la noche;
- guardar y aplicar una paleta propia;
- solo lectura con un rol sin permiso;
- los enlaces desde la Vista, la Leyenda y el desglose.

El recorrido de las 14 pestañas, en español e inglés, a tres anchos y en claro y oscuro, sin errores. En inglés no
quedan textos sin traducir en el panel.

## Archivos
- **`src/`:** `leyenda.js` (las paletas y el panel), `barra.js` (la Vista), `shell.html` (el estilo del panel),
  `tab-plan.js` (la ayuda), `pdf.js` y `pdf-fuente-x.js` (comentarios)
- **`server/`:** `lib/temas.js`, `lib/db.js` (comentario), `test/temas.test.js`
- **`desktop/`:** `make.js` (comentario)
- **`i18n/`:** `en-manual.json`, `glosario-en.md`
- **Pruebas:** `test/apariencia.test.js` (nueva)
- **Raíz:** `CAMBIOS-lote-H-2026-10-22.md`
