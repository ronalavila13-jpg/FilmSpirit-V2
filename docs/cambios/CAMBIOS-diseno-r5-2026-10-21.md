# FilmSpirit · quinta entrega del 21 de octubre de 2026: los 7 cambios de la segunda tanda

Este ZIP trae solo los archivos nuevos o modificados, con las mismas rutas del proyecto. Descomprímelo **encima** de tu
carpeta `octavos/`, después de las entregas anteriores del mismo día.

## Cómo aplicarlo

1. **Web (página interactiva):** `sh build.sh`, como siempre.
2. **Web con cuentas (VPS):** usa `filmspirit-servidor.zip`, que ya viene armado con esta versión. Súbelo y en la VPS:
   `cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
3. **Escritorio:** `cd desktop && node make.js`.

## Qué cambia

### 1. La franja de pestañas, sin el nombre de la etapa
El nombre de la etapa («Producción |») ya no aparece a la izquierda de la franja. Parecía una pestaña y se tocaba por
error. La etapa se sigue reconociendo por su color y por la barra de la izquierda. Los lectores de pantalla siguen
diciendo «Pestañas de Producción». La primera pestaña queda alineada con lo que hay en la barra de herramientas.

### 2. Planta completa: los botones para agregar, fuera del dibujo
En la planta a pantalla completa, **+ Figura**, **+ Objeto** y **+ Luz** van ahora en una barra arriba del cuadrado.
Ya no tapan el plano. La planta mide 10 px menos para que entre la barra. Los menús siguen abriéndose debajo de cada
botón. En el teléfono van solo con su ícono y miden 44 px.

### 3. Entorno 3D nuevo: Ascensor
Está en la lista **Entorno** del editor de plano, después de Oficina.
- **La cabina:** mide 1,6 × 1,5 m y 2,4 m de alto. Tiene muros de acero cepillado, piso de piedra oscura y techo con
  su panel de luz.
- **En el muro del fondo:** puertas corredizas con su marco, el indicador de piso («▲ 5», en ámbar) encima y la
  botonera al lado. Con la cámara de siempre, todo eso queda detrás de los personajes.
- **En los costados:** pasamanos y las juntas de los paneles de acero.
- **Alrededor:** el pasillo del edificio. Con la cámara fuera de la cabina ya no se ven la calle ni los árboles.
- **Sin muebles.** Al elegirlo, las figuras y los objetos de mano entran a la cabina. Lo grande, como un auto o una
  mesa, se queda donde estaba, igual que las luces, las puertas y las ventanas.
- **En la planta:** se marcan el hueco de las puertas («Puertas») y los pasamanos.
- **Desde el guion:** los encabezados «INT. ASCENSOR…» o «INT. ELEVADOR…» lo eligen solos en los planos nuevos.
- **Medidas:** el ancho y el fondo de cualquier habitación ahora bajan hasta 1 m (antes, 2 m), de 0,1 en 0,1 m.
  Así puedes ajustar la cabina.

### 4. La tarjeta de cada etapa se abre al pasar el mouse
- **Al detenerte** un instante (0,12 s) sobre una etapa de la barra de la izquierda, se abre su tarjeta con sus
  pestañas, sin clic.
- **Si ya hay una abierta,** pasar a otra etapa la cambia al instante.
- **Al salir** de la etapa y de su tarjeta, se cierra 0,3 s después. Ese margen alcanza para cruzar el hueco entre las
  dos.
- **Un clic en la etapa** deja la tarjeta fija hasta que elijas una pestaña, toques fuera o pulses Esc.
- **Las etapas con una sola pestaña** no abren tarjeta: el clic va directo.
- **En pantallas táctiles y con el teclado** todo sigue igual.
- **El globo con el nombre** de las etapas de la barra de la izquierda se quitó, porque tapaba la tarjeta. El nombre
  ya está escrito debajo del ícono.
- **Las etapas siguen sin moverse** al pasar el mouse, como en la entrega anterior.

### 5. Equipo: el primer nombre y la gestión desde el mismo globo
**El botón del equipo** muestra solo tu primer nombre: «Ronal». El nombre completo aparece al pasar el mouse y es el
que oyen los lectores de pantalla. En las listas se mantiene el nombre completo, para distinguir a dos «José».

**Las caras** de quienes están conectados y **el botón del equipo** abren el mismo panel, **Equipo**:
- **Ahora en el proyecto:** quién está y en qué pestaña. Tocar a alguien te lleva a su pestaña.
- **Tú:** tu nombre y tu cargo.
- **Producción, en la web con cuentas,** gestiona el equipo ahí mismo. Cada cambio se guarda al momento:
  - **Equipo (N):** cada persona con su cargo y su botón **⋯**, que muestra:
    - **Cargo:** se cambia en la lista. Con un cargo de producción entra al presupuesto; al dejarlo, sale. Funciona
      igual que en Equipo y permisos.
    - **Permisos por pestaña…:** abre Equipo y permisos con esa persona marcada.
    - **Quitar del equipo…:** pide confirmación. No hay deshacer: para devolverle el acceso, se le vuelve a invitar.
  - **Pidieron acceso:** cada pedido trae **Aceptar**. La persona entra con lo mínimo («Personalizado») y su fila se
    abre para que le elijas el cargo.
  - **Invitar:** correo, cargo e **Invitar**. Sale la invitación para copiar, como antes.
  - Los límites de personas del plan dan los mismos avisos que antes.
- **Quien no administra** ve su cargo, sus permisos y **Salir de este proyecto…**.
- **En el escritorio y en Drive** no cambia nada más: el equipo se gestiona en la tabla de **Equipo y permisos…**.

### 6. Sin la raya sobre la pestaña elegida
- **Sólidos:** la pestaña elegida se distingue solo por su corte claro, como una ficha, sin la raya de 4 px de arriba.
- **Pastel:** tampoco lleva el subrayado de abajo. Va en su subtono.

### 7. Pastel: las barras toman el color de su pestaña
- **La barra de herramientas** de cada pestaña va en el subtono de la pestaña. Es el mismo color de la pestaña elegida
  en la franja, así que las dos se ven como una sola ficha. Antes el velo era casi blanco y no se notaba.
- **Sobre la barra,** el botón elegido va claro y subrayado en el color de la pestaña. El botón «⋯» pegado al borde
  toma el mismo color de la barra.
- **Con «Barras: Blancas»** la barra queda blanca, con una raya de 3 px en el color de la pestaña.
- **En la apariencia oscura** la barra usa la versión oscura del mismo subtono.
- **En los dos temas,** lo que se marcaba en gris ahora toma los tonos de su pestaña: el subrayado del botón elegido de
  la barra, la fila abierta de una lista, los puntos del calendario y lo elegido en algunos menús.
- **No cambian:** las barras de los paneles laterales, los colores del oficio y los PDF.

### Inglés
Todo lo nuevo está traducido en `i18n/en-manual.json`. «Ascensor» es «Elevator» y el panel del equipo sale en inglés.

## Probado

- Pasan las pruebas del programa y las 55 del servidor.
- El recorrido por las 14 pestañas no dio errores. Se probó en español e inglés, con tres anchos y en claro y oscuro.
- En inglés no quedan textos en español, salvo los nombres propios del ejemplo.
- El detector de Impeccable sigue en 12 hallazgos, todos falsos positivos. Los encabezados siguen en orden.
- **Tarjeta de etapa al pasar el mouse:**
  - se abre a los 0,12 s y cambia de etapa al instante;
  - se queda abierta sobre la tarjeta y se cierra 0,3 s después de salir;
  - el clic la deja fija;
  - con el teclado se abre y se cierra con Esc;
  - las etapas no se mueven.
- **Planta completa:** se probaron las tres herramientas en la computadora y en el teléfono, sin salir de la pantalla
  completa.
- **Ascensor:** se vio desde dentro y desde fuera de la cabina, y en la planta. Lo eligen tanto «INT. ASCENSOR» como
  «INT. ELEVADOR».
- **Equipo:** se probó en un servidor local con tres cuentas:
  - el botón muestra «Ronal»;
  - se cambió un cargo, se aceptó un pedido, se invitó y se quitó a alguien;
  - se vio el panel de quien no administra, en el teléfono y en inglés.

## Archivos

`src/`:
- **Franja, colores y barras:** `barra.js`, `shell.html`
- **Etapas al pasar el mouse:** `ui.js`
- **Planta completa y Ascensor:** `shot-editor.js`, `s3d-interiores.js`, `s3d-model.js`, `s3d-plan.js`
- **Equipo:** `share.js`

`i18n/`: `en-manual.json`

Raíz: `CAMBIOS-diseno-r5-2026-10-21.md`
