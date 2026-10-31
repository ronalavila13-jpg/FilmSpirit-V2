# Lote W · frente C: mapa general de locaciones en Scouting (26-oct-2026)

Base: lotes T, U y V. Observación 7, con la muestra visual que aprobó Ronald (escritorio y teléfono).

## Para Ronald: qué cambia y cómo se usa

**Dos vistas en Scouting.** En la barra hay un selector **«Por lugar | Mapa general»**. «Por lugar» es lo de siempre (la
ficha de cada lugar con sus candidatas). La vista elegida se recuerda en este equipo.

**Mapa general.**
- A la izquierda, **los lugares con sus candidatas** anidadas: un pin chico con su estado, el nombre y el estado en palabras
  («Elegida», «Aprobada», «Visitada», «Por visitar», «Descartada»; si no está en el mapa, «· sin ubicar»). El buscador
  busca por lugar, candidata o dirección.
- A la derecha, **el mapa con todas las candidatas como pines**. Se distinguen por la forma y el color (también en blanco y
  negro): la **elegida** es roja con un ✓ blanco; la **aprobada**, oscura rellena con un punto blanco; la **visitada**,
  blanca con borde oscuro; la que está **por visitar**, blanca con borde gris punteado; la **descartada**, gris claro, más
  chica y con una ✕. La **leyenda** va abajo a la izquierda, semitransparente.
- **Tocar un pin** (o una candidata de la lista) abre su **tarjeta**: en la computadora arriba a la derecha; en el teléfono,
  una hoja que sube desde abajo. Trae la foto (si tiene), el estado, «para <lugar>», el nombre, la dirección y, si están, las
  escenas, el permiso y las jornadas (estas solo en la elegida, que es la que va al plan de rodaje). Botones: **«Abrir
  ficha»** (vuelve a «Por lugar» en esa candidata, que parpadea un momento) y **«Cómo llegar»** (abre su enlace del mapa).
  El pin elegido se agranda con un halo.
- **Controles**: acercar, alejar y **«Ver todas»** (encuadra todos los pines). En el teléfono solo «Ver todas»: el zoom es con
  dos dedos.
- **Las ubicaciones salen solas del enlace de Google Maps** de cada candidata (el campo «Mapa» de la ficha). Sirven los
  enlaces que se copian de Google Maps en la computadora y en el teléfono: con «@lat,lng», con el lugar marcado
  («!3d…!4d…»), con «?q=», «query=», «ll=», «/place/lat,lng», y también unas coordenadas escritas a mano («-8.1116,
  -79.0287») o un enlace de OpenStreetMap.
- **Enlaces cortos** (maps.app.goo.gl, los que da «Compartir» en el teléfono): no traen el lugar. En la web con cuentas el
  servidor los sigue y saca el lugar solo; en la página publicada en Claude y en el programa de escritorio quedan «sin ubicar».
- **«Ubicar en el mapa»**: si hay candidatas sin ubicar, abajo de la lista sale un recuadro chico («1 sin ubicar · Galería
  Quiñones (Cine Primavera): su enlace no trae el lugar» + «Ubicar en el mapa»). Al tocarlo, el mapa pide «Toca en el mapa
  dónde está…»: un toque deja el pin ahí. Después **el pin se arrastra para corregirlo** (cualquier pin, no solo los puestos
  a mano). Todo se deshace con «Deshacer». Las descartadas no cuentan como «sin ubicar».
- **Sin internet** o si el mapa no carga: un aviso chico arriba del mapa; la lista y las tarjetas siguen funcionando. Si no
  carga ni el programa del mapa, sale «No se pudo cargar el mapa» con «Reintentar».
- **Solo lectura** (o sin permiso para editar el plan de rodaje): se ve el mapa y las tarjetas; no se ubican ni se mueven pines.
- El PDF y el Excel de Scouting no cambian.

**Sobre el mapa (importante):** las imágenes del mapa son de **OpenStreetMap**. Su uso es **gratuito, con la atribución
visible** («© OpenStreetMap», abajo a la derecha, ya puesta) **y para un uso moderado**. Si el tráfico de FilmSpirit crece
mucho, habrá que pasar a un proveedor de mapas con clave (MapTiler, Stadia, Mapbox u otro): es cambiar una línea
(`OSM_TILES` en src/scout-mapa.js) y la política de seguridad del servidor. OpenStreetMap no permite descargar mapas para
usarlos sin conexión: por eso el mapa no queda guardado en el equipo (la lista sí).

