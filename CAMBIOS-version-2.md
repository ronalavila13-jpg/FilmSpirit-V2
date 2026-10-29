# FilmSpirit · versión 2 (28 de octubre de 2026)

El diseño del PDF «FilmSpirit · versión 2» aplicado a todo el programa, sin tocar la v1 ni los datos de los proyectos.

## Cómo está hecha

- **La v1 sigue igual.** La v2 va encima: `build.sh` agrega al final `src/v2*.js` (envuelven funciones de la v1 sin
  cambiarlas) y `src/v2.css` + `src/v2-pant.css` (después del CSS de la v1). Así los lotes nuevos de la v1 se traen a
  este repositorio con un `git merge` desde el remoto `v1` sin chocar.
- **Esquinas de 3 px en todo:** `build.sh` (función `v2forma`) pasa a 3 px las esquinas de 4 px o más del CSS de la
  v1 al armar; `src/shell.html` no cambia.
- **El sitio** (`server/web`): portada, entrar y legales con la forma v2. Textos nuevos en `server/i18n/*.json`
  (es, en, fr, it, pt). Viñetas del storyboard de la portada en `server/web/portada/sb-*.webp`.

## Los proyectos que ya usan el servicio

- Mismo formato de datos, mismo servidor, misma API. Sin migraciones.
- Lo único nuevo en los datos es opcional: `P.meta.kind` (el tipo de proyecto, en Proyecto › Datos › Tipo). La v1 lo
  ignora y lo conserva.
- Las preferencias de pantalla de la v2 van en claves propias del navegador (`v2sum`, `v2pins`, `v2name`, `v2role`).
- **Prueba:** `node tools/v2-compat.js v1.html v2.html` (con Playwright) abre el ejemplo en la v1, lo recorre en las dos
  versiones y compara los datos (iguales), lo trabaja en la v2 (REC, marcas, MOS, notas, «Rodado · siguiente», tipo) y
  lo vuelve a abrir en la v1 sin errores y sin perder nada. Resultado: todo bien.
- Las pruebas de `test/` dan lo mismo que en la v1: pasan todas las que corren aquí; `permisos.test.js` necesita
  `server/areas.js` (lo copia `make.js`) y `pdf.test.js` y las de PDF necesitan los módulos de npm.

## Pantallas

| Pantalla | Computadora | Celular |
|---|---|---|
| Inicio («Tu página») | PDF | PDF (barra de abajo: Inicio, Proyectos, +, Agenda, Perfil) |
| Guion, Plan de rodaje, Desglose, Presupuesto, Storyboard, Hoja de llamado | PDF | adaptadas (columnas apiladas, tiras como tarjetas, tablas que se desplazan) |
| Hoja de script | adaptada con las piezas del PDF | PDF |
| Historia, Proyecto, Guion rayado, Scouting, Casting, Animatic, Calendario, Gastos | la v1 con la forma v2 | la v1 con la forma v2 |
| Portada y Entrar | PDF | PDF |

El proyecto de ejemplo «La última función» se arma como en el PDF (rodaje el sábado y el domingo que vienen, jornada 1
con las escenas 1 y 2, tiempos, equipo y reparto). Solo el ejemplo; en inglés, el de siempre.

## Diferencias con el PDF, a propósito

- **«⋯» en la cabecera de cada pestaña** (y en el «⋯» del celular): ahí quedan las herramientas y los ajustes de la v1
  que el PDF no muestra (revisión del guion, racha de escritura, guion cerrado, ajustes del plan, locaciones, etapas,
  estilo Excel | Apple, ayuda). Sin eso se perderían funciones que los proyectos ya usan.
- **Entrar con Apple no está:** el PDF lo muestra, pero el servidor solo tiene Google. Hace falta una cuenta de Apple
  Developer y `/api/auth/apple`. Mientras tanto, la portada y Entrar ofrecen solo Google.
- **Los octavos del ejemplo** salen del texto del guion (3/8, 4/8…), no de los del PDF (5/8, 6/8…), y las horas del
  llamado las calcula el plan (07:00–08:30) en vez de las del PDF (07:30–09:00).
- **El punto amarillo del «⋯»** en el ejemplo avisa que no se guarda (de la v1).
- **La hoja del Guion sigue el estándar, no el dibujo del PDF:** página carta con acción de 60 caracteres, personaje a
  22, acotación a 16 (26 de ancho) y diálogo a 10 (35 de ancho), como `LAYOUT` (core.js) y el PDF exportado. La letra va
  de 14 a 11 px para que quepa; si no cabe, se angostan los márgenes del papel, nunca las líneas. En el celular, adaptada.
- **Barra del Guion:** además de los tipos del PDF, «Plano» y las herramientas de la v1 (deshacer, rehacer, negrita,
  itálica, subrayado, resaltar con su paleta y revisión).
- **Plan de rodaje:** «+ Etapa» y «+ Jornada» a la vista en la cabecera; la columna «Momento» de 100 px (el PDF: 86)
  para que «MADRUGADA» o «CREPÚSCULO» no pisen la locación; el estilo Cuadrícula también cambia la pantalla.
- **«Excel» y «Apple» se llaman «Cuadrícula» y «Limpio»** (Plan de rodaje y Hoja de llamado). El dato guardado sigue
  siendo `excel` o `apple`.

