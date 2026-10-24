# FilmSpirit · lote E de la revisión thermos (22 de octubre de 2026): estructura

Este ZIP trae los archivos nuevos y los modificados. Descomprímelo **encima** de tu carpeta `octavos/`, **después de los
lotes A a D**. Trae `build.sh` nuevo: hace falta para los archivos nuevos.

Después arma las tres versiones, en este orden:
1. `sh build.sh`
2. `node server/make.js` (copia `src/areas.js` al servidor)
3. `cd desktop && node make.js` (lo copia al escritorio)

`filmspirit-servidor.zip` ya trae los lotes A a E. En la VPS:
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.

## Qué cambió

### 1. Las reglas del equipo, en un solo lugar
Antes había cuatro copias que ya no coincidían: la del servidor, la del escritorio y dos en la app. Ahora todas están en
`src/areas.js`, que ya usaban las tres versiones:
- las secciones;
- qué necesita leer cada pestaña;
- quién ve y edita el presupuesto;
- la limpieza de permisos;
- las áreas del desglose;
- a qué sección va cada imagen.

El servidor (`server/lib/perm.js`), el escritorio (`desktop/team.js`) y la app (`share.js`, `share-web.js`,
`share-api.js`) las toman de ahí.

**Lo que esto arregla en el escritorio**, que tenía su propia copia:
- **El presupuesto:** solo producción recibe su llave y solo producción puede firmar cambios en él, como en el servidor y
  en la app. Antes, alguien con permiso de presupuesto y otro cargo recibía la llave igual.
  - La pantalla del equipo ya no deja dar ese permiso a otros cargos, así que en un equipo armado con la app no cambia
    nada.
  - Solo cambia si alguien recibió ese permiso de otra forma.
- **El cargo cuenta al cambiarlo:** si alguien deja de ser de producción, la cerradura del presupuesto se cambia. Antes
  solo se miraban los permisos.
- **La limpieza de permisos** ya no acepta áreas como `__proto__`. Ese arreglo estaba en el servidor y no había llegado
  al escritorio.

En la página publicada en Claude, un cambio en el presupuesto de alguien sin cargo de producción ahora se ignora, igual
que en las otras versiones.

### 2. Los planes, también en un solo lugar
Los planes también están en `src/areas.js`: sus nombres, su orden y sus números de siempre (proyectos, personas, espacio
y archivados).
- **El servidor** parte de esos números y los sigue cambiando con las mismas variables de entorno de antes
  (`FREE_STORAGE_MB`, `PRO_MEMBERS`…).
- **La app** usa los que manda el servidor. Los de `areas.js` solo valen mientras todavía no llegaron.
- **Las frases «Pasa a Pro…» y «Pasa a Studio…»** (en los cinco idiomas) toman los números del plan. Antes decían «7» y
  «30» escritos a mano.

### 3. Cada versión sabe para qué se armó
`build.sh` escribe `TARGET` en el código: `'web'` (la página publicada en Claude), `'server'` (la web con cuentas) o
`'desktop'`.
- Las 27 comprobaciones que adivinaban la versión al correr (por ejemplo «¿existe `APITEAM`?») ahora la leen de ahí.
- `API()` es `TARGET === 'server'`.

### 4. Archivos más chicos
Movidos tal cual, sin cambiar el código: el resultado del armado es el mismo, salvo los encabezados de cada archivo
nuevo. Se comprobó comparando el armado de antes y el de ahora.

**`ui.js`** (1945 líneas) quedó en seis archivos, que el armado junta en este orden:

| Archivo | Líneas | Qué tiene |
|---|---|---|
| `ui.js` | 525 | estado, derivados y guardado |
| `ventanas.js` | 284 | avisos, ventanas, menús y descargas |
| `pestanas.js` | 327 | cómo se pinta cada pestaña y la franja de etapas |
| `proyectos.js` | 578 | abrir, crear, normalizar, imágenes, activos y archivados |
| `importar.js` | 166 | abrir archivos, el límite del plan y restaurar copias |
| `arranque.js` | 81 | `boot()` |

**`share-api.js`** (1059 líneas) quedó en dos:
- `share-api.js`: el servidor, las imágenes, el modo sin conexión y el transporte del equipo;
- `cuenta.js`: el botón de la cuenta, los planes y pagos, la sesión vencida y las invitaciones.