## Decisiones tomadas

- **Si cambia el enlace después de ubicar a mano**: si el enlace nuevo trae el lugar, **manda el enlace nuevo** (se cambió
  el enlace a propósito, lo más probable es que sea un sitio mejor ubicado); si no lo trae, **queda la ubicación puesta a
  mano**. Mientras el enlace sea el mismo, la ubicación puesta a mano (o el pin arrastrado) se respeta aunque el enlace
  diga otra cosa. Una ubicación que salió de un enlace se quita si el enlace nuevo ya no trae el lugar.
- **Datos nuevos de cada candidata** (en `P.scout.places[lugar].cands[i]`, viajan con el plan de rodaje como el resto del
  scouting): `lat`, `lng` (grados con 6 decimales), `geo` (`'link'` = salió del enlace; `'hand'` = puesta a mano o
  arrastrada) y `gmap` (el enlace que había al guardarse; así se sabe si cambió). Se limpian al abrir (`candGeoClean`) y se
  recalculan desde el enlace (`candGeoStore`). El servidor no valida la sección del scouting, así que no hizo falta tocarlo
  para esto.
- **Un enlace corto resuelto por el servidor** se guarda en la candidata sin crear un paso de «Deshacer» (no lo hizo la
  persona) y solo si quien mira puede editar. Lo resuelto se recuerda en la sesión.
- **Leaflet** (1.9.4) se carga **solo al abrir el mapa**, como las librerías de PDF: en la página publicada en Claude desde
  jsdelivr (con su huella SRI), en el servidor y el escritorio desde `app/lib`. Lo guardé en **tools/leaflet** (JS y CSS,
  165 kB) con su licencia en tools/licencias/leaflet.txt, como fflate y meshoptimizer: así server/make.js y desktop/make.js
  no dependen de node_modules (el original está en /home/claude/w-libs/leaflet, instalado con `npm install --prefix`).
- **Escritorio**: el programa bloquea todo internet (desktop/main.js · lockRequests). Para que el mapa funcione ahí, la única
  excepción son las imágenes de `https://tile.openstreetmap.org/z/x/y.png` (solo GET, solo imágenes, solo esa forma de
  dirección). También se sumó ese host al `img-src` de la política de seguridad del escritorio (build.sh). Si Ronald prefiere
  que el escritorio no salga nunca a internet, se quita esa línea y el mapa muestra el aviso de «no carga» (la lista sigue).
- **El estado del pin**: la elegida manda sobre su estado («Aprobada»); en la lista dice «Elegida».
- **La tarjeta** de una candidata sin ubicar cambia «Cómo llegar» por «Ubicar». «Cómo llegar» usa el enlace de la candidata;
  si no tiene, arma uno de Google Maps con sus coordenadas.
- **Inicio del mapa sin candidatas ubicadas**: el Perú si el equipo está en la zona horaria de Lima; si no, el mundo.
- **Teléfono**: la lista va en el cajón «Lugares» (como en las demás pestañas); la leyenda pasa arriba como fichas con su
  cuenta (como en la muestra) y solo los estados que hay; «Ver todas» arriba a la derecha; la tarjeta es una hoja abajo y la
  atribución sube con ella para no quedar tapada. Los nombres junto a los pines se ven solo en la elegida y en la tocada.
- **La ficha del lugar («Por lugar») no se reorganizó**: solo se sumó el selector de vista en la barra. El botón del frente E
  («Construir su escenario») puede ir en la cabecera de la ficha (`hdHead` de RENDER.scout, junto a «Agregar candidata»).

## Notas técnicas