## Atajos de escritura (como en Final Draft)

| Atajo | Qué hace |
|---|---|
| Ctrl/⌘ + 1…7 | Escena, acción, personaje, acotación, diálogo, transición, plano (de la v1) |
| Ctrl + Alt + 1…7 (⌘ ⌥ 1…7) | Lo mismo, para navegadores donde Ctrl + número cambia de pestaña (con AltGr no hace nada) |
| Intro | Al párrafo siguiente (personaje → diálogo → acción); vacío, lo vuelve acción (de la v1) |
| Tab | Acción vacía → personaje; personaje vacío → transición; diálogo → acotación; acotación → diálogo |
| Mayús + Tab | Al revés |
| Ctrl + G | Ir a una escena |
| Ctrl + B · I · U, Ctrl + Z · Y, Ctrl + F | Formato, deshacer y rehacer, buscar (de la v1) |
| Autocompletar | Personajes y encabezados (v1), transiciones (CORTE A:…) y extensiones ((V.O.), (O.S.), (CONT.), (F.C.)) |

Al desplazarse por el guion, la escena de arriba se marca en la lista, «Página N de M» cambia y el panel de la derecha
la muestra (salvo si se está escribiendo una nota).

## Archivos

- Nuevos: `src/v2.js`, `src/v2.css`, `src/v2-pant.css`, `src/v2-guion.js`, `src/v2-plan.js`, `src/v2-desglose.js`,
  `src/v2-presupuesto.js`, `src/v2-storyboard.js`, `src/v2-llamado.js`, `src/v2-inicio.js`, `src/v2-sup.js`,
  `src/v2-pestanas.js` (Tipo de proyecto y nombres de los estilos), `src/v2-ejemplo.js`, `tools/v2-compat.js`, `server/web/portada/sb-*.webp`.
- Nuevos para publicar: `server/tools/librerias.js`. Cambiados: `server/make.js` (sigue sin PDF.js si falta), `server/deploy/actualizar.sh` (llama a librerias.js), `build.sh`, `server/web/index.html`, `server/web/portada.css`, `server/web/entrar.html`,
  `server/web/entrar.js` (botón de Google rectangular y ancho), `server/web/sitio.css`, `server/i18n/*.json`.

## Para publicar

**Con el paquete listo** (`FilmSpirit-V2-servidor.tar.gz`, la carpeta `server/` ya compilada). En una carpeta nueva,
para que no se mezcle con archivos de un paquete anterior:

```sh
scp FilmSpirit-V2-servidor.tar.gz root@IP-DE-LA-VPS:/root/
ssh root@IP-DE-LA-VPS
rm -rf /root/fs-v2 && mkdir /root/fs-v2 && tar -xzf /root/FilmSpirit-V2-servidor.tar.gz -C /root/fs-v2
cd /root/fs-v2/server && sudo bash deploy/actualizar.sh
```

`actualizar.sh` respalda la base de datos, conserva los maniquíes y el lector de PDF instalados si el paquete no los
trae, copia la versión nueva a `/opt/filmspirit` (sin tocar `/var/lib/filmspirit` ni `/etc/filmspirit`), reinicia y
comprueba que responde. Para volver a la v1: el mismo comando desde la carpeta `server/` de la v1 (los datos sirven a
las dos versiones).

**Armarlo uno mismo:** `npm install` en la raíz, las fuentes de `desktop/app/fonts` (`cd desktop && node make.js
--solo-app`) y `node server/make.js`. Sin PDF.js en `node_modules` (npm sin conexión), el paquete sale sin el lector
de PDF y `deploy/actualizar.sh` conserva el instalado (`server/tools/librerias.js`); en una instalación nueva, importar
guiones en PDF no funciona hasta compilar con npm.

**Los maniquíes 3D** (`src/s3d-figuras-datos.js`, unos 3 MB) no van en git. Se rehacen de una de estas dos formas:

- Desde la VPS ya instalada: `python3 tools/maniquies.py <carpeta instalada>/public/app/fig`.
- Desde cero, con MakeHuman (MPFB2, CC0) y `numpy`, en unos 40 segundos:

  ```sh
  git clone --depth 1 --filter=blob:none --sparse https://github.com/makehumancommunity/mpfb2 ../mpfb2
  (cd ../mpfb2 && git sparse-checkout set src/mpfb/data/3dobjs src/mpfb/data/targets src/mpfb/data/rigs/standard)
  cd fig3d && MPFB_DATA=../../mpfb2/src/mpfb/data python3 maniqui.py "" ../src/s3d-figuras-datos.js
  ```

  Sale siempre el mismo archivo (sha1 `f8183ed8…`). En la tabla `FIG3D_DATA` de `app.js` quedan
  `hombre.gz?v=4f976345f2`, `mujer.gz?v=22cabc5ff8`, `anciano.gz?v=94544b5e6c`, `anciana.gz?v=63bbf67243`,
  `nino.gz?v=b31faee097` y `nina.gz?v=3fc7321c02`. Si el `app.js` publicado tiene esos mismos códigos, son los mismos
  maniquíes.
- Si al actualizar la versión nueva llega sin maniquíes, `deploy/actualizar.sh` conserva los que ya están instalados.
