# FilmSpirit · cuarta entrega del 21 de octubre de 2026: los 9 cambios pedidos

Este ZIP trae solo los archivos nuevos o modificados, con las mismas rutas del proyecto. Descomprímelo **encima** de tu
carpeta `octavos/`, después de las entregas anteriores del mismo día.

## Cómo aplicarlo

1. **Web (página interactiva):** `sh build.sh`, como siempre.
2. **Web con cuentas (VPS):** usa `filmspirit-servidor.zip` (ya armado con esta versión). Súbelo y en la VPS:
   `cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
3. **Escritorio:** `cd desktop && node make.js`.

## Qué cambia

### 1. Las etapas ya no tiemblan al pasar el mouse
Al pasar el mouse por una etapa de la barra de la izquierda, el botón perdía su margen y se encogía 17 px. Las etapas de
abajo subían, el puntero quedaba sobre otra etapa y todo se repetía sin parar. Ahora cada etapa mantiene su tamaño al
pasar el mouse y con su menú abierto. El saltito del ícono se queda.

### 2. Agregar figuras, objetos y luces desde la planta a pantalla completa
En el editor de plano, la planta a pantalla completa tiene arriba a la izquierda **+ Figura**, **+ Objeto** y
**+ Luz**, con los mismos menús del editor:
- **+ Figura:** los personajes de la escena, una figura genérica o extras.
- **+ Objeto:** el catálogo con buscador.
- **+ Luz:** los tipos de luz y el esquema de tres puntos.

Lo nuevo aparece delante de la cámara y queda elegido, para arrastrarlo ahí mismo, sin salir de la pantalla completa.
En el teléfono los botones van solo con su ícono y miden 44 px. Los avisos de ayuda ya no aparecen encima de la planta
completa.

### 3. El menú de cada etapa, como antes
- **Un clic en una etapa** (en la computadora) vuelve a abrir la tarjeta con el nombre de la etapa y sus pestañas, con
  sus íconos de color. Si la etapa tiene una sola pestaña visible, va directo.
- **La franja de pestañas** de arriba se queda y ahora cada pestaña lleva su ícono.
- **Alt + número** sigue yendo directo a cada etapa. En el teléfono, la etapa sigue llevando a su última pestaña.

### 4. Movilidad: el conductor es un proveedor o un nombre escrito
El campo **Conductor** muestra los nombres de **Proveedores** y deja escribir cualquier otro nombre. El equipo y el
reparto ya no aparecen en esa lista.
- Si eliges un proveedor y después le cambias el nombre en Proveedores, el conductor se actualiza solo.
- Los conductores que ya habías elegido del equipo se siguen viendo con su nombre.
- Todos quedan libres para subir como pasajeros. El PDF y el Excel sacan el nombre del conductor.
- «Copiar la de la jornada anterior» copia también el conductor.

### 5. Un punto ámbar en los datos que faltan
El subrayado curvo de los campos que faltan para enviar la hoja se cambió por un **punto ámbar** dentro del campo, y el
texto de ejemplo («Sin asignar», «Falta el nombre») va en ámbar. Al escribir el dato, el punto se va.

### 6. La locación, más grande, con «Ver mapa»
- En la cabecera de la hoja de llamado, el nombre de la locación pasa a unos 19 px, con su dirección debajo.
- **Ver mapa**, al lado, abre el enlace que cargas más abajo en **Punto de encuentro** (Google Maps o Waze). Si no hay
  enlace, abre la dirección.
- Si no hay ni enlace ni dirección, en su lugar aparece **+ Enlace del mapa**, que te lleva a ese campo.
- El PDF no cambia.

### 7 y 9. Cada sección con su color
Cada etapa tiene su color y cada pestaña su subtono, para reconocer la sección de un vistazo.

| Etapa | Color | Pestañas |
|---|---|---|
| Guion | negro y grises (para no distraer al escribir) | Historia, Guion |
| Desarrollo | vino | Guion rayado, Desglose, Scouting, Casting |
| Imagen | azul tinta | Storyboard, Animatic |
| Producción | miel (con letra negra) | Plan de rodaje, Calendario, Presupuesto |
| Rodaje | verde pino | Hoja de llamado, Hoja de script |

**Predeterminado: «Sólidos».**
- La franja de pestañas va en el color de la etapa. La pestaña elegida se ve recortada en blanco, como una ficha, con
  una raya de su subtono arriba: es su veladura.
- En la barra de la izquierda, la etapa elegida es una baldosa de su color, con el nombre y el ícono en blanco.
- La barra de herramientas lleva una línea de su subtono, y la tarjeta de cada etapa marca la pestaña abierta con su
  color.

**Opcional: «Pastel»**, en **Colores y temas › Color de las secciones**. Usa velos suaves del mismo color. La pestaña
elegida va en su subtono y la etapa elegida en su velo con una raya de color. Es una preferencia de tu pantalla.

Las dos opciones también funcionan en la apariencia oscura. La letra sobre cada color se lee bien: el contraste es de
4,9 a 1 o más.

No cambian:
- los colores del oficio: tiras de día y noche, eventos y departamentos;
- el botón «Nuevo»;
- los PDF y los Excel, que siguen en gris porque se imprimen mejor.

### 8. El logotipo, más grande
En la computadora, el logotipo pasa de 74 a 128 px de ancho, sin la línea que lo encerraba. En tablet (de 761 a 900 px)
mide 100 px y el estado de guardado queda solo con su ícono, para que quepan el título del proyecto y el idioma. Hasta
1100 px, Compartir y Proyectos van solo con su ícono.

### Inglés
Todo lo nuevo está traducido en `i18n/en-manual.json`.

## Probado

- Las pruebas pasan: las del programa y las 55 del servidor.
- El recorrido por las 14 pestañas, en español e inglés, con tres anchos y en claro y oscuro, no dio errores.
- No quedan textos en español sin traducir en el modo inglés, salvo los nombres propios del ejemplo.
- El detector de Impeccable sigue en 12 hallazgos, todos falsos positivos.
- Las etapas ya no se mueven al pasar el mouse.
- Las versiones de la hoja de llamado siguen iguales en español e inglés.

## Archivos

`src/`:
- **Barra de etapas, franja y colores:** `ui.js`, `barra.js`, `leyenda.js`, `shell.html`
- **Planta del editor de plano:** `shot-editor.js`
- **Hoja de llamado:** `tab-call.js`

`i18n/`: `en-manual.json`

`server/`: `tools/maniquies.js`, `deploy/actualizar.sh` y `LEEME-VPS.md`, que conservan los maniquíes 3D al actualizar.
Ya venían en `filmspirit-servidor.zip`; aquí van para tu copia del proyecto.

Raíz: `CAMBIOS-diseno-r4-2026-10-21.md`