- **Archivos nuevos**: src/mapa-enlace.js (lector de enlaces y ubicación de la candidata, sin pantalla: `mapLatLng`,
  `mapIsShort`, `candGeo`, `candGeoStore`, `candGeoHand`, `candGeoWhy`, `candGeoClean`, `MAP_RES`), src/scout-mapa.js (la
  vista: `loadLeaflet`, `smRender`, `smSync`, `smCardHTML`, `smSelect`, `smPlaceAt`, `smMoveTo`, `smResolveShort`; acciones
  `sc-view`, `sm-*`), server/lib/mapas.js (`makeMapas`, `shortOf`), tools/leaflet/leaflet.{js,css},
  tools/licencias/leaflet.txt, test/mapa-enlace.test.js, server/test/mapas.test.js.
- **Archivos tocados**: build.sh (FILES: `mapa-enlace scout-mapa` después de `tab-scout`; CSP del escritorio), src/tab-scout.js
  (comentario de datos, normalizar con coordenadas, `UI.scView`, el selector en la barra, recalcular al cambiar el enlace,
  ayuda «Mapa general»), src/shell.html (bloque «(lote W) Scouting · mapa general», después del CSS de candidatas),
  i18n/en-manual.json (bloque «// lote W · scouting»), server/server.js (require de mapas, `img-src` con
  tile.openstreetmap.org, `POST /api/maps/resolve`, `mapas` en lo que devuelve createServer), server/make.js y
  desktop/make.js (copian Leaflet a app/lib y suman su licencia y la atribución de OpenStreetMap), desktop/main.js (la
  excepción de las teselas), server/sw-plantilla.js (solo un comentario: lo de otros sitios ya no pasaba por el service
  worker, así que las teselas van directo a la red y no se guardan).
- **Endpoint** `POST /api/maps/resolve { url }` → `{ url }` (la dirección larga): pide sesión y la cabecera X-FS (como todo
  lo que escribe), 60 pedidos por hora por persona (`rateLimit('maps:<uid>')`, se ve en Seguridad del panel). Solo acepta
  maps.app.goo.gl/… y goo.gl/maps/…; sigue las redirecciones a mano (`redirect: 'manual'`), máximo 5, solo https (puerto
  443, sin usuario ni contraseña), y termina solo en hosts de Google Maps (google.com, google.com.pe, maps.google.*…; pasa
  por consent.google.com leyendo su `continue`). 4 s por salto, 9 s en total. Lo resuelto se recuerda un día (1000 enlaces,
  en memoria). Errores: 400 `bad_url`, 422 `no_place` / `resolve_failed`, 429 si se pasa del límite.
- **CSP del servidor**: `img-src` suma solo `https://tile.openstreetmap.org` (Leaflet se sirve desde /app/lib, así que
  script-src y style-src no cambian). La política de referencia (`strict-origin-when-cross-origin`) deja que OpenStreetMap
  reciba el origen, como pide su política de uso.
- **Pruebas**: `node test/mapa-enlace.test.js` (12: los formatos de Google Maps, coordenadas a mano y OpenStreetMap, lo que no
  trae el lugar, enlaces cortos, guardar y recalcular, ubicada a mano con enlace nuevo con o sin lugar, enlace corto
  resuelto, limpieza al abrir). `cd server && node --test test/mapas.test.js` (4, con redirecciones simuladas: qué enlaces se
  aceptan; sigue hasta Google Maps y por el consentimiento; no sigue a otros sitios, ni por http, ni a 127.0.0.1, ni más de
  5 saltos, ni a mail.google.com; el endpoint con y sin sesión, sin la cabecera, con enlace ajeno, el límite por persona y
  la CSP). Pasan todas las de test/ (menos test/pdf.test.js, que ya fallaba) y las 18 del servidor, una por una.
- **En el navegador** (Playwright, web sin compactar, Leaflet servido local; sin internet, así que las teselas salen en gris
  y aparece el aviso «El mapa no carga»): con siete candidatas en Trujillo con enlaces de cinco formatos distintos, los cinco
  estados y una sin ubicar, se revisaron en computadora (1440×900), teléfono (390×844 táctil), oscuro, inglés y solo
  lectura: pines por estado, leyenda, tarjeta (pin y lista), «Abrir ficha», «Ver todas», ubicar a mano (clic y toque),
  arrastrar un pin con el ratón y «Deshacer» de las dos cosas. Sin errores en la consola.
- **Compila**: `sh build.sh` (web) y `sh build.sh server` (Leaflet desde `lib/`).
