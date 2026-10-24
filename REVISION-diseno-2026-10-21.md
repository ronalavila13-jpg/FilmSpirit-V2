# FilmSpirit · revisión de diseño de toda la app (21 de octubre de 2026)

Revisé toda la interfaz con las *Web Interface Guidelines* de Vercel: `src/shell.html` (estilos y marcado) y los 60
archivos de `src/` que dibujan pantalla. Quedaron fuera los que solo generan datos, modelos 3D o PDF. Encontré
**447 puntos**: 15 de prioridad alta, 146 media y 286 baja. En esta entrega quedan **82 corregidos**, 13 de ellos
de prioridad alta. La lista completa está al final, con la línea de cada archivo **tal como queda en esta
versión**; los corregidos van marcados con ✓.

El foco fue el que pediste: **los íconos y la presencia en vivo**.

## Íconos

**Lo que había**
- Dos familias bien hechas: los íconos ilustrados de etapas y pestañas (rejilla de 32, forma sólida con sombra
  corrida y tres tonos) y los de línea `ICO` (rejilla de 24, trazo 1,8).
- Alrededor, en cambio:
  - **cinco juegos paralelos** que redibujaban lo mismo: SXI, D2_ICO, AN_IC, ED_ICO y NI;
  - **decenas de caracteres usados como ícono** (⋯ ✕ × ✓ 🔒 − + ◀ ▶);
  - una barra de arriba con 6 tamaños y 5 grosores distintos;
  - botones de 13 a 22 px, menos de los 24 px mínimos;
  - íconos de etapa sin elegir que quedaban por debajo del contraste mínimo (Producción: 2,3:1).

**Lo que cambió**
- **Íconos ilustrados**, en el mismo estilo y colores:
  - *Guion rayado*: ahora es la hoja con renglones y la línea de cobertura de un plano con sus topes. Antes parecía
    el símbolo de pausa.
  - *Plan de rodaje*: el tablero de tiras, con el peso de los demás.
  - *Presupuesto*: el billete y la moneda, centrados en su caja.
  - *Scouting*: el pin con la misma sombra corrida que el resto.
- **Etapas sin elegir**: gris con más cuerpo (`grayscale .6`, opacidad .85). El tono hondo de cada etapa queda en
  3,3:1 o más; la elegida sigue a todo color.
- **`ICO` completo**: sumé `close`, `ok`, `prev`, `next`, `search`, `camera`, `trash`, `eye`, `image` y `team`.
  - Los puntos de `palette` ahora van rellenos, como los de `more` y `list`.
  - 15 botones «⋯» de texto pasaron a `ICO.more`, 30 «✕»/«×» de texto a `ICO.close`, y los 3 🔒 a `ICO.lock`.
  - La lupa (2 copias), el chevron del equipo y el ícono del botón del equipo pasaron a `ICO`.
- **Barra de arriba**: todos los íconos miden 18 px, con trazo 1,9 y una sola clase (`.tbi`). El «+» de Nuevo es un
  poco más grueso sobre el rojo.
- **Escala de íconos**:
  - 16 px en menús y textos, 18 px en barras y 20 px en los destacados.
  - Todo botón de solo ícono mide al menos 24 × 24 px.
  - Con el dedo, el área de toque crece por fuera (`::after`) sin mover la vista.
- **Exportar**: los botones ya no pierden su ícono mientras se genera un PDF. Se marcan con `aria-busy`.

## Presencia en vivo

- **Un color fijo por persona**: una paleta de 11 colores, todos con la letra blanca a 6,4:1 o más. Antes, los
  amarillos y verdes llegaban a 2,7:1.
- **Dos iniciales** (nombre y apellido). Si la foto de la cuenta no carga, quedan las iniciales.
- **Atenuado** si tiene FilmSpirit en segundo plano más de un minuto, con la etiqueta «en otra ventana».
- **«En Inicio»** cuando vuelve a la lista de proyectos.
- Quien acaba de entrar aparece con una animación suave (sin animación si el sistema pide menos movimiento). Las
  entradas y salidas se anuncian a los lectores de pantalla («Beto entró al proyecto»), sin ruido en la pantalla.
- **La lista** («Ahora en el proyecto»):
  - es un menú de verdad, que se recorre con las flechas;
  - se actualiza mientras está abierta y mantiene el foco en la misma persona;
  - tiene nombres largos con «…»;
  - si alguien está en tu misma pestaña, dice «aquí»;
  - si se van todos con la lista abierta, el foco pasa al botón del equipo.
- **El botón de las caras** dice quiénes son y dónde están. Mide 32 px (44 px con el dedo) y muestra «+N» también
  en el teléfono.
- **Caras en pestañas y etapas**: de 15 px, con el color de cada persona. En los menús de etapa van al centro de la
  fila, para no chocar con la marca de las notas.
- **Sin caras fantasma**: si se corta el canal en vivo 20 s, las caras se quitan. Al recargar los permisos, no
  parpadean.
- **El botón del equipo** usa `ICO.team` y conserva su nombre en el teléfono.

## Otros puntos de prioridad alta corregidos

- **El foco se ve** en casillas, opciones, colores y deslizadores, y en los campos que solo cambiaban de fondo:
  hoja de llamado, «Añadir» del desglose, `.ti`, Construcción y estilo Color.
- **Ahora son botones de verdad**: el logo (vuelve a Inicio) y la carátula del guion. Los 6 campos de la ventana
  Carátula tienen su etiqueta.
- **Teclado**:
  - los «Días sin rodaje» (con el nombre completo de cada día);
  - las fotos de Desglose, Casting y Scouting;
  - el botón de notas;
  - las flechas de cámara del editor de planos (un paso por pulsación);
  - la línea de tiempo del plano, que ahora es un control deslizante: ← →, Mayús para saltos de 1 s, Inicio y Fin.
- Los botones de reproducir dicen «Pausar» cuando corresponde.
- La lista de escenas del animatic se lee en modo oscuro.

## Pendiente, en orden de prioridad

1. **Teclado en lo que todavía es solo con mouse**:
   - elegir y mover clips del animatic (alta);
   - pegar una nota (alta);
   - capas del dibujo 2D;
   - marcar el desglose seleccionando texto;
   - arrastres de la planta y de la flecha de la nota.
2. **Foco en ventanas y paneles**:
   - el menú común (`#pop`) no tiene `role`;
   - los cajones, el panel de colores, la tarjeta de nota, la ficha y el visor de fotos no llevan el foco adentro
     ni lo devuelven;
   - 6 repintados con `innerHTML` pierden el foco.
3. **Avisos**: un toast nuevo borra el «Deshacer» anterior y los toasts no se pausan con el teclado. Falta una
   región viva fija.
4. **Acciones sin confirmación ni deshacer**:
   - renumerar escenas;
   - borrar un tema;
   - restablecer colores;
   - rechazar una invitación;
   - quitar la música;
   - borrar una expresión.
5. **Unificar los íconos que quedan** en `ICO`: SXI, D2_ICO, AN_IC, ED_ICO y NI. También pasar a ícono los −/+,
   ◀/▶, ⤢ y ✓ de texto.
6. **Rendimiento en proyectos largos**:
   - las páginas del guion, el editor, el plan, la hoja de script y los elementos se pintan enteros, sin
     `content-visibility` ni virtualización;
   - el editor de planos lee el layout 4 veces por cuadro.
7. **Campos sin nombre**:
   - los buscadores de escenas, del desglose y de personas;
   - el guion técnico;
   - Centro de salud.
   Además, los teléfonos y correos de terceros necesitan `autocomplete="off"`.
8. **Contraste y tokens**:
   - iniciales del calendario;
   - texto blanco sobre `--accent` en oscuro;
   - textos en `--faint`;
   - 4 tokens sin definir y unos 16 colores fijos que no cambian en oscuro.
9. **Teléfono y PWA**:
   - `env(safe-area-inset-*)` en barras, cajones y hojas;
   - `overscroll-behavior: contain`;
   - landmarks `nav` y `main` correctos y un enlace para saltar al contenido.
10. **Formatos**:
    - moneda de los pagos, números con coma y tiempo relativo con `Intl`;
    - placeholders que terminen en «…»;
    - mensajes de error con el siguiente paso.

## Lista completa

Cada línea es `archivo:línea - [prioridad] hallazgo`, con la línea de esta versión. Los corregidos dicen
«✓ corregido» y cómo; «◐ en parte» indica lo que quedó a medias. [ICO] marca lo de íconos y [PZ] lo de presencia.

Total: 447 hallazgos · alta 15 · media 146 · baja 286 · [ICO] 91 · [PZ] 26
Corregidos en esta ronda: 82 (alta 13 · media 30 · baja 39)

## src/shell.html