### 5. Arreglos chicos
- **Calendario: Esc cancela el arrastre.** Vale al dibujar una tarea, al mover o estirar barras y al mover una tarjeta en
  el tablero. Todo vuelve a como estaba.
- **Los avisos de pago salen en el idioma de la app.** Antes salían en el del navegador: con la app en inglés y el
  navegador en español, los pagos salían en español. Si el navegador está en portugués, francés o italiano (idiomas que
  la app no tiene), siguen en ese idioma.

## Lo que queda para otra ronda, y por qué

- **`billing.js` en un archivo por medio de pago.** Las pruebas cubren bien Mercado Pago y Paddle, pero casi nada de
  Lemon Squeezy. Partir el código de pagos sin esas pruebas es arriesgado.
  - Conviene decidir primero si Lemon Squeezy sigue (Paddle ya hace su trabajo).
  - Si sigue, sumarle pruebas antes de separar.
- **El editor de plano** (`shot-editor.js`, una función de unas 2300 líneas). Se separa por sus partes (cámara, figuras,
  luces, línea de tiempo), pero cada parte comparte decenas de variables. Necesita su propia ronda, con pruebas en el
  navegador de cada herramienta.
- **Ventanas, menús y Esc comunes.** Hoy hay 7 formas de saber si hay una ventana abierta, 35 manejadores de Esc y 56
  menús armados a mano. Unificarlos toca todas las pestañas. Conviene hacerlo con un recorrido de capturas por pestaña.
- **El CSS:** separarlo por pestaña, juntar las dos definiciones del modo oscuro y bajar los 155 `!important`. Cambia la
  prioridad de muchas reglas. Se puede hacer con la misma comparación de estilos del lote D, pero pestaña por pestaña.
- **El guardado por partes en el navegador** (`ui.js`, la copia en IndexedDB): uno de los dos escritores no es atómico.
  Si se corta a la mitad, puede mezclar versiones. Es chico y conviene hacerlo pronto, con su prueba.
- **El armado:**
  - el servidor usa las fuentes del escritorio;
  - las versiones de las librerías están en varios lugares;
  - `build.sh` mezcla shell con Python.

## Pruebas nuevas

- **`test/permisos.test.js`:**
  - el servidor usa las reglas comunes;
  - las copias del servidor y del escritorio están al día;
  - las pestañas de la app son las mismas secciones;
  - las áreas son las cajas de la hoja;
  - el presupuesto y la limpieza de permisos.
- **`test/team/permisos.test.js`** (escritorio):
  - la llave del presupuesto, solo para producción, y se cambia si alguien deja de serlo;
  - una firma de otro cargo en el presupuesto no se acepta.
- **Pruebas que cambiaron:**
  - `test/team/unit.js`: «Contabilidad» lee el presupuesto con un cargo de producción, como pide la app;
  - `server/test/api.test.js`: comprueba que el servidor use las reglas comunes.

Las pruebas nuevas del escritorio fallan con el código de antes y pasan con el de ahora.

## Probado

- **Pruebas:** pasan las del programa, las del equipo del escritorio y las 62 del servidor.
- **En un servidor local**, con la versión con cuentas:
  - el recorrido del equipo: invitar, pedir acceso, aceptar, cambiar el cargo, quitar y el panel en inglés y en el
    teléfono;
  - los planes en español, inglés y portugués.
- **En el navegador:** Esc al dibujar y al mover barras del calendario.
- **Recorrido:** 14 pestañas en español e inglés, con tres anchos y en claro y oscuro, sin errores. En inglés no quedan
  textos sin traducir.
- **Exportaciones:** los 24 tipos de PDF y los Excel, sin errores.

## Archivos

- **Raíz:** `build.sh`, `CAMBIOS-lote-E-2026-10-22.md`
- **`src/` nuevos:** `ventanas.js`, `pestanas.js`, `proyectos.js`, `importar.js`, `arranque.js`, `cuenta.js`
- **`src/` cambiados:** `areas.js`, `ui.js`, `share.js`, `share-web.js`, `share-api.js`, `barra.js`, `i18n.js`,
  `inicio.js`, `leyenda.js`, `notas.js`, `pdf.js`, `tab-budget.js`, `tab-cal.js`
- **`server/`:** `lib/perm.js`, `areas.js` (la copia), `test/api.test.js`
- **`desktop/`:** `team.js`, `areas.js` (la copia)
- **`test/`:** `permisos.test.js`, `compartir.test.js`, `team/permisos.test.js`, `team/unit.js`
