# Lote AD · figuras del storyboard 3D (gorras sobre el pelo, más peinados, ropa dibujada que se acomoda)

## Para Ronald: qué cambia y cómo se usa

### 1. La gorra (y el gorro, el sombrero y los cascos) va por encima del pelo
Antes la copa de la gorra estaba hecha a la medida de la cabeza, no del pelo: quedaba metida dentro del cabello, solo
asomaba una mancha azul arriba y la visera flotaba delante del flequillo.

Ahora:
- La copa sigue la forma de la cabeza con un poco de espacio para el pelo aplastado, y tapa toda la parte de arriba.
- El borde va sobre la frente y baja un poco hacia la nuca, como una gorra real.
- El pelo que queda debajo de la copa se aplasta y **asoma solo por debajo**: por los costados, la nuca y, si es largo,
  por la espalda. Ningún peinado atraviesa la pieza.
- La **visera sale del borde de la gorra** sobre la frente, pegada, un poco curvada hacia los lados.
- La cola, las coletas y los moños salen por debajo de la pieza (un moño alto pasa a la nuca mientras lleves gorra);
  al quitártela vuelven a su lugar.
- Lo mismo con el **gorro de lana** (con su doblez y su pompón), el **sombrero** (la copa ya cabe con el pelo), el
  **casco de obra** (más alto, con su cresta y el ala más ancha adelante) y el **casco militar**.

Se usa igual que siempre: Vestuario › Prendas › Cabeza. Funciona con todos los peinados y los siete tipos de cuerpo, y
en las dos maneras de dibujar el pelo (masas y realista).

### 2. Más peinados, ordenados según el tipo de figura
Diecinueve peinados nuevos, en el mismo estilo de los de antes:
- **Hombre:** Tupé (copete), Hacia atrás, Cresta, Rizado corto, Afro, Rastas, Moño alto.
- **Mujer:** Bob (corto recto), Pixie, Trenza, Media cola, Rizos largos, Moño alto, Afro.
- **Niño y niña:** Tazón (hongo), Parado en puntas, Dos chongitos, Trenzas.
- **Anciano y anciana:** Canas hacia atrás, Rulos (permanente), Moño bajo.

«Afro» y «Moño alto» son uno solo para hombre y mujer. «Canas hacia atrás» sale canoso mientras no le elijas otro
color de pelo.

Cada peinado (los nuevos y los 14 de antes) sabe a qué cuerpos les va. En **Pelo** (en «Modificar figura» y en la
ficha del personaje) aparecen primero los que le van a esa figura; el resto está detrás de **«Ver todos»**. A la mujer
no le salen «Entradas» ni «Calvicie»; al niño no le salen «Entradas» ni «Moño»; el extra ve los de hombre y los de
mujer. El peinado que ya tiene la figura siempre se ve en la lista, aunque no sea de su tipo, y **se conserva si le
cambias el tipo de cuerpo**. Las miniaturas de los peinados nuevos se dibujan como las de antes (las de «Ver todos»
recién al abrirlo).

### 3. La ropa dibujada se acomoda al cambiar el tipo de figura
Antes, si dibujabas una prenda en un adulto y cambiabas la figura a niño (más bajo y con la cabeza más grande), el
dibujo le tapaba la cara y la cabeza.

Ahora cada prenda dibujada recuerda sobre qué cuerpo se dibujó y, en otro cuerpo, cubre lo mismo: se ubica por las
referencias del cuerpo (cadera, cintura, pecho, cuello, mandíbula, ojos y coronilla; los brazos y las piernas a lo
largo de sus huesos: hombro, codo, muñeca; cadera, rodilla, tobillo) y según lo ancho y lo hondo del cuerpo a esa
altura. **Un polo dibujado en el adulto sigue siendo un polo en el niño**, en la niña, la mujer o el anciano. Con los
deslizadores de proporciones (hombros, caderas, cabeza, extremidades, abdomen) la prenda se dobla y se estira con el
cuerpo y sigue cubriendo lo mismo. Los accesorios dibujados como pieza (un sombrero, una mochila) también se corren y se
escalan con su parte del cuerpo.

- Las prendas dibujadas que ya tenías se ven **exactamente igual** en el cuerpo donde están. Como antes no se guardaba
  sobre qué cuerpo se dibujaron, se toma el que tiene la figura: al cambiarle el tipo, queda anotado el de antes y la
  prenda se acomoda al nuevo (y «Deshacer» lo deja todo como estaba).