src/shell.html:209 - [alta] `input:focus{outline:none}` también alcanza checkbox/radio/color/range: anula el `:focus-visible` global (62) y el reemplazo (borde + anillo --accent-soft ≈1,1:1) no se ve en controles nativos → foco invisible; solo .suprow lo repone (4120). Limitar a campos de texto o dar `:focus-visible` propio a checkbox/radio — ✓ corregido: anillo de foco propio para casillas, opciones, colores y deslizadores
src/shell.html:456 - [alta] `.box .add input:focus{box-shadow:none}` + `border:0` (453) + outline:none (207) → el campo «Añadir» de las cajas del desglose no tiene ningún indicador de foco — ✓ corregido: anillo de foco
src/shell.html:703 - [alta] `.daytoggle input{display:none}` (repetido en 1982): los checkbox de «Días sin rodaje» (tab-plan.js:1047) salen del orden de tabulación y del árbol de accesibilidad → no se operan con teclado ni lector; ocultar visualmente (.sr) y mostrar el foco en la etiqueta — ✓ corregido: casillas visibles para el teclado y con el nombre del día
src/shell.html:1695 - [alta] `.an-scenes select option{color:#111}` sobre el fondo global de opción `var(--surface)` (205) → en oscuro #111 sobre #222: la lista desplegada es ilegible — ✓ corregido: color del tema
src/shell.html:4345 - [alta] `#brand` es un `<div>` con click (ui.js:1784; cursor:pointer en 2839) sin role/tabindex/teclado; `aria-label` en un div genérico se ignora → usar `<button>`/`<a>` — ✓ corregido: ahora es un <button>
src/shell.html:1 - [media] el shell no trae doctype, `<html lang>`, charset ni viewport; el build web lo publica tal cual (`cat src/shell.html`, build.sh:46) → modo quirks, sin idioma ni viewport móvil. En server, theme-color fijo #F2F3F5 (build.sh:38) sin variante oscura y distinto de --bg
src/shell.html:89 - [media] range: `:focus-visible{outline:none}`; el único reemplazo (mostrar el círculo) está dentro de `@media (hover:hover)` (91-92) → sin indicador con táctil+teclado y débil en escritorio
src/shell.html:114 - [media] .topbar sin env(safe-area-inset-top/left/right) aunque el build server usa viewport-fit=cover → en horizontal o como PWA la muesca tapa logo y botones; igual el riel #tabs en el borde izquierdo (4062)
src/shell.html:217 - [media] .chip .x ≈13×13px con puntero fino (<24); solo el táctil lo agranda (3117) — ✓ corregido: área de toque de 24 px
src/shell.html:246 - [media] cajón .insp.open (overflow:auto de 230) sin overscroll-behavior:contain; sin safe-area abajo/derecha
src/shell.html:253 - [media] cajón .side.open sin overscroll-behavior:contain ni safe-area abajo/izquierda (igual .b-bio-cols>.side.open 4174)
src/shell.html:368 - [media] texto #fff sobre var(--accent): en oscuro (#F2602C) ≈3,2:1 → usar var(--accent-ink). Igual en 2900 (#openBtn .pc), 3162 (#noteAdd .cnt), 4217 (.fcal-d.sel)
src/shell.html:504 - [media] .dlg>.body (overflow:auto) sin overscroll-behavior:contain → el scroll del modal / hoja inferior encadena al fondo
src/shell.html:660 - [media] .brk-ok «✓ Completada»: #fff sobre var(--ok) ≈3,1:1 en claro y 2,1:1 en oscuro (13px)
src/shell.html:1043 - [media] .sx-view.full con padding-top fijo de 10px, sin env(safe-area-inset-top); igual .sx-plan.full (1058)
src/shell.html:1123 - [media] panel del plano: .icbtn svg 16/1,8 con excepciones 15 (1181), 17 (1285) y trazo 2 (2588); vecinos a 15 (1197, 1271), 17 (1168) y 18 (1205)
src/shell.html:1186 - [media] .rr-step .icbtn 22×22 (<24), sin agrandar en táctil — ✓ corregido: 24 px
src/shell.html:1233 - [media] selectores de color con `<input type=color>` en opacity:0 (.sw-pick; también .lk-ink-o 3823 y .lgp-other 3832) y sin :focus-within en el contenedor → foco de teclado invisible — ✓ corregido: anillo de foco en el contenedor
src/shell.html:1314 - [media] .acc-x:hover usa var(--panel), que en claro es igual a --surface (#FFF) → cerrar no responde al hover
src/shell.html:1343 - [media] editor de accesorios a pantalla completa en teléfono (100dvh): .acc-hd/.acc-ft sin safe-area; .acc-card (1306) con overflow:auto sin overscroll-behavior
src/shell.html:1433 - [media] storyboard 2D: .s2i 20/1,7, 18 (1431), 15 (1486, 1509), 17 (1497, 1504), 16 (1522) → en la misma fila de capa, candado de 15 y ojo de 17
src/shell.html:1721 - [media] hoja .an-insp.sheet (overflow:auto de 1570) sin overscroll-behavior:contain
src/shell.html:1776 - [media] .ti:focus = el mismo fondo --fill que :hover (1772), borde transparente !important; solo queda el anillo --accent-soft de 207 (≈1,1:1) → foco indistinguible del hover — ✓ corregido: anillo de foco
src/shell.html:1913 - [media] iniciales #fff sobre hsl(h 52% 42%): ≈2,7:1 con h≈60; solo los tonos de ~200 en adelante llegan a 4,5:1 — ✓ corregido: paleta de 11 colores, todos ≥ 6,4:1 con la letra blanca
src/shell.html:1917 - [media] .pz-dots (top:3px right:1px) se tapa con la marca de nota .tab>.nb (3187, top:1px right:-3px); además va aria-hidden (share.js:247), así que quién está en cada pestaña no le llega al lector — ✓ corregido: en los menús de etapa, las caras van al centro
src/shell.html:1928 - [media] las filas desactivadas del menú de presencia (share.js:265) con opacity:1 → se ven iguales a las activas y el Tab las salta; contradice «Toca a alguien…» — ✓ corregido: aria-disabled y «· aquí»
src/shell.html:1929 - [media] a ≤600px `.pz-av:nth-child(n+3)` también oculta .pz-more (5.º hijo, share.js:239) → 2 avatares sin «+N» — ✓ corregido: «+N» siempre; 2 caras en el teléfono
src/shell.html:1929 - [media] [PZ] en ≤600px, .pz-bar .pz-av:nth-child(n+3){display:none} oculta también el chip .pz-more (+N, que también es .pz-av) → con 3 o más personas el teléfono muestra 2 caras y nada que indique que hay más. — ✓ corregido: «+N» siempre; 2 caras en el teléfono
src/shell.html:1993 - [media] misma barra de pestaña: .qbtn .ic 19px, .sc-bar .btn.icon .ic 18px (2710), .mk-btn .mk-ic 16px (3367), resto .ic 1,15em (3094)
src/shell.html:2026 - [media] .tip-x ≈17×21px con puntero fino — ✓ corregido: 24 px
src/shell.html:2125 - [media] #B4432C fijo en los números de los días de rodaje → en oscuro <3:1; también #C8382C (2109, 2116) fuera de los tokens
src/shell.html:2224 - [media] .lam-h usa border var(--bg) sobre la lámina A4 siempre blanca: en claro --bg es #F5F6F8 (3029) y casi no se ve; en oscuro sale negra → la lámina cambia con el tema
src/shell.html:2238 - [media] .lam-x 22px, sin :hover propio y sin agrandar en táctil — ✓ corregido: 24 px y área táctil
src/shell.html:2248 - [media] visor de fotos: el ✕ va a top/right 14px sin safe-area; .btn.ghost:hover pone var(--fill) detrás del ✕ #fff (blanco sobre gris claro en el tema claro)
src/shell.html:2256 - [media] hoja de llamado: `.cs input/textarea:focus` = fondo de :hover (2238), borde transparente, sin outline ni anillo (igual .cm-notes textarea 3948) — ✓ corregido: anillo de foco
src/shell.html:2256 - [media] hoja de llamado: .cs input:focus{outline:none;box-shadow:none;background:var(--fill)} se ve igual que hover (≈1,1:1) → ningún campo de la hoja muestra el foco. — ✓ corregido: anillo de foco
src/shell.html:2522 - [media] .cl-p .x 20px con ✕ de 10px; queda fuera de la ampliación `.chip .x::after` (3117) — ✓ corregido: 24 px
src/shell.html:2759 - [media] texto de ayuda de los párrafos vacíos (::after) en var(--faint) ≈2,3:1 sobre la hoja (también 2745) → usar --ph
src/shell.html:2779 - [media] .av-d:focus: solo un tinte del 7 % de acento, borde 0, outline:none
src/shell.html:3024 - [media] .cal-dx 16×12 (3007), .cal-bx 16 (3014, 3936) y .kb-open 18; en táctil solo .cal-dx recibe el ::after (3117) — ✓ corregido: área de toque por fuera
src/shell.html:3116 - [media] bloque pointer:coarse a 34-38px (<44); omite .icbtn 30 (1116), .pl-ov 28 (1087), .rhythm .tb 28 (1608), .s2-lk 24 (1485), .s2-eye 26 (1503), .tm-mo 26 (2962), .cal-te 26 (2134), .cal-segx 26 (2198), .sbx-plus 26 (1787), .pj-act 30 (2924), .pz-bar (1905) — ✓ corregido: área táctil por fuera (::after) en esos selectores
src/shell.html:3399 - [media] input.b-act-n:focus = fondo de :hover + outline:none; solo queda el anillo --accent-soft (≈1,1:1) — ✓ corregido: anillo de foco
src/shell.html:3642 - [media] estilo Color: `.bar :is(input,select):focus` = fondo de :hover (3623), box-shadow:none; por especificidad anula el anillo de 3634
src/shell.html:3645 - [media] flecha del select de la barra con trazo fijo %23222 → invisible en barras oscuras (Animatic #000 3592, data-bardk 3988); usar mask + currentColor como en 3630
src/shell.html:3773 - [media] .topbar/#tabs se esconden al desplazar con transition:margin-top (layout de toda la app) → usar transform
src/shell.html:4097 - [media] teléfono con «deshacer» visible: .stg-h baja a 31px (27px a ≤370px, 4085) y los íconos pasan de 21 a 19 y a 17px
src/shell.html:4267 - [media] el estado elegido de la barra se define 6 veces (3605, 3976, 3981/3985, 4096-4103) y al final con !important → cascada contradictoria
src/shell.html:4348 - [media] íconos de la barra superior dispares: deshacer/rehacer 17 trazo 2 (136), notas 19×18 trazo 1,9 (3160), ayuda 17 (4305), Compartir/Proyectos/Nuevo 16 (4306-4308; «+» trazo 2,4), idioma 16 trazo 1,8 (4309), «más» 18 (4310), aviso 18 (129) — ✓ corregido: barra de arriba: todos de 18 px y trazo 1,9 (.tbi)
src/shell.html:4358 - [media] `<nav role="tablist">` pierde el landmark de navegación; ui.js:851-857 mete botones .stg-h (no son tabs) y envoltorios role=presentation, con las tabs dentro de menús → tablist inválido
src/shell.html:4375 - [media] `<main role="tabpanel">` anula el landmark main (sin aria-labelledby); no hay skip link antes de la barra y el riel de etapas (4297)
src/shell.html:59 - [baja] no hay touch-action:manipulation global (solo .kb-card 1378); tap-highlight solo en .vp-cam/.vp-ic/.vp-cube (926, 943, 987)
src/shell.html:125 - [baja] .save.off #E5A50A y el punto de aviso #E0A100 (3749), fuera de --warn
src/shell.html:145 - [baja] carriles horizontales sin overscroll-behavior-x:contain (143, 947, 1524, 1634, 1729, 3727, 3759, 3777, 4071)
src/shell.html:221 - [baja] .badge.n/.badge.ext (220) con colores fijos, sin variante oscura
src/shell.html:340 - [baja] .mn-dot ≈25×21px y sin :hover
src/shell.html:380 - [baja] .qs-l2 input: el foco solo se ve en el borde de 1px al 55 % de .qs-line:focus-within (379)
src/shell.html:430 - [baja] .legend button (fuera de .cat-chips) sin :hover
src/shell.html:476 - [baja] .panel .fr: background-color var(--panel) pisado por background:#FAFAF7 (contradictorio; claro en oscuro, fuera de 3082)
src/shell.html:485 - [baja] .sbmore sin :hover/:active propio; 34px en táctil (485)
src/shell.html:516 - [baja] .shv-pl #F7F6F2 fijo, fuera de la atenuación en oscuro (3082)
src/shell.html:539 - [baja] muestras de color <24px: 537, 680, 1261, 3399, 3430; .swatches button (690) sin :hover
src/shell.html:591 - [baja] .pday.flash definido dos veces (589 transition / 2646 keyframes); anima box-shadow (también 2816, 3198)
src/shell.html:668 - [baja] .pl-selbar sticky bottom:14px sin safe-area-inset-bottom
src/shell.html:709 - [baja] chips que son botones sin :hover: 706, 791, 1161, 1348, 4221
src/shell.html:842 - [baja] <summary> sin :hover: 839, 1000, 2024, 2819, 2937
src/shell.html:874 - [baja] .take sin :hover
src/shell.html:923 - [baja] íconos sobre la viñeta: 16/2, 21/1,7 (939), 15 (942), 19/1,7 (952)
src/shell.html:947 - [baja] .vp-ic:hover #FFF frente a reposo rgba(250,250,248,.94) → hover imperceptible
src/shell.html:963 - [baja] radios mezclados: tokens 2px (25) → 10/8/6 (3029) → 2px (3495), más 2px fijos, 4px (322), 6px (960), 999px (1905)
src/shell.html:1025 - [baja] hovers casi invisibles: .pose-btn (1022), .kb-card (1379), .hlch (3841)
src/shell.html:1058 - [baja] .vp-part button declarado dos veces (1053 y 1055)
src/shell.html:1248 - [baja] .fe-tools (1245) y .acc-tools (1321) sin :hover
src/shell.html:1455 - [baja] .s2-insp sin overscroll-behavior; .s2 (1420) sin safe-area izquierda/derecha
src/shell.html:1561 - [baja] .s2-title b nowrap sin ellipsis en el teléfono → desborda
src/shell.html:1593 - [baja] barra de ritmo: 14/1,6, 16/1,5 (1610), 18 (1733)
src/shell.html:1655 - [baja] .clip .trim de 9px (16px en táctil, 1655)
src/shell.html:1691 - [baja] .anchip sin :hover
src/shell.html:1722 - [baja] .an-insp-x sin :hover
src/shell.html:1897 - [baja] .lic-chip.trial: --accent sobre --accent-soft ≈4,2:1 (usar --accent-text); border-color sin borde
src/shell.html:1908 - [baja] .pz-bar ≈30px, sin agrandar en táctil; píldora de 999px frente a las esquinas de 2px — ✓ corregido: 32 px (44 px táctil)
src/shell.html:1908 - [baja] [PZ] #pzBar mide ≈30×30px: blanco táctil chico para el teléfono (<44px). — ✓ corregido: 32 px (44 px táctil)
src/shell.html:1916 - [baja] .pz-more en oscuro ≈4,0:1 a 11px — ✓ corregido: +N con --ink sobre --fill-2
src/shell.html:1916 - [baja] [PZ] chip +N en modo oscuro: --muted sobre --fill da 3,98:1 a 11px (<4,5:1). — ✓ corregido: +N con --ink sobre --fill-2
src/shell.html:1918 - [baja] .pz-av.sm 14px con iniciales de 8px; anillo var(--bg) frente a var(--chrome) de .pz-av — ✓ corregido: 15 px y color propio de cada persona
src/shell.html:1918 - [baja] [PZ] las caras de pestaña miden 14px con inicial de 8px: ilegibles, y dos personas con la misma inicial y tono parecido no se distinguen. Además .pz-dots va en position:absolute arriba a la derecha (1912) y con 3 caras puede taparle el texto a la pestaña. — ✓ corregido: 15 px y color propio de cada persona
src/shell.html:1921 - [baja] [PZ] un nombre largo sin espacios (un correo usado como nombre) no tiene overflow-wrap ni ellipsis en .pz-menu → aparece scroll horizontal dentro del .pop (máx. 320px). — ✓ corregido: ellipsis
src/shell.html:1937 - [baja] .team-btn sin :hover — ✓ corregido: :hover
src/shell.html:1975 - [baja] .buy-cycle button sin cursor ni :hover
src/shell.html:2341 - [baja] .cs-x en --faint ≈2,3:1; igual .tm-mo (2962)
src/shell.html:2460 - [baja] .cl-end #222222 = --surface oscuro → se funde con la hoja
src/shell.html:2595 - [baja] sin tabular-nums: 2578, 555, 2105, 2675, 607
src/shell.html:2654 - [baja] tokens no definidos: --ink-2 (2637), --sh-2 (2848), --bad-text (3835), --danger (4198)
src/shell.html:2717 - [baja] .ed-ico con transition:top → transform; 22px en teléfono (2707)
src/shell.html:2775 - [baja] AV contenteditable: foco 5 % (2758); ninguno en .av-h .ep (2766)
src/shell.html:3075 - [baja] .dlg con sombra clara fija que pisa la --sh-pop oscura
src/shell.html:3205 - [baja] .tab>.nb clicable de 14×14 con puntero fino — ✓ corregido: área de toque por fuera
src/shell.html:3250 - [baja] .nf-in: reemplazo de foco amarillo sobre amarillo (3234)
src/shell.html:3255 - [baja] .nf-more y .np-filter button (3261) sin :hover
src/shell.html:3320 - [baja] 14 títulos sin text-wrap:balance (224, 470, 501, 816, 1619, 2162, 2282, 2406, 2842, 2895, 3307, 3312, 3332, 3441)
src/shell.html:3359 - [baja] .b-sheet .b-ta:focus sin indicador (solo el cursor de texto)
src/shell.html:3560 - [baja] 14 reglas casi iguales por pestaña; tokens oscuros duplicados (33-45 = 46-57; 4009-4019 con guardas distintas)
src/shell.html:3597 - [baja] #D4370F fijo ×6 (3579-3581, 3596-3597)
src/shell.html:3883 - [baja] .lk-thm 24×22
src/shell.html:3941 - [baja] .cm-n ≈19px y .cm-more 16px (3926) de alto
src/shell.html:4272 - [baja] «ningún texto bajo 11 px» contradicho por ~26 reglas (861, 911, 1232, 1391, 1637-1638, 1741, 1913, 1939, 1943, 2073, 2104, 2151, 2505, 2641, 2787, 2856, 2881, 2900, 3162, 3178, 3780, 3885, 3965, 4155-4162, 4264)
src/shell.html:4283 - [baja] .tip-x opacity:.7 → ✕ <3:1
src/shell.html:4349 - [baja] #noteAdd con aria-haspopup="menu" y aria-pressed a la vez
src/shell.html:4354 - [baja] #newBtn solo ícono a ≤760px, nombre solo por title — ✓ corregido: aria-label
src/shell.html:4355 - [baja] data-no-tr propio → translate="no"

## src/ui.js

src/ui.js:430 - [media] «No se pudo guardar», «El almacenamiento del proyecto está lleno», «El navegador no tiene más espacio» (430, 434-436) sin siguiente paso; fuera de la web con cuentas no hay reintento (425 solo re-marca dirty)
src/ui.js:514 - [media] toast() borra todos los toasts previos: cualquier aviso nuevo (p. ej. actividad remota, notas.js:776) elimina un «Deshacer» de toastUndo (historial.js:135)
src/ui.js:524 - [media] toast con acción pausa solo con pointerenter; sin focusin/teclado, «Deshacer»/«Reintentar» se va antes de llegar con Tab (y queda al final del body)
src/ui.js:669 - [media] popover `#pop` sin role (menu/dialog) ni nombre, aunque los disparadores anuncian aria-haspopup="menu"/"dialog" (barra.js:36-39, inicio.js:205); ítems no son menuitem; Tab sale y lo deja abierto
src/ui.js:789 - [media] pestaña y escena solo en localStorage/sessionStorage (también 1797, inicio.js:28-29,54): la URL no las refleja (solo ?p=) → sin enlace profundo ni atrás/adelante
src/ui.js:1005 - [media] openDrawer no mueve ni atrapa el foco; closeDrawers (1004) no lo devuelve
src/ui.js:1014 - [media] banners (#banners) sin role=status/aria-live: remoteBanner (1027) y «Tienes acceso de lectura» (1023) llegan asíncronos y no se anuncian
src/ui.js:1065 - [media] «No se pudo abrir ese proyecto.» y se abre el ejemplo sin decirlo; falta siguiente paso (reintentar / volver a Proyectos)
src/ui.js:1538 - [media] «Rechazar la invitación» (✕, 1498) inmediato: sin confirmación ni deshacer, irreversible
src/ui.js:1650 - [media] toast «Leyendo el PDF…» dura 1,6 s pero la lectura página a página (1629-1632) tarda más: sin indicador persistente
src/ui.js:1784 - [media] `#brand` es `<div>` (shell.html:4299) con click → Inicio: sin role/tabindex/teclado; usar `<button>`. El aria-label en div genérico (19) se ignora — ✓ corregido: #brand es un <button>
src/ui.js:37 - [baja] campos no-auth sin autocomplete="off": tmIn (37), barra.js:458, leyenda.js:355, 435, 595, 636
src/ui.js:515 - [baja] el toast crea el nodo role=status ya con texto (varios lectores no lo anuncian) → contenedor aria-live persistente; errores de problem() (538) siguen polite, usar role=alert
src/ui.js:557 - [baja] [ICO] cerrar modal con glifo de texto «✕» (también 1498, barra.js:86); ICO no tiene close y cada archivo usa otro (NI.x notas.js:258, «×» leyenda.js:591) — ✓ corregido: ICO.close
src/ui.js:755 - [baja] errores sin siguiente paso: 755, 766, 776, 1411, 1421, 1432, 1550, 1627, 1653, 1654, 1745, 1748 («Ese archivo no es un proyecto válido.» → «Elige un archivo .fsp»)
src/ui.js:790 - [baja] [PZ] setTab emite presencia TIO().here(t) en cada cambio, también por cada flecha (1804); solo share-api.js:378 lo agrupa (400 ms)
src/ui.js:836 - [baja] scrollTo con behavior:'smooth' explícito ignora prefers-reduced-motion (la regla global shell.html:3085 no alcanza al JS)
src/ui.js:850 - [baja] dentro de role=tablist (#tabs) hay botones que no son tab (.stg-h 851, #tabsCfg 1779) → árbol ARIA inválido
src/ui.js:853 - [baja] [ICO] chevron de etapa inline (`m6 9 6 6 6-6`, trazo 2.2, shell.html:165) ≠ ICO.chev (`m7 10 5 5 5-5`, trazo 1.8)
src/ui.js:1060 - [baja] «Abriendo proyecto…» sin role=status/aria-busy
src/ui.js:1465 - [baja] foco + select en el título del proyecto nuevo también en táctil (abre teclado); modal() sí lo evita (578)
src/ui.js:1492 - [baja] [ICO] íconos inline fuera de ICO: archivar/desarchivar (1493-1494), «⋯» 2× (1501, 1518: círculos 6/12/18 sin fill, relleno por shell.html:2930; ICO.more 5.5/12/18.5 con fill), lupa (1517 = inicio.js:104) — ✓ corregido: lupa → ICO.search
src/ui.js:1513 - [baja] tabs Activos/Archivados: role=tab sin aria-controls ni tabindex itinerante, sin Izq/Der; tabpanel (1519) sin aria-labelledby
src/ui.js:1517 - [baja] placeholder «Buscar proyecto» sin «…»
src/ui.js:1520 - [baja] [ICO] «+ Nuevo» con «+» de texto mientras «Nuevo guion» (inicio.js:216) usa ICO.plus; igual «+ Color» (leyenda.js:340)
src/ui.js:1525 - [baja] el filtro de proyectos repinta en cada tecla y no anuncia cuántos quedan
src/ui.js:1667 - [baja] primera persona «No encontré encabezados de escena…» → «No hay encabezados de escena (INT./EXT.)…»
src/ui.js:1722 - [baja] [ICO] «✓» de texto en el toast de importación (se lee «marca de verificación»)
src/ui.js:1779 - [baja] [ICO] #tabsCfg usa el carácter «⋯» (texto 15 px, peso 800) en vez de ICO.more — ✓ corregido: ICO.more
src/ui.js:1800 - [baja] flechas en la tablist activan la pestaña al instante (render completo por pulsación); activación manual con Enter/Espacio

## src/barra.js

src/barra.js:134 - [media] livePop repinta `.lp` con innerHTML tras cada clic (131) y change (134): el control con foco se destruye
src/barra.js:50 - [baja] [ICO] tooltip ≠ nombre: title «Más» vs aria-label «Ajustes, ayuda y exportar»; tip-x (86) «No volver a mostrar» vs «Cerrar consejo»
src/barra.js:58 - [baja] `<h6>` de optgroup dentro de role=listbox → role=group + aria-label
src/barra.js:97 - [baja] [ICO] tip-x «✕»: ~16×20 px con puntero fino (shell.html:2009) < 24 px (en táctil sí crece, 3106) — ✓ corregido: 24 px y ICO.close
src/barra.js:186 - [baja] phoneBars: lee scrollWidth/clientWidth tras cada pick() (escritura) → reflow por iteración en cada render del teléfono
src/barra.js:193 - [baja] barTabName mide, inserta y vuelve a medir en cada render
src/barra.js:210 - [baja] [ICO] en el «⋯» del teléfono todo botón lleva ICO.plus y todo campo ICO.gear (197), haga lo que haga
src/barra.js:217 - [baja] [ICO] helper I() con 14 SVG inline sin class="ic" (206-218, 343-351): duplican ICO.warn (209), ICO.help (214, 346); globo 2× (218, 350), correo 2× (348); trazo/tamaño por reglas aparte (shell.html:3751, 3813)
src/barra.js:219 - [baja] `<img>` del avatar sin width/height
src/barra.js:292 - [baja] cerrar un consejo elimina el botón con foco: el foco cae al body
src/barra.js:350 - [baja] helpMenu espera fetch('/api/config') antes de abrir, sin feedback
src/barra.js:399 - [baja] tone(): lee offsetTop/offsetLeft en el bucle que hace classList.toggle; corre por cada nodo agregado (451) y en ResizeObserver
src/barra.js:405 - [baja] masonry por JS en vez de CSS columns/grid
src/barra.js:443 - [baja] hex inválido se revierte en silencio
src/barra.js:465 - [baja] escribir el valor del deslizador solo con clic en `<output>` (sin teclado); aria-label genérico «Valor» (459)

## src/inicio.js

src/inicio.js:146 - [media] «Rechazar» invitación (119) inmediato, sin confirmación ni deshacer
src/inicio.js:67 - [baja] [PZ] homeShow no avisa presencia (posRestore sí, 61): el equipo te ve en la última pestaña mientras estás en Inicio (share*.js no maneja Inicio) — ✓ corregido: avisa «en Inicio»
src/inicio.js:104 - [baja] «Cargando proyectos…» sin role=status/aria-busy; el segundo homePaint (81) reemplaza #homeQ (se pierde foco/texto)
src/inicio.js:105 - [baja] placeholder «Buscar» sin «…» — ✓ corregido: lupa → ICO.search
src/inicio.js:105 - [baja] [ICO] lupa inline duplicada (= ui.js:1517) — ✓ corregido: lupa → ICO.search
src/inicio.js:153 - [baja] abrir desde Inicio solo deshabilita la tarjeta; «Abriendo proyecto…» va a #view, oculto con body.home (shell.html:2836)
src/inicio.js:206 - [baja] [ICO] «Mis guiones» en teléfono: texto en .hide-sm (display:none) → nombre solo por title; añadir aria-label
src/inicio.js:209 - [baja] «No se pudo cargar la lista de guiones.» sin «Reintentar»

## src/leyenda.js

src/leyenda.js:357 - [media] muestras con aria-label «Color #FFE9A8» (357, 358, 437); usar colorName() (ui.js:44), que existe para esto
src/leyenda.js:365 - [media] lgPop repinta innerHTML tras elegir muestra/restablecer: se pierde el foco
src/leyenda.js:566 - [media] panel «Colores y temas»: no mueve el foco al abrir; Esc solo con foco dentro (574); lookClose (582) no lo devuelve
src/leyenda.js:607 - [media] «Restablecer: Pastel y la pantalla de siempre» sin confirmación (625); afecta a todo el equipo y la pantalla (ls «screen» fuera del deshacer); toast sin «Deshacer»
src/leyenda.js:643 - [media] «Borrar el tema» inmediato, también en la cuenta (498-499): sin confirmación ni deshacer
src/leyenda.js:435 - [baja] placeholders sin «…» (435, 595)
src/leyenda.js:446 - [baja] foco automático también en táctil (446, 609, 640)
src/leyenda.js:559 - [baja] primera persona «Pasamos a modo claro…» → «Se pasó al modo claro…»
src/leyenda.js:587 - [baja] [ICO] «⋯» de texto en vez de ICO.more, sin title — ✓ corregido: ICO.more
src/leyenda.js:589 - [baja] seg role=group sin nombre (604-605): aria-labelledby al span
src/leyenda.js:591 - [baja] [ICO] cerrar depende de NI.x (notas.js) con reserva «×», distinta de «✕» (ui.js:557) — ✓ corregido: ICO.close

## src/notas.js

src/notas.js:483 - [alta] #noteAdd solo escucha pointerdown: Enter/Espacio no hace nada → sin teclado no hay menú, ni «Notas y actividad» (npOpen solo desde 531), ni ocultar notas — ✓ corregido: Intro/Espacio abre el mismo menú
src/notas.js:545 - [alta] «Pegar una nota» elige el lugar solo con el siguiente pointerdown o arrastrando (497-519): sin alternativa de teclado
src/notas.js:150 - [media] notesPaint (cada render, ui.js:997) recrea todos los globos (pierde el foco si uno lo tenía) e intercala getComputedStyle (164, 181, 205) y scrollWidth (197) con appendChild/classList; nbTone (60-67) lee rects y escribe clases en el mismo bucle
src/notas.js:268 - [media] tarjeta .nf role=dialog: noteThread (367) no mueve el foco (queda al final del body), nfClose (307) no lo devuelve; la de nota nueva (325) sin aria-label
src/notas.js:404 - [media] thRepaint y npPaint (876) reemplazan innerHTML tras clic (resolver, resueltas, filtros, Notas/Actividad): se pierde el foco
src/notas.js:778 - [media] cada cambio ajeno abre un toast que reemplaza el actual (ui.js:514), incluido tu «Deshacer»
src/notas.js:822 - [media] npOpen no mueve el foco al panel (npClose solo lo devuelve si UI.kbd, 845)
src/notas.js:26 - [baja] [ICO] mapa paralelo NI (255-265) + 3 glifos de nota (NOTE_ICO 26×24 relleno, NOTE_BUBBLE 24×24 trazo, NOTE_PIN 26×24) + el de #noteAdd (shell.html:4303); NI.back = ICO.undo, NI.edit ≠ ICO.edit
src/notas.js:111 - [baja] tiempo relativo a mano («hace N min», «hoy», «ayer») → Intl.RelativeTimeFormat
src/notas.js:166 - [baja] [ICO] globo en la pestaña: 14×14 px con puntero fino (shell.html:3187) < 24 px
src/notas.js:370 - [baja] [ICO] «Cerrar» solo-ícono sin title (370, 851, 858)
src/notas.js:379 - [baja] scrollIntoView smooth (379, 796, 810) sin prefers-reduced-motion
src/notas.js:540 - [baja] #noteAdd con aria-haspopup="menu" y aria-pressed a la vez
src/notas.js:872 - [baja] error de actividad sin «Reintentar»
src/notas.js:874 - [baja] actividad: hasta 400 ítems (735) + páginas del servidor sin virtualizar, repintados enteros con cada cambio (740, 769)

## src/historial.js

src/historial.js:148 - [baja] tooltips con «Ctrl+Z»/«Ctrl+Mayús+Z» fijos; en Mac es ⌘ (153 acepta metaKey)

## src/arrastre.js

src/arrastre.js:68 - [media] flipPlay: getBoundingClientRect (68) y style.transform (70) en el mismo bucle → reflow por elemento
src/arrastre.js:96 - [media] sweepSelect: cada frame escribe el recuadro (96) y lee rects de todos los ítems (97) → layout forzado por frame

## src/iconos.js

src/iconos.js:25 - [baja] [ICO] breakdown/scout/casting (25-27) en rejilla 24 escalados `scale(1.3333)` al viewBox 32; clases .i-ln/.i-lm/.i-kl (shell.html:4002) sin uso — ✓ corregido: scout redibujado en la rejilla común
src/iconos.js:39 - [baja] [ICO] tamaño de etapa dispar: 26 px (shell.html:4033), 42 px (4064), 32 px (4237), 21/19/17 px en el teléfono, que se encoge al aparecer Deshacer (4074-4086)

## src/planes.js

src/planes.js:65 - [baja] «Llevar a producción» sin estado ocupado durante flushSave + POST + openProject
src/planes.js:77 - [baja] «No se pudo llevar a producción.» sin siguiente paso

## src/desktop.js

src/desktop.js:111 - [media] error de licencia en p#licErr sin aria-live/role=alert, sin aria-describedby/aria-invalid ni foco
src/desktop.js:16 - [baja] errores sin siguiente paso (16, 23, 55)
src/desktop.js:101 - [baja] textarea de la clave sin autocomplete="off" ni name (spellcheck=false ✓)
src/desktop.js:107 - [baja] «Activar Pro» sin estado ocupado durante la activación
src/desktop.js:109 - [baja] clave vacía: solo enfoca, sin mensaje

## src/i18n.js

src/i18n.js:16 - [baja] sin preferencia guardada siempre 'es': no consulta navigator.languages
src/i18n.js:159 - [baja] en inglés fechas forzadas a 'en-US' (parche global Date/Intl, 159-163); derivar de navigator.languages

## src/tab-script.js

src/tab-script.js:10 - [media] `#sceneQ` no tiene `<label>` ni `aria-label` (solo un placeholder sin «…»). El filtro no muestra estado vacío ni anuncia cuántos resultados hay
src/tab-script.js:11 - [media] la lista de escenas no está virtualizada (100–200 `<li>` en un largometraje) y se vuelve a pintar entera en cada `edDerive` (guion-editor.js:233)
src/tab-script.js:163 - [media] `.tg` es un `<span>` que abre el menú de la marca con un clic (:258). No es `button`, no tiene `tabindex` ni teclado: cambiar o quitar una marca solo se puede con puntero (la alternativa está lejos, en Desglose)
src/tab-script.js:173 - [media] `pagesHTML()` pinta todas las páginas (miles de `.ln`, marcas, rayado y notas) sin virtualizar → `.page{content-visibility:auto;contain-intrinsic-size:51em 66em}`
src/tab-script.js:211 - [media] `.cv` es un `<div data-act="shot">` (el número del plano en el rayado) que se puede pulsar pero no tiene semántica de botón ni recibe foco; la alternativa solo está en el inspector
src/tab-script.js:299 - [media] marcar el desglose y crear planos depende de seleccionar texto con el puntero en páginas que no son editables. No hay camino de teclado; «Añadir…» en Desglose es solo una alternativa parcial
src/tab-script.js:41 - [baja] [ICO] tamaños de ícono mezclados en la misma barra: `.btn.icon .ic` 18 px (lista, deshacer, B/I/U), `.qbtn .ic` 19 px (ayuda y ⋯ de `toolsHTML`), y 1,15em ≈ 15–16 px en botones con texto (`ICO.lock` del candado y `${ICO.check} Revisión` en :45). En Guion rayado, `.mk-ic` mide 16 px
src/tab-script.js:79 - [baja] `fitPages()` lee `sc.clientWidth` justo después del `innerHTML` del render, lo que fuerza el diseño, y luego llama a `mnLayout()` (ver guion-margen.js:144)
src/tab-script.js:433 - [baja] en el selector de categorías, el nombre accesible es `c.short` (la abreviatura) y el `title` no basta → `aria-label="${c.name}"`
src/tab-script.js:606 - [baja] «Esa parte del guion no pertenece a ninguna escena.» no dice qué hacer después (p. ej. elegir texto debajo de un encabezado)
src/tab-script.js:632 - [baja] el placeholder «Descripción (opcional)» no termina en «…» ni muestra un ejemplo
src/tab-script.js:634 - [baja] [ICO] `<svg>` de check en línea que duplica `NI.ok` (notas.js:256); ICO no tiene un ícono «ok» → agregarlo a ICO
src/tab-script.js:696 - [baja] «Mostrar los números…» muestra su estado solo con «✓ » en el texto → `aria-pressed`

## src/guion-editor.js

src/guion-editor.js:252 - [media] el tipo de párrafo (escena, personaje, diálogo…) solo está en la clase CSS. El `role="textbox"` (:248) no lo expone y el cambio con Tab o Ctrl+1…7 no se anuncia → región `aria-live` («Diálogo») o `aria-roledescription`
src/guion-editor.js:256 - [media] todo el guion está en un solo `contenteditable`, sin virtualizar. Cada `renderEditorDoc()` (Intro, Tab, pegar, autocompletar) vuelve a armar todo el DOM
src/guion-editor.js:263 - [media] las celdas AV (`.ep` `contenteditable` en :263, :267, :268 y :275) no tienen `role="textbox"` ni `aria-label` («Video, fila 3»), así que el lector de pantalla dice «editable» sin contexto
src/guion-editor.js:478 - [media] Tab y Mayús+Tab siempre cambian el tipo de párrafo; en AV (:467) pasan de celda y al final agregan una fila. El foco no puede salir del editor con el teclado → dar una salida (Esc y luego Tab) y explicarla en la ayuda
src/guion-editor.js:544 - [media] el autocompletar de personajes y encabezados (`#edAc`) no se anuncia: no tiene `role="listbox"` ni `option`, el editor no tiene `aria-expanded` ni `aria-activedescendant`, y no hay `aria-live`
src/guion-editor.js:704 - [media] «Renumerar todas las escenas» (`edRenumber`, :83) se aplica sin pedir confirmación y no se puede deshacer: no llama a `edPush`, y en Guion el deshacer global está oculto (historial.js:36). El aviso no trae «Deshacer»
src/guion-editor.js:269 - [baja] la duración usa `inputmode="numeric"`: el teclado numérico de iOS no tiene «:», así que no se puede escribir «m:ss» → `inputmode="text"`; falta `autocomplete="off"`
src/guion-editor.js:270 - [baja] [ICO] `.av-m` usa «⋯» en texto (también en :263) en vez de `ICO.more`. El CSS no le da tamaño, así que el blanco es del ancho de un carácter, y le falta `aria-haspopup="menu"` — ✓ corregido: ICO.more

## src/guion-revision.js

src/guion-revision.js:198 - [alta] la carátula es un `<div role="button" tabindex="0" data-act>`: recibe el foco, pero Intro y Espacio no hacen nada (ningún keydown activa los role=button) → usar `<button>` — ✓ corregido: ahora es un <button>
src/guion-revision.js:206 - [alta] en la ventana Carátula, los campos `#cvT`, `#cvA`, `#cvB`, `#cvV`, `#cvD` y `#cvC` (:206–211) están dentro de `<div class="fld"><span>`, sin `<label for>` ni `aria-label`. `#cvT` y `#cvD` no tienen ningún nombre accesible — ✓ corregido: <label> en cada campo
src/guion-revision.js:63 - [media] el contador `#rvN` («3/12», «Sin resultados») cambia sin `aria-live="polite"`; los placeholders «Buscar en el guion» y «Reemplazar por» (:65) no terminan en «…»
src/guion-revision.js:64 - [baja] [ICO] los chevrones ‹ › son `<svg>` en línea que no están en ICO (el `NI.prev` de notas.js tiene otro trazo) → agregar `ICO.prev` e `ICO.next`
src/guion-revision.js:65 - [baja] el botón «Todo» es un nombre poco específico → «Reemplazar todo»

## src/guion-formato.js

src/guion-formato.js:160 - [baja] [ICO] el botón Revisión tiene `aria-pressed` y `aria-haspopup="menu"` a la vez (se contradicen). Su `aria-label="Revisión"` no dice el color activo, que solo se ve en el punto `.fmt-dot`

## src/guion-cierre.js

src/guion-cierre.js:135 - [media] los errores `#lrE`, `#lcE` (:191), `#laE` (:288), `#lnE` (:329) y `#loE` (:348) se muestran sin `role="alert"`, así que el lector de pantalla no los anuncia. `#lkE` (:92) sí lo tiene
src/guion-cierre.js:132 - [baja] el código de recuperación no tiene `spellcheck="false"` ni `autocapitalize="characters"`
src/guion-cierre.js:193 - [baja] [ICO] «🔒 Cerrar guion» usa un emoji (también en :423), mientras la misma acción usa `${ICO.lock}` en tab-script.js:700 → usar `ICO.lock` — ✓ corregido: ICO.lock
src/guion-cierre.js:294 - [baja] «Autorizar» (y «Cambiar código» en :335) hace `await pinHash` en un bucle sin deshabilitar el botón ni mostrar estado, así que se puede enviar dos veces
src/guion-cierre.js:375 - [baja] el botón de enlace «código» no dice de quién es («Restablecer el código de X»); «quitar» sí lo dice

## src/guion-margen.js

src/guion-margen.js:129 - [media] `.mn` tiene `role="button"` y adentro otro `<button class="mn-d">` (:130). Es un control anidado: los hijos de un role=button no se exponen → separarlos
src/guion-margen.js:144 - [media] `mnLayout()` intercala lecturas (`getComputedStyle`, `offsetHeight` en :146) y escrituras (`style.top` en :155 y `svg.innerHTML`) página por página, lo que fuerza el diseño una y otra vez → leer todo primero y escribir después
src/guion-margen.js:165 - [media] la flecha de la nota (`.mn-tip`, `mnDrag` en :209) solo se mueve arrastrando, sin alternativa de clic o teclado, y el blanco es pequeño (r = 4,4 unidades, unos 12 px)

## src/tab-project.js

src/tab-project.js:153 - [media] los campos `type="tel"` y `type="email"` del equipo (:153–154; reparto en :171–172) no tienen `autocomplete="off"`, así que el navegador ofrece el teléfono y el correo del propio usuario en cada fila
src/tab-project.js:10 - [baja] los `aria-label="Nombre"` y «Cargo» se repiten igual en cada fila (también en :151–152 y en tab-breakdown.js:100) → incluir de quién es («Nombre, Dirección 2»)
src/tab-project.js:23 - [baja] [ICO] `SCRIPT_SVG` está en línea, con `width/height=22` y un trazo propio, fuera de ICO (`ICO.scripts` o `tabIco('script')`)
src/tab-project.js:91 - [baja] «No se pudo leer esa imagen.» no dice qué hacer después (qué formatos sirven)
src/tab-project.js:155 - [baja] [ICO] chevron en `<svg>` en línea idéntico a `ICO.chev` (`m7 10 5 5 5-5`) → `${ICO.chev}` — ✓ corregido: ICO.chev
src/tab-project.js:158 - [baja] el campo DNI/documento no tiene `spellcheck="false"`
src/tab-project.js:175 - [baja] el placeholder «Buscar» del equipo no termina en «…», y la búsqueda vuelve a pintar la vista sin anunciar los resultados

## src/tab-build.js

src/tab-build.js:268 - [media] Escaleta y Tarjetas pintan todas las escenas, cada una con su textarea, sin virtualizar ni usar `content-visibility:auto`
src/tab-build.js:289 - [media] al pintar, `bAuto` recorre cada textarea (también en :649, Biografías): escribe `height` y lee `scrollHeight` en cada una, así que hay un reflow por escena → `field-sizing: content`, o leer y escribir por lotes
src/tab-build.js:376 - [media] todas las muestras de color de la trama tienen `aria-label="Color"`, así que no se distinguen entre sí → usar el nombre del color (ver `colorName` en ficha.js:95); además miden 20 px
src/tab-build.js:612 - [media] `#sceneQ` («Buscar personaje») no tiene label (ver tab-script.js:10)
src/tab-build.js:245 - [baja] todas las tarjetas tienen el mismo `aria-label="Sinopsis"`, y el placeholder no termina en «…»
src/tab-build.js:248 - [baja] [ICO] `.b-plot` mide 20 × 20 px, menos que el blanco mínimo de 24 px — ✓ corregido: 24 px
src/tab-build.js:250 - [baja] [ICO] `.b-more` usa «⋯» en texto (también en :625) en vez de `ICO.more`, y `aria-label="Más acciones"` no dice de qué escena es — ✓ corregido: ICO.more
src/tab-build.js:436 - [baja] «Quitar el último acto» se aplica al instante, sin confirmación ni `toastUndo` (las demás bajas del archivo sí lo tienen)
src/tab-build.js:616 - [baja] [ICO] «Con biografía» se indica solo con un «✓» y su `title` → texto oculto o `aria-label`
src/tab-build.js:629 - [baja] Edad usa `inputmode="numeric"` aunque acepta texto libre («30-35») → quitar el inputmode o usar `text`

## src/tab-breakdown.js

src/tab-breakdown.js:98 - [media] la tabla de Elementos pinta todos los elementos (cientos en un largometraje, con un input y un select por fila) sin virtualizar
src/tab-breakdown.js:109 - [media] el buscador de elementos no tiene `<label>` ni `aria-label`, no es `type="search"` y su placeholder no termina en «…». Filtrar vuelve a pintar todo sin anunciar resultados (:154)
src/tab-breakdown.js:110 - [media] el `<select>` de categoría no tiene label ni `aria-label`
src/tab-breakdown.js:13 - [baja] el `.seg` de las vistas no tiene `role="group"` ni `aria-label` (las demás barras sí)
src/tab-breakdown.js:54 - [baja] [ICO] los botones ✓/✕ `.x` miden 22 × 22 px (menos de 24 px), y `aria-label="Confirmar"` no dice el nombre del elemento (el ✕ sí lo dice) — ✓ corregido: 24 px y ICO.close
src/tab-breakdown.js:114 - [baja] la columna de acciones tiene un `<th>` vacío → poner un texto oculto «Acciones»

## src/laminas.js

src/laminas.js:95 - [alta] «Fotos» es un `<label class="btn">` que envuelve un `<input type="file" hidden>`: ni el label ni el input reciben foco, así que no se pueden subir fotos con el teclado (mismo patrón en tab-scout.js:93) — ✓ corregido: input enfocable (.file-in) con aria-label
src/laminas.js:42 - [media] `addPhotos` comprime y guarda las fotos una por una sin estado de carga («Subiendo…», botón deshabilitado): con 10 fotos pasan segundos sin respuesta
src/laminas.js:96 - [media] el visor se abre con un clic sobre `<img data-big>`, sin botón ni teclado; falta `loading="lazy"` o `decoding="async"` en la grilla — ✓ corregido: 24 px y ICO.close
src/laminas.js:126 - [media] el visor de fotos no tiene `role="dialog"` ni `aria-modal`, no mueve el foco al «✕» y no lo devuelve al cerrar
src/laminas.js:14 - [baja] `kb()` arma «1,5 MB» con `toFixed().replace('.', ',')` → `Intl.NumberFormat` (en inglés también sale con coma)
src/laminas.js:16 - [baja] [ICO] `CAM_SVG` usa `width/height=15` y trazo 1,4, distinto de los `.ic` (1,15em, trazo 1,8) que aparecen a su lado en el encabezado de la caja
src/laminas.js:44 - [baja] «No se pudo leer X.» no dice qué hacer después
src/laminas.js:96 - [baja] [ICO] `.lam-x` mide 22 × 22 px (menos de 24 px) — ✓ corregido: 24 px y ICO.close

## src/ficha.js

src/ficha.js:42 - [media] la ventana propia de la ficha no mueve el foco adentro al abrirse, no lo encierra y no lo devuelve al cerrarse
src/ficha.js:45 - [baja] el `<canvas aria-label>` no tiene `role="img"`
src/ficha.js:93 - [baja] los `role="group"` de chips no tienen nombre (Tipo, Complexión; también :107 y :108)
src/ficha.js:115 - [baja] las pestañas tienen `role="tab"` y `aria-pressed` a la vez, sin `tabpanel`, `aria-controls` ni navegación con flechas
src/ficha.js:119 - [baja] las miniaturas usan `alt="front"`/`"right"`, la clave interna en inglés → «Foto de frente»

## src/tab-casting.js

src/tab-casting.js:70 - [media] `#sceneQ` no tiene label (ver tab-script.js:10)
src/tab-casting.js:49 - [baja] [ICO] usa «⋯» en texto en vez de `ICO.more`, y «Más acciones» no dice el nombre del candidato — ✓ corregido: ICO.more
src/tab-casting.js:74 - [baja] [ICO] el «✓» y el número de candidatos solo se explican con `title` → texto oculto

## src/tab-scout.js

src/tab-scout.js:93 - [alta] el label «Fotos» envuelve un `<input type="file" hidden>` que no se alcanza con el teclado (afecta a casting y scouting) — ✓ corregido: input enfocable (.file-in)
src/tab-scout.js:51 - [media] `candAddPhotos` no muestra estado de carga mientras comprime y guarda
src/tab-scout.js:92 - [media] `<img data-act="…-view">` se pulsa sin ser botón y sin teclado; a la grilla de candidatas le falta `loading="lazy"`
src/tab-scout.js:100 - [media] `candFld` no pone `autocomplete` ni `name`, así que el navegador autocompleta los campos `tel` y `email` (scouting :123; casting tab-casting.js:53–54)
src/tab-scout.js:137 - [media] `#sceneQ` («Buscar lugar») no tiene label
src/tab-scout.js:116 - [baja] [ICO] usa «⋯» en texto en vez de `ICO.more` — ✓ corregido: ICO.more
src/tab-scout.js:139 - [baja] [ICO] el «✓» y el número de candidatas solo se explican con `title`

## src/shot-editor.js

src/shot-editor.js:1024 - [alta] flechas de cámara (.c-n/.c-w/.c-up…, L139-147) solo en pointerdown; el click (Enter/Espacio) solo hace stopPropagation (L1040): botones enfocables con aria-label que no hacen nada con teclado → mover también en click/keydown — ✓ corregido: Intro/Espacio mueven un paso (Mayús: el triple)
src/shot-editor.js:1261 - [alta] línea de tiempo (canvas #tlC, L157) solo con puntero: sin tabindex/role="slider"/aria-label. Con teclado el tiempo solo cambia reproduciendo y pausando (Espacio); mover claves o la barra «Acción» no se puede — ✓ corregido: role="slider": ← → (Mayús: 1 s), Inicio y Fin
src/shot-editor.js:287 - [media] getBoundingClientRect dentro del rAF de dibujo (vOpts y L486, L504, L683: 4 por cuadro, tras escrituras DOM) → cachear el ancho en el ResizeObserver
src/shot-editor.js:783 - [media] doblar brazos, piernas, torso o cabeza solo arrastrando en la viñeta; solo hay botones para mano/muñeca y restablecer (L561); la rama de barras `j:` (L1741) ningún panel la pinta
src/shot-editor.js:1086 - [media] vista libre: cubo y órbita solo con puntero; las caras Frente/Atrás/Izq./Der./Arriba no tienen botones ni teclas (freeAngle existe, L376)
src/shot-editor.js:1300 - [media] ▶/❚❚ cambia con textContent; el aria-label sigue «Reproducir» (también L1284) — ✓ corregido: aria-label Reproducir/Pausar
src/shot-editor.js:1356 - [media] muestras .sw de 20×20 px (también L1675), sin agrandar en táctil
src/shot-editor.js:1504 - [media] facedel/facereset (L1470-1471) → exprDelete (L623) sin confirmar: borra el dibujo de la ficha o del proyecto; el toast no trae Deshacer y el Ctrl+Z del editor no lo devuelve
src/shot-editor.js:1641 - [media] [ICO] −/+ «metros por toque»: .rr-step .icbtn de 22×22 px, sin regla pointer:coarse — ✓ corregido: 24 px
src/shot-editor.js:76 - [baja] «Quitar el plano» (nuevo) sin confirmar; el toast no trae Deshacer
src/shot-editor.js:120 - [baja] [ICO] deshacer/rehacer en <svg> en línea, copia de ICO.undo/redo; otra vez en L1676; L130 copia ICO.edit
src/shot-editor.js:133 - [baja] [ICO] «Vista libre» sin aria-label: bajo 760 px el CSS oculta el <span> (shell.html:980) y queda solo el ícono con un title largo
src/shot-editor.js:144 - [baja] [ICO] 4 dibujos distintos de «cámara»: L9, L144, L363, L1350
src/shot-editor.js:153 - [baja] [ICO] barra de tiempo: glifos ▶/❚❚/◆, punto .rec y svg de curva (L1245) mezclados; .tl-b de 30 px sin regla táctil
src/shot-editor.js:161 - [baja] tlEase: aria-label fijo «Curva»; el valor solo va en el title (L1245)
src/shot-editor.js:168 - [baja] [ICO] barra de la planta: «−»/«+» como texto de 16 px, svg de 15 px con trazo 1.9, glifo «⤢»/«✕» (L1048) mientras la viñeta usa svg (L1063); botones de 28 px sin regla táctil
src/shot-editor.js:177 - [baja] [ICO] «⋯» como texto en vez de ICO.more — ✓ corregido: ICO.more
src/shot-editor.js:384 - [baja] giro animado de 460 ms con rAF que ignora prefers-reduced-motion
src/shot-editor.js:413 - [baja] drawCube lee clientWidth y getComputedStyle (L422) por cuadro; drawTimeline llama a getComputedStyle(m) por cuadro (L1194)
src/shot-editor.js:561 - [baja] [ICO] HUD de la parte: svg con stroke 2 y otro con 2.2, «✕» como texto; botones de 28 px
src/shot-editor.js:1360 - [baja] aria-pressed sobre <label> (también L1428, L1505)
src/shot-editor.js:1365 - [baja] [ICO] SXI redefine edit/more/plus de ICO (otro plus en L1546); su trash y su eye no son los de D2_ICO
src/shot-editor.js:1632 - [baja] decimal con coma puesto a mano mientras el mismo panel usa toLocaleString('es-PE') con punto (L1544, L1572)
src/shot-editor.js:1689 - [baja] placeholder sin «…»
src/shot-editor.js:1952 - [baja] borrar un accesorio dibujado de un personaje: inmediato, sin Deshacer (solo cancelando el editor)
src/shot-editor.js:2091 - [baja] role="tab" con aria-pressed, sin tabpanel ni flechas → role="group"

## src/s2d-editor.js

src/s2d-editor.js:1127 - [media] la capa activa solo se elige con pointerdown sobre un <div>: sin button, tabindex ni teclado
src/s2d-editor.js:1134 - [media] reordenar capas solo arrastrando; no hay subir/bajar
src/s2d-editor.js:90 - [baja] [ICO] D2_ICO redibuja undo/redo/lock de ICO; trash (L99) y eye (L92) no son los de SXI
src/s2d-editor.js:240 - [baja] [ICO] la cabecera mezcla svg de 18 px con glifos «−»/«+», «◀»/«▶» (L241), «⋯» (L242), «✕» (L243) — ◐ en parte: «⋯» y «✕» ya son ICO; quedan −/+ y ◀/▶ de texto
src/s2d-editor.js:240 - [baja] el nombre accesible de «Ajustar» es «100 %» → aria-label — ◐ en parte: «⋯» y «✕» ya son ICO; quedan −/+ y ◀/▶ de texto
src/s2d-editor.js:248 - [baja] «Cargando dibujos…» sin role="status"
src/s2d-editor.js:433 - [baja] vpView lee clientWidth/clientHeight dentro de overlay() en cada draw
src/s2d-editor.js:778 - [baja] fitTX escribe y lee scrollWidth/scrollHeight intercalados en cada input y pellizco (L865)
src/s2d-editor.js:1004 - [baja] [ICO] plus e imagen en <svg> en línea (copias de ICO.plus y de shot-editor.js:1679)
src/s2d-editor.js:1011 - [baja] «Igual en todos los cuadros» solo como ícono aria-hidden con title
src/s2d-editor.js:1012 - [baja] [ICO] .s2-lk de 24 px y .s2-eye de 26 px, sin regla táctil
src/s2d-editor.js:1165 - [baja] renombrar una capa solo con doble clic sobre un <span> (L1010)
src/s2d-editor.js:1229 - [baja] [ICO] tira de cuadros: play en svg junto a «+» (L1231) y «◀»/«▶» (L1235) como texto

## src/tab-board.js

src/tab-board.js:323 - [media] select e input de cada fila del guion técnico (L323-330) sin label ni aria-label
src/tab-board.js:410 - [media] la ayuda promete barras «Brazos, piernas y cabeza» que no existen
src/tab-board.js:279 - [baja] el rAF del arrastre lee el rect de todas las celdas tras escribir ghost.style (L277)
src/tab-board.js:312 - [baja] [ICO] «⋯» como texto en vez de ICO.more — ✓ corregido: ICO.more
src/tab-board.js:313 - [baja] «+» decorativo sin aria-hidden
src/tab-board.js:331 - [baja] ↑/↓ «Subir»/«Bajar» sin decir qué plano
src/tab-board.js:418 - [baja] decimal con coma puesto a mano → Intl.NumberFormat

## src/tab-animatic.js

src/tab-animatic.js:568 - [alta] clips <div> (también L570, L583) sin role ni tabindex: elegir un clip solo con puntero; con teclado solo Ctrl+A; quitar, duplicar, Alt+←/→ y el inspector quedan fuera
src/tab-animatic.js:735 - [media] seek() lee clientWidth/scrollLeft en cada cuadro tras escribir ph.style.left (L728)
src/tab-animatic.js:1193 - [media] ▶/❚❚ con textContent; el aria-label sigue «Reproducir» (L456) — ✓ corregido: aria-label Reproducir/Pausar
src/tab-animatic.js:1327 - [media] «Quitar música» borra también el audio guardado (idbPut null); sin confirmar ni deshacer
src/tab-animatic.js:114 - [baja] [ICO] candado en <svg> propio en vez de ICO.lock
src/tab-animatic.js:375 - [baja] [ICO] AN_IC redibuja undo/redo/more (L379) en rejilla de 16 y trae otra papelera (L370)
src/tab-animatic.js:452 - [baja] el monitor <canvas id="anV"> sin aria-label
src/tab-animatic.js:455 - [baja] [ICO] ICO.start/end junto a glifos «◀|», «|▶» (L457) y «▶/❚❚» (L456)
src/tab-animatic.js:464 - [baja] separador enfocable (L647) sin aria-valuenow, aria-valuemin ni aria-valuemax
src/tab-animatic.js:467 - [baja] [ICO] .rhythm .tb de 28 px (L473-474); la regla táctil solo agranda .an-tools .tb
src/tab-animatic.js:592 - [baja] «♪» sin aria-hidden
src/tab-animatic.js:1368 - [baja] progreso del video sin aria-live ni role="progressbar"

## src/floorplan.js

src/floorplan.js:157 - [media] #fpWm y #fpMm (L158) sin label ni aria-label
src/floorplan.js:146 - [baja] role="group" sin aria-label
src/floorplan.js:149 - [baja] #fpHint/#fpDims (L159) cambian sin aria-live
src/floorplan.js:243 - [baja] recortar solo arrastrando, sin teclado

## src/charphoto.js

src/charphoto.js:333 - [media] recuadro del rostro y recorte solo arrastrando
src/charphoto.js:201 - [baja] el canvas de cada foto sin aria-label
src/charphoto.js:233 - [baja] getBoundingClientRect en cada pointermove, tras escribir cv.width

## src/expresiones.js

src/expresiones.js:85 - [baja] [ICO] undo/redo copian ICO; clear (L87) copia SXI.trash
src/expresiones.js:98 - [baja] muestras de 22 px (menos de 24)
src/expresiones.js:100 - [baja] placeholder «Ej.: Llorando» sin «…»
src/expresiones.js:221 - [baja] «Limpiar» sin confirmar; Deshacer queda deshabilitado y se recupera con Rehacer trazo por trazo

## src/s3d-plan.js

src/s3d-plan.js:349 - [media] la X/Z de la cámara y de las luces (L343) solo se fija arrastrando; los paneles Cámara y Luz no tienen campos de posición; #plC sin teclado ni aria-label
src/s3d-plan.js:340 - [baja] desplazar la planta solo arrastrando

## src/share.js

src/share.js:206 - [alta] [ICO] #teamBtn: en ≤760px .hide-sm oculta el nombre → queda solo el svg aria-hidden, sin aria-label ni title: botón sin nombre accesible. Además le falta aria-haspopup="menu" (abre teamMenu). — ✓ corregido: aria-label y aria-haspopup; ícono ICO.team
src/share.js:239 - [media] [PZ] inicial blanca de 12px sobre hsl(h 52% 42%) (shell.html:1908): el contraste mínimo es 2,68:1 (h≈60°) y el 47% de los tonos (30°–195°) queda bajo 4,5:1 → usar luminosidad ≈32% o elegir la tinta según la luminancia. — ✓ corregido: paleta legible; sin lazy; respaldo de iniciales; emoji enteros
src/share.js:267 - [media] [PZ] si se van todos con el menú abierto, bx.remove() deja el popover colgado de un botón ya desconectado. closePop no puede devolver el foco (#pzBar no tiene data-act de respaldo) y el foco cae al body. Además el menú (263) es una foto del momento: no se actualiza con los 'who' que llegan. — ✓ corregido: la lista se cierra y el foco pasa al botón del equipo; la lista abierta se actualiza
src/share.js:291 - [media] [PZ] el aria-label de #pzBar solo dice cuántos son («2 personas más en el proyecto»). Los nombres y las pestañas van solo en title, que no es fiable y no existe en táctil → ponerlos en el label o en aria-describedby. — ✓ corregido: aria-label con nombres y pestañas
src/share.js:496 - [media] [PZ] las llegadas y salidas (evento 'who') solo repintan, en silencio: no hay región aria-live. Anunciar el cambio («Ana entró», «Luis salió», con un tope por minuto) en una región polite fija. — ✓ corregido: región «polite» fija: entró / salió
src/share.js:625 - [media] input#tmQ (buscar personas, web) sin label ni aria-label: solo tiene placeholder.
src/share.js:628 - [media] en escritorio, input#tmN («Nombre») y select#tmR no tienen label ni aria-label (las ramas web y API sí los tienen).
src/share.js:191 - [baja] #roChip cambia a «Esperando sincronización» o «Solo lectura…» sin aria-live: el estado de sincronización no se anuncia.
src/share.js:239 - [baja] [PZ] el <img> del avatar usa loading="lazy" aunque la barra está siempre a la vista, y no tiene onerror. Si la foto de Google falla, queda un círculo de color sin inicial (acctBtn sí tiene respaldo, share-api.js:541). Además p.name[0] parte los pares sustitutos (nombre que empieza con emoji). — ✓ corregido: paleta legible; sin lazy; respaldo de iniciales; emoji enteros
src/share.js:278 - [baja] [PZ] aria-haspopup="menu", pero el popover no tiene role="menu" ni sus ítems role="menuitem". aria-expanded no existe hasta la primera apertura → inicializarlo en "false". — ✓ corregido: role="menu" + menuitem; aria-expanded desde el inicio
src/share.js:283 - [baja] [PZ] cada 'who' reescribe el innerHTML de la barra y de todos los .pz-dots aunque nada cambie: los <img> se recrean (posible parpadeo de la foto). Comparar una firma antes de pintar. — ✓ corregido: solo repinta si cambió
src/share.js:317 - [baja] [PZ] en el menú, la inicial del avatar (texto) entra en el nombre del botón («A Ana Pérez Plan de rodaje») → aria-hidden en .pz-av. — ✓ corregido: avatar aria-hidden; aria-disabled
src/share.js:317 - [baja] [PZ] quien está en tu misma pestaña, o en una que no ves, aparece disabled con opacity:1 (shell.html:1918). Se ve igual que los activos, las flechas lo saltan y el hint «Toca a alguien para ir a su pestaña» no se cumple. Si todos quedan deshabilitados, el foco no entra al menú. — ✓ corregido: avatar aria-hidden; aria-disabled
src/share.js:368 - [baja] el código de recuperación, al pasar a type=text, no lleva spellcheck="false", autocomplete="off" ni autocapitalize.
src/share.js:513 - [baja] [PZ] parpadeo al recargar por permisos: shareBuild (276) crea un SHARE sin who, presencePaint quita la barra y esta vuelve con el siguiente 'hello'. APITEAM.teamState→open→close() (share-api.js:368) también la vacía. Conservar SHARE.who entre reconstrucciones. — ✓ corregido: conserva las caras al reconstruir
src/share.js:579 - [baja] si el portapapeles falla, no se avisa nada (también 694) → ofrecer seleccionar y copiar a mano.
src/share.js:638 - [baja] «Quitar» y «Nueva contraseña» se repiten en cada fila sin el nombre de la persona en el nombre accesible. La columna de acciones tiene <th></th> vacío (566).
src/share.js:680 - [baja] los <img> de avatar (626, 644) no tienen width/height.
src/share.js:687 - [baja] correo inválido → toast. Debería ser un error inline junto a #tmE, con aria-invalid.
src/share.js:702 - [baja] búsqueda: una consulta por tecla, sin debounce, y respuestas fuera de orden pueden pisar los resultados. «Sin resultados en tu organización.» (644) no tiene aria-live.

## src/share-api.js

src/share-api.js:288 - [media] [PZ] cuando el canal cae (es.onerror, con reintentos de hasta 30 s) o la app pasa a sin conexión (OFFLINE.set, 136), SHARE.who no se limpia ni se marca → se siguen mostrando caras que quizá ya no están. Atenuar o vaciar tras N s sin canal. — ✓ corregido: sin canal 20 s: se vacían
src/share-api.js:662 - [media] payMoney arma la moneda a mano ('S/ ' o 'US$ ' + toFixed + replace('.', ',')): sin separador de miles y sin las reglas de fr/pt/it → Intl.NumberFormat(LOCALE, {style:'currency', currency}) (LOCALE ya existe en la 635).
src/share-api.js:804 - [media] #bySum (cobro, prueba, descuento) y los precios (#bp_*, #bcM/#bcY) cambian tras cada quote asíncrono sin aria-live: el lector no anuncia el nuevo total.
src/share-api.js:382 - [baja] [PZ] setWho corta la lista en 60 ventanas sin avisar → con equipos grandes (Studio: 60 personas, cada una con varias ventanas), el «+N» y el aria-label se quedan cortos. — ✓ corregido: tope 240
src/share-api.js:753 - [baja] «GB»/«MB» con espacio normal →  .
src/share-api.js:815 - [baja] role="radio" lleva aria-pressed además de aria-checked (inválido), y los radiogroup no se recorren con flechas (sin roving tabindex).
src/share-api.js:850 - [baja] código de descuento inválido: toast y se borra lo escrito → mostrar el error junto al campo y conservar el valor.
src/share-api.js:860 - [baja] [ICO] toast('✓') solo tiene un glifo, y en la 848 el botón queda con texto «✓» (se lee «marca de verificación») → poner texto real.
src/share-api.js:953 - [baja] el botón de Google usa locale:'es' fijo, aunque la app esté en inglés.
src/share-api.js:975 - [baja] «No se pudo copiar» no dice qué hacer (seleccionar el texto a mano).
src/share-api.js:1018 - [baja] el banner de solo lectura aparece en vivo (por sync o por plan) sin role="status".

## src/share-web.js

src/share-web.js:309 - [baja] si requestable() falla, el error se pierde y se muestra «No hay proyectos compartidos…»: estado vacío engañoso, sin reintento.
src/share-web.js:313 - [baja] todos los botones dicen «Pedir acceso». El título del proyecto va en un span hermano no asociado (falta aria-describedby).
src/share-web.js:322 - [baja] «No se pudo enviar el pedido.» no dice qué hacer. Además el botón se deshabilita con el foco encima (321) y el foco se pierde.

## src/tab-plan.js

src/tab-plan.js:67 - [media] el plan es una grilla de datos hecha con div/span, y la fila de encabezados es aria-hidden → el lector no tiene filas, columnas ni encabezados (usar role=table/row/cell o <table>).
src/tab-plan.js:231 - [media] todas las jornadas y filas (cada una con 5–6 campos) se pintan de una vez y se rehacen en cada render(). No hay virtualización ni content-visibility:auto en .pday (en un largometraje son cientos de filas).
src/tab-plan.js:1047 - [media] cada checkbox de «Días sin rodaje» se llama con una letra (L, M, M, J…): hay dos «M» (martes y miércoles) y el nombre completo solo va en title → aria-label con el nombre del día. — ✓ corregido: aria-label con el nombre del día
src/tab-plan.js:148 - [baja] el botón .c-esc se llama como el código («12A»); su función («Opciones de la escena») solo va en title y le falta aria-haspopup="menu".
src/tab-plan.js:180 - [baja] el ● de «Fecha fijada a mano» solo lleva title, dentro del botón de fecha → se lee «círculo negro».
src/tab-plan.js:183 - [baja] [ICO] aviso de fecha: ICO.warn (aria-hidden) + «fecha»; el significado («no va después de la jornada anterior») solo va en title.
src/tab-plan.js:196 - [baja] la barra «N filas seleccionadas» cambia sin aria-live.
src/tab-plan.js:346 - [baja] elegir filas (clic, Mayús, Ctrl o el recuadro de la 342) solo se hace con puntero, así que mover varias juntas no tiene vía de teclado. Una a una sí: .c-esc › Mover a.
src/tab-plan.js:495 - [baja] scrollIntoView({behavior:'smooth'}) (también 601 y 874) ignora prefers-reduced-motion: la regla CSS global no alcanza a JS.
src/tab-plan.js:776 - [baja] al quitar una etapa o una locación (776, 829) la lista se repinta y el foco cae al body.
src/tab-plan.js:1041 - [baja] «No se pudo crear el Excel.» sin siguiente paso ni reintento.

## src/plan-dood.js

src/plan-dood.js:40 - [baja] el ● de «Tiene escenas sin programar» solo usa color y title.
src/plan-dood.js:71 - [baja] la fecha d/m se arma a mano con getDate()/getMonth() (también en la 95) → Intl.DateTimeFormat({day:'numeric', month:'numeric'}).
src/plan-dood.js:98 - [baja] la columna Fin usa 'J' fijo, mientras Inicio usa EN?'D':'J' → en inglés sale «J5» (lo mismo en pantalla, 42).

## src/tab-cal.js

src/tab-cal.js:104 - [media] iniciales blancas de 10px sobre CAL_COLORS (shell.html:1391): con los colores base, 6 de 8 quedan bajo 4,5:1 (#C99A2E 2,58:1, #D9822B 2,93:1, #3E8F94 3,78:1).
src/tab-cal.js:254 - [media] doubleTap (también 631 y cal-meses.js:137): en táctil, un toque en un botón real (fase, ⌄ abrir, día, plan, hoja de llamado) solo muestra un toast. Con VoiceOver o TalkBack probablemente haga falta activarlo dos veces.
src/tab-cal.js:360 - [media] el pan con Espacio hace preventDefault en keydown con el foco en cualquier botón → Espacio no activa botones en toda la pestaña, ni dentro de sus modales (calEdit). Como bindGantt.kd es global, sigue activo en Meses y Tablero una vez visitada la Línea de tiempo.
src/tab-cal.js:136 - [baja] la línea de tiempo son divs posicionados, sin semántica de tabla ni de grilla (las tareas sí se alcanzan por sus botones).
src/tab-cal.js:150 - [baja] [ICO] el hint dice «clic en [svg] abre el detalle», pero el ícono es aria-hidden → se lee «clic en abre el detalle».
src/tab-cal.js:164 - [baja] el ▸ del botón de fase no tiene aria-hidden (se lee el glifo).
src/tab-cal.js:177 - [baja] .cal-tn tiene cursor pointer/zoom-in y subrayado al hover (shell.html:2128, 2132–2133), pero ningún manejador: parece clicable y no hace nada.
src/tab-cal.js:204 - [baja] el checkbox «Hecha» no incluye el nombre de la tarea; en la ficha (510), «Hecho», «Pendiente» y «Quitar» se repiten genéricos.
src/tab-cal.js:300 - [baja] el ancho de los días solo cambia con Ctrl/Alt+rueda o pellizco: no hay teclas ni botones ±, solo «Ver todo» y encuadrar.
src/tab-cal.js:424 - [baja] elegir varias barras y moverlas juntas solo se hace con puntero (una a una, las fechas sí se editan en la ficha).
src/tab-cal.js:578 - [baja] tarjeta del tablero: <article tabindex="0"> que se abre con Enter o Espacio, sin role="button".
src/tab-cal.js:603 - [baja] kbLayout mide alturas con getBoundingClientRect para armar el muro → usar CSS grid o columns.
src/tab-cal.js:775 - [baja] offerFile sin await ni try: si falla el Excel no aparece ningún mensaje.

## src/cal-meses.js

src/cal-meses.js:80 - [media] la barra de rodaje es un <div data-act="cal-plan"> clicable, sin role, tabindex ni teclado.
src/cal-meses.js:112 - [media] en el selector de mes, ‹ › del año y Enter en el año reescriben p.innerHTML (112, 115): el botón enfocado desaparece y el foco cae al body.
src/cal-meses.js:74 - [baja] la hoja de mes no tiene semántica de tabla ni de grilla: los días de la semana (87) no están asociados y el nombre del mes (86) no es un encabezado.
src/cal-meses.js:75 - [baja] el «+N» (cm-more) no tiene aria-label (solo title «Ver todo lo de este día»).

## src/fecha.js

src/fecha.js:140 - [media] los botones ‹ › del calendario están dentro de .fcal-box y paint() los recrea: con teclado, al cambiar de mes el foco se pierde y sale del popover.
src/fecha.js:95 - [baja] si no entiende la fecha, solo muestra un toast: aria-invalid no lleva aria-describedby con el mensaje junto al campo.
src/fecha.js:124 - [baja] la región aria-live de .fcal-m se recrea en cada paint, así que el anuncio es poco fiable → dejarla fija, fuera del innerHTML.

## src/tab-call.js

src/tab-call.js:450 - [media] en Ajustes › Centro de salud, los 3 inputs (450–452) no tienen label ni aria-label (el <span> del .fld no es un <label>): solo placeholder.
src/tab-call.js:203 - [baja] teléfonos y nombres de otras personas (203, 212, 273, 310) sin autocomplete="off": el navegador ofrece llenarlos con tus propios datos. Los aria-label genéricos se repiten («Teléfono», «Cargo», «Proveedor», «Contacto», «Llamado»; y el xBtn «Quitar» en la 311).
src/tab-call.js:247 - [baja] los <img> de logos no tienen width/height (CLS).
src/tab-call.js:254 - [baja] temperatura y humedad son type=text sin inputmode="decimal" o "numeric".
src/tab-call.js:359 - [baja] quitar un enlace del punto de encuentro (y un pasajero, 350) es inmediato y sin deshacer; los demás «quitar» usan toastUndo.
src/tab-call.js:501 - [baja] offerFile sin manejo de error: si falla el Excel, no hay mensaje.

## src/tab-budget.js

src/tab-budget.js:7 - [baja] los montos son símbolo + Math.round().toLocaleString concatenados (7–8): sin decimales y sin Intl.NumberFormat de moneda.
src/tab-budget.js:121 - [baja] los PIN type=password (121–122, 140–141, 162–163) no llevan autocomplete="new-password" ni "off" → el gestor de contraseñas ofrece guardar códigos de 4 dígitos.
src/tab-budget.js:199 - [baja] el PIN recibe el foco (y autofocus en la 57) también en el teléfono → se abre el teclado al entrar a la pestaña.
src/tab-budget.js:219 - [baja] [ICO] el lector lee el emoji de «🔒 Bloquear» → usar ICO.lock (aria-hidden), como en Ajustes (306). — ✓ corregido: ICO.lock

## src/tab-sup.js

src/tab-sup.js:60 - [media] «Todas las escenas» pinta de una vez todas las escenas con sus planos y tomas (cientos de filas), sin virtualización ni content-visibility.
src/tab-sup.js:79 - [media] el estado de la toma solo se ve por glifo y color: el nombre accesible es «T3 ✕» o «T2 ●», y NG/OK/Buena solo va en title → aria-label «Toma 3, NG…».
src/tab-sup.js:45 - [baja] role="progressbar" sin aria-label ni aria-labelledby.
src/tab-sup.js:80 - [baja] «+ Toma» se repite en cada plano sin el código del plano en el nombre.
src/tab-sup.js:133 - [baja] el grupo NG/OK/Buena no tiene aria-label, y «Duración» (134) es texto sin inputmode.

## src/pdf-rango.js

src/pdf-rango.js:83 - [baja] el aria-label de los campos es el ejemplo («Ej.: 1-5, 8, 12A») y no su propósito; el hint no está ligado con aria-describedby. Además el input y el botón rápido van dentro del <label> del radio (82): contenido de label no válido.
src/pdf-rango.js:106 - [baja] la validación es por toast (106, 109) y no junto al campo (aunque sí dice qué hacer).

## src/archivo.js

src/archivo.js:120 - [media] ZIP: la barra .prog no tiene role="progressbar" ni aria-valuenow, y #zpT (paso actual, resultado, error) no tiene aria-live.
src/archivo.js:128 - [baja] «… MB» con toFixed y espacio normal → Intl.NumberFormat y  .
src/archivo.js:130 - [baja] «No se pudo armar el ZIP: …» no ofrece reintentar ni dice qué hacer.

## src/pdf.js

src/pdf.js:1093 - [media] en el modal «Exportando PDF», .prog no tiene role="progressbar" y #pwT («Viñeta 3 de 40») no tiene aria-live.
src/pdf.js:1218 - [media] [ICO] exportPDF guarda btn.textContent y lo reescribe. Desde el «⋯» del teléfono (barra.js:255) borra ICO.more («Generando…» → '') y el botón queda vacío; en «Exportar» se pierden el span y ICO.chev. Además aria-label="Exportar" tapa el estado ocupado → usar una clase o aria-busy sin tocar el contenido. — ✓ corregido: conserva el ícono; aria-busy
src/pdf.js:1141 - [baja] el select del área va dentro del <label> del radio (contenido de label no válido).
src/pdf.js:1151 - [baja] la validación es por toast y no junto al campo.
src/pdf.js:1249 - [baja] «No se pudo generar el PDF.» no ofrece reintentar (problem() admite retry).