- Si abres una prenda dibujada sobre otro cuerpo para retocarla, el editor la muestra sobre ese cuerpo (para que el
  dibujo coincida) con una nota: «Dibujada sobre el cuerpo de Hombre: en esta figura (Niño) se acomoda sola». La vista
  3D de la derecha la muestra ya acomodada en tu figura.
- Las prendas listas (polo, pantalón, falda…) ya se adaptaban solas: no cambian.

## Decisiones
- **Técnica de la gorra:** la copa y el pelo usan la misma medida del cráneo (la de los peinados). La copa queda a
  ~1 cm del cráneo (el pelo aplastado); el pelo que queda por encima del borde se aplasta hasta ahí y, debajo del borde,
  el tope se va abriendo de a poco: así sale «por debajo» como en la realidad, con cualquier peinado y cuerpo, sin
  medir peinado por peinado. Cada figura arma su peinado «con pieza» una sola vez (queda en memoria).
- La gorra no cambia de tamaño si la figura es calva: queda a 1 cm de la cabeza (desde afuera no se nota).
- El tipo de cuerpo de cada peinado: seguí tus listas y agregué los que eran obvios (por ejemplo, Corto y Rapado para
  niño; Trenzas también para mujer; Moño bajo también para mujer).
- Ropa dibujada: se guarda solo el tipo de cuerpo (`fit: { b: 'hombre' }` en la prenda), no las medidas; las
  referencias se miden del maniquí cada vez. Si ese maniquí todavía no cargó, la prenda se ve como antes un momento y se
  acomoda en cuanto carga.

## Cómo lo probé
- `node test/figuras-ad.test.js` (nueva): los 33 peinados y sus cuerpos, el pelo aplastado bajo la copa, la pieza de la
  cabeza puesta, la marca del cuerpo al cambiarlo y la correspondencia entre dos cuerpos (un cuerpo a escala cae en el
  mismo punto). El resto de `test/*.test.js` pasa, salvo `test/pdf.test.js` (le falta el módulo canvas, desde antes).
- En el navegador, con los maniquíes 3D (sin ellos, con `FS_SIN_MANIQUIES=1`, la app solo dibuja el maniquí simple: no
  hay pelo, gorras ni ropa que probar; los armé con `fig3d/maniqui.py` y los datos de MPFB2): gorra con corto,
  despeinado, melena, larga, moño, cola y coletas, de frente, de tres cuartos, de lado y de espaldas, en hombre, mujer,
  niño, niña y anciana; gorro, sombrero, casco de obra y casco militar; los 19 peinados nuevos en sus cuerpos y debajo
  de cada pieza; los dos modos de pelo; el selector con «Ver todos» en «Modificar figura» y en la ficha, en
  computadora, en teléfono y en inglés; un polo dibujado en el hombre puesto en niño, niña, mujer, anciano y anciana,
  con proporciones extremas y al revés (dibujado en niño, puesto en hombre); cambiar el tipo de cuerpo en el panel,
  deshacer y abrir la prenda en el editor de dibujo. Sin errores en la consola.

## Archivos
- `src/s3d-vestuario.js`: borde de las piezas de la cabeza (`VEST_HAT`, `vestHatFit`, `vestHatOf`) y copa, visera,
  doblez, ala y cresta nuevas en `vestPiece`.
- `src/s3d-pelo.js`: pelo aplastado bajo la pieza (`peloHatSquash`), anclas bajo el borde (`peloUnder`), los 19
  peinados nuevos (ayudantes `peloCurls`, `peloBun`, `peloBraid`, `peloSlick`; ondas, nudos y cuerdas en los mechones),
  el selector con «Ver todos» y el color de «Canas».
- `src/s3d-model.js`: `S3_PELO` con los cuerpos de cada peinado y `peloFits`.
- `src/s3d-accesorios.js`: referencias del cuerpo (`accLand`), correspondencia entre cuerpos (`accFitMap`,
  `accPieceFit`), `accFitStamp` y el editor de dibujo con el cuerpo de la prenda.
- `src/s3d-figuras.js`: el peinado con la pieza puesta y el color de «Canas».
- `src/shot-editor.js` y `src/ficha.js`: al cambiar el tipo de cuerpo, la ropa dibujada queda con el cuerpo de antes.
- `src/shell.html`: el botón «Ver todos» y los nombres de los peinados en dos líneas.
- `i18n/en-manual.json`: bloque «lote AD · figuras».
- `test/figuras-ad.test.js`: nueva.
