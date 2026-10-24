/* ============================================================
   PROYECTO DE EJEMPLO (guion corto original, en Fountain)
   ============================================================ */
const SAMPLE_FOUNTAIN = `Title: La última función
Author: Ejemplo de FilmSpirit

EXT. CINE PRIMAVERA - FACHADA - DÍA

Un letrero de neón apagado: CINE PRIMAVERA. Le faltan dos letras.

ANA (34), casaca de jean y cabello recogido con un lápiz, sube una escalera y despega las letras de la marquesina una por una.

Un mototaxi frena en la vereda. TITO (28), gorra al revés, toca la bocina. PIIII.

TITO
¡Ana! Te traje desayuno.

ANA
(sin bajar)
Si me caigo, me pagas el seguro.

Tito levanta una bolsa de pan. Ana duda. Baja.

INT. CINE PRIMAVERA - CABINA DE PROYECCIÓN - DÍA

Polvo flotando en la luz de una ventanita. Un proyector de 35 mm cubierto con una sábana. En la pared, un calendario de 1998.

Ana retira la sábana. Pasa los dedos por las latas de película apiladas en la repisa.

ANA
Doce rollos. Si los vendo por separado...

TITO
Nadie compra rollos, Ana. Compran celulares.

DON ALFREDO (70), en pantuflas y con un termo en la mano, asoma por la puerta.

DON ALFREDO
El sábado entregan el local. Que suene bonito la última vez.

Ana mira la lámpara del proyector: está negra, quemada.

EXT. MERCADO LA HERMELINDA - DÍA

Gente, carretillas, vendedores que gritan precios. Ana y Tito avanzan entre los puestos.

Un VENDEDOR (50s) de repuestos revisa una lámpara de proyector contra la luz.

VENDEDOR
Esto ya no se fabrica. Trescientos.

ANA
Ciento cincuenta.

VENDEDOR
Doscientos y te regalo el fusible.

Ana cuenta billetes arrugados. Tito mira su celular: una notificación del banco. La apaga.

EXT. AVENIDA ESPAÑA - MOTOTAXI EN MOVIMIENTO - ATARDECER

La ciudad pasa naranja. Ana abraza la caja con la lámpara como si fuera un bebé.

TITO
¿Y si nadie viene?

ANA
Viene don Alfredo. Con eso ya somos tres.

INT. CINE PRIMAVERA - CABINA DE PROYECCIÓN - NOCHE

Ana instala la lámpara nueva. Ajusta el fusible. Una chispa. Un hilo de humo.

Silencio.

CLICK. El proyector arranca: TAKA-TAKA-TAKA.

ANA
¡Ya está!

INT. CINE PRIMAVERA - SALA - NOCHE

Butacas vacías. Don Alfredo, solo en la fila tres, sirve café de su termo.

Al fondo, VECINOS van entrando uno por uno, algunos con sus propias sillas plegables. Suena un bolero desde los parlantes.

DON ALFREDO
(a Tito)
¿Quién les avisó?

TITO
Instagram, don Alfredo. Instagram.

EXT. CINE PRIMAVERA - FACHADA - NOCHE

Lluvia fina. Ana enciende el neón: parpadea, se apaga, vuelve. Se queda.

Ana le toma una foto con su celular. Atrás, la sala llena se ríe de algo.
`;
/* el mismo ejemplo en inglés (cuando el programa está en inglés) */
const SAMPLE_FOUNTAIN_EN = `Title: The Last Show
Author: FilmSpirit Sample

EXT. PRIMAVERA CINEMA - FRONT - DAY

A neon sign, switched off: CINE PRIMAVERA. Two letters are missing.

ANA (34), denim jacket, hair pinned up with a pencil, climbs a ladder and peels the letters off the marquee one by one.

A moto-taxi brakes at the curb. TITO (28), cap on backwards, honks the horn. BEEP.

TITO
Ana! I brought breakfast.

ANA
(without coming down)
If I fall, you're paying for the insurance.

Tito holds up a bag of bread. Ana hesitates. Comes down.

INT. PRIMAVERA CINEMA - PROJECTION BOOTH - DAY

Dust floating in the light from a small window. A 35 mm projector under a bedsheet. On the wall, a 1998 calendar.

Ana pulls off the sheet. Runs her fingers over the film cans stacked on the shelf.

ANA
Twelve reels. If I sell them separately...

TITO
Nobody buys reels, Ana. They buy phones.

DON ALFREDO (70), in slippers and holding a thermos, peeks in through the door.

DON ALFREDO
They hand over the place on Saturday. Let it sound nice one last time.

Ana looks at the projector lamp: it's black, burned out.

EXT. LA HERMELINDA MARKET - DAY

Crowds, carts, vendors shouting prices. Ana and Tito push their way between the stalls.

A spare-parts VENDOR (50s) holds a projector lamp up to the light.

VENDOR
They don't make these anymore. Three hundred.

ANA
One fifty.

VENDOR
Two hundred and I'll throw in the fuse.

Ana counts crumpled bills. Tito checks his phone: a notification from the bank. He switches it off.

EXT. AVENIDA ESPAÑA - MOTO-TAXI (MOVING) - SUNSET

The city goes by in orange. Ana hugs the box with the lamp as if it were a baby.

TITO
What if nobody comes?

ANA
Don Alfredo's coming. That makes three of us.

INT. PRIMAVERA CINEMA - PROJECTION BOOTH - NIGHT

Ana installs the new lamp. Adjusts the fuse. A spark. A thread of smoke.

Silence.

CLICK. The projector starts up: TAKA-TAKA-TAKA.

ANA
That's it!

INT. PRIMAVERA CINEMA - AUDITORIUM - NIGHT

Empty seats. Don Alfredo, alone in row three, pours coffee from his thermos.

In the back, NEIGHBORS trickle in one by one, some carrying their own folding chairs. A bolero plays over the speakers.

DON ALFREDO
(to Tito)
Who told them?

TITO
Instagram, Don Alfredo. Instagram.

EXT. PRIMAVERA CINEMA - FRONT - NIGHT

Light rain. Ana switches on the neon: it flickers, goes out, comes back. It stays.

Ana takes a photo of it with her phone. Behind her, the packed house laughs at something.
`;
/* los textos del ejemplo (los planos, las sinopsis, la construcción…) en los dos idiomas */
const SAMPLE_TX = {
  es: {
    fountain: () => SAMPLE_FOUNTAIN, title: 'La última función (ejemplo)', author: 'Ejemplo de FilmSpirit', draft: 'Versión de muestra',
    at: ['Un letrero', 'ANA (34)', 'Tito levanta', 'Un mototaxi', 'Si me caigo', 'Polvo flotando', 'Ana retira', 'DON ALFREDO', 'DON ALFREDO (70)', 'El sábado', 'Ana mira la lámpara', 'Ana instala', 'Silencio.', 'CLICK', 'ANA', 'Butacas vacías', 'TITO', 'Lluvia fina', 'Ana le toma'],
    shots: ['La marquesina sin letras contra el cielo; bajamos hasta la escalera.', 'Máster: Ana en la escalera, entra el mototaxi por derecha.', 'Tito desde el punto de vista de Ana, arriba.',
      'La sábana sobre el proyector; polvo en el rayo de luz.', 'Ana recorre la cabina; Tito en segundo término.', 'Don Alfredo en el vano de la puerta.', 'La lámpara quemada.',
      'Ana concentrada, iluminada por la chispa.', 'El mecanismo arranca: la película corre.', 'La sala desde la cabina; los vecinos van llenando las filas.',
      'Contraplano de Don Alfredo sobre el hombro de Tito.', 'El neón vuelve a la vida; nos alejamos con Ana en cuadro.'],
    takes: ['Pasa una combi', 'Bocina a destiempo', 'Foco suave al final'],
    noteLabel: 'Plano 1.2', noteDir: 'Dirección', noteProd: 'Producción',
    note1: '¿Y si el máster va en dolly? Entraríamos con el mototaxi en movimiento.', note2: 'Hay dolly el día 1. Lo confirmo con foto de la vereda.',
    syn: ['Ana desarma la marquesina del cine; Tito llega con desayuno.', 'En la cabina, Ana encuentra doce rollos y la lámpara del proyector quemada. Don Alfredo pide que la última vez suene bonito.',
      'En el mercado, Ana regatea una lámpara de repuesto con lo poco que tiene.', 'De vuelta en el mototaxi, Tito duda de que alguien vaya a venir. Ana no.',
      'Ana instala la lámpara nueva: el proyector arranca.', 'La sala vacía se va llenando de vecinos con sus propias sillas.', 'Ana enciende el neón bajo la lluvia; adentro, la sala llena se ríe.'],
    logline: 'Antes de entregar el viejo Cine Primavera, Ana tiene un día para conseguir una lámpara de proyector que ya no se fabrica y darle al barrio una última función.',
    storyline: 'El Cine Primavera cierra el sábado. Ana, que desarma su marquesina, descubre que el único proyector que queda tiene la lámpara quemada. Con Tito y su mototaxi recorre el mercado hasta dar con una de repuesto, que paga con lo poco que tiene. Esa noche el proyector vuelve a andar, los vecinos llenan la sala y el neón se enciende una vez más.',
    sinopsis: 'Ana (34) desarma la marquesina del Cine Primavera, la sala de barrio donde creció y que su abuelo, Don Alfredo (70), entrega el sábado. Tito (28) llega con desayuno en su mototaxi y la ayuda a revisar la cabina: hay doce rollos de película, pero la lámpara del proyector está quemada. Don Alfredo solo pide que la última vez suene bonito.\n\nAna y Tito recorren el mercado La Hermelinda hasta encontrar a un vendedor de repuestos con una lámpara que ya no se fabrica. Ana la paga con billetes arrugados mientras Tito esconde una notificación del banco. De vuelta, Tito duda de que alguien vaya a venir; para Ana, con Don Alfredo ya son tres.\n\nEsa noche la lámpara nueva enciende y el proyector arranca. La sala, vacía, se va llenando de vecinos que traen sus propias sillas. Afuera, bajo una lluvia fina, Ana enciende el neón: parpadea, se apaga y vuelve. Se queda.',
    card: ['EXT. CASA DE TITO - NOCHE', 'Tito vende algo suyo para completar lo que falta, sin que Ana lo sepa.'],
    acts: ['Acto I', 'Acto II', 'Acto III'], plots: ['La última función', 'Tito y sus deudas'],
    bio: { role: 'Protagonista', look: 'Casaca de jean gastada, el cabello recogido con un lápiz. Se mueve rápido, como si siempre llegara tarde.',
      persona: 'Terca y práctica; hace chistes cuando tiene miedo. No pide ayuda.', past: 'Creció en la cabina del Cine Primavera mirando películas por la ventanita mientras su abuelo proyectaba.',
      want: 'Que el cine tenga una última función digna antes de entregarlo.', need: 'Aceptar que el cine se va, y que lo que importa es el barrio que lo llenaba.',
      fear: 'Que nadie venga: que todo lo que su abuelo hizo ya no le importe a nadie.', arc: 'De querer salvar el lugar a despedirlo acompañada.', rel: 'Tito, su amigo de siempre, la sigue aunque tenga sus propias deudas. Don Alfredo, su abuelo.' },
  },
  en: {
    fountain: () => SAMPLE_FOUNTAIN_EN, title: 'The Last Show (sample)', author: 'FilmSpirit Sample', draft: 'Sample draft',
    at: ['A neon sign', 'ANA (34)', 'Tito holds up', 'A moto-taxi', 'If I fall', 'Dust floating', 'Ana pulls off', 'DON ALFREDO', 'DON ALFREDO (70)', 'They hand over', 'Ana looks at the', 'Ana installs', 'Silence.', 'CLICK', 'ANA', 'Empty seats', 'TITO', 'Light rain', 'Ana takes'],
    shots: ['The marquee without its letters against the sky; we tilt down to the ladder.', 'Master: Ana on the ladder, the moto-taxi enters frame right.', 'Tito from Ana’s point of view, up on the ladder.',
      'The sheet over the projector; dust in the beam of light.', 'Ana moves through the booth; Tito in the background.', 'Don Alfredo in the doorway.', 'The burned-out lamp.',
      'Ana focused, lit by the spark.', 'The mechanism starts: the film runs.', 'The auditorium from the booth; the neighbors fill up the rows.',
      'Reverse on Don Alfredo over Tito’s shoulder.', 'The neon comes back to life; we pull back with Ana in frame.'],
    takes: ['A minibus drives through', 'Horn honked off cue', 'Soft focus at the end'],
    noteLabel: 'Shot 1.2', noteDir: 'Director', noteProd: 'Producer',
    note1: 'What if the master is on a dolly? We’d come in with the moto-taxi moving.', note2: 'We have a dolly on day 1. I’ll confirm with a photo of the sidewalk.',
    syn: ['Ana takes down the cinema’s marquee; Tito shows up with breakfast.', 'In the booth, Ana finds twelve reels and the projector lamp burned out. Don Alfredo asks that the last time sound nice.',
      'At the market, Ana haggles for a spare lamp with what little she has.', 'Back in the moto-taxi, Tito doubts anyone will come. Ana doesn’t.',
      'Ana installs the new lamp: the projector starts up.', 'The empty auditorium fills with neighbors carrying their own chairs.', 'Ana switches on the neon in the rain; inside, the packed house laughs.'],
    logline: 'Before the old Primavera Cinema is handed over, Ana has one day to find a projector lamp nobody makes anymore and give the neighborhood one last show.',
    storyline: 'The Primavera Cinema closes on Saturday. Ana, taking down its marquee, discovers that the only projector left has a burned-out lamp. With Tito and his moto-taxi she combs the market until she finds a spare, which she pays for with what little she has. That night the projector runs again, the neighbors fill the auditorium and the neon lights up one more time.',
    sinopsis: 'Ana (34) takes down the marquee of the Primavera Cinema, the neighborhood movie house where she grew up and which her grandfather, Don Alfredo (70), hands over on Saturday. Tito (28) arrives with breakfast in his moto-taxi and helps her check the booth: there are twelve reels of film, but the projector lamp is burned out. Don Alfredo only asks that the last time sound nice.\n\nAna and Tito comb La Hermelinda market until they find a spare-parts vendor with a lamp nobody makes anymore. Ana pays with crumpled bills while Tito hides a notification from the bank. On the way back, Tito doubts anyone will come; for Ana, with Don Alfredo that already makes three.\n\nThat night the new lamp lights up and the projector starts. The empty auditorium fills with neighbors who bring their own chairs. Outside, in a light rain, Ana switches on the neon: it flickers, goes out and comes back. It stays.',
    card: ['EXT. TITO’S HOUSE - NIGHT', 'Tito sells something of his own to make up the difference, without Ana knowing.'],
    acts: ['Act I', 'Act II', 'Act III'], plots: ['The Last Show', 'Tito and his debts'],
    bio: { role: 'Lead', look: 'A worn denim jacket, hair pinned up with a pencil. She moves fast, as if she were always running late.',
      persona: 'Stubborn and practical; cracks jokes when she’s scared. Never asks for help.', past: 'Grew up in the Primavera Cinema’s booth, watching movies through the little window while her grandfather ran the projector.',
      want: 'For the cinema to have one last decent show before it’s handed over.', need: 'To accept that the cinema is going, and that what matters is the neighborhood that filled it.',
      fear: 'That nobody comes: that everything her grandfather did no longer matters to anyone.', arc: 'From wanting to save the place to saying goodbye to it in good company.', rel: 'Tito, her lifelong friend, follows her even though he has debts of his own. Don Alfredo, her grandfather.' },
  },
};
function buildSample() {
  const X = SAMPLE_TX[typeof EN !== 'undefined' && EN ? 'en' : 'es'], A = X.at;
  const parsed = parseFountain(X.fountain());
  const Pn = newProject(X.title, parsed.paras);
  Pn.meta.author = X.author;
  Pn.meta.draft = X.draft;
  autoBreakdown(Pn, {});
  const sc = computeScenes(Pn.paras);
  const find = (si, start) => { const s = sc.scenes[si]; for (let i = s.p0; i < s.p1; i++) if (Pn.paras[i].x.startsWith(start)) return i; return s.p0 + 1; };
  const castId = n => (Object.values(Pn.elements).find(e => e.cat === 'cast' && e.name === n) || {}).id;
  const ANA = castId('ANA'), TITO = castId('TITO'), ALF = castId('DON ALFREDO');
  let ord = 0;
  const S = (si, a, b, f) => {
    const s = sc.scenes[si];
    const id = uid('s');
    Pn.shots[id] = { id, sc: s.key, ord: ++ord, p0: find(si, a), p1: find(si, b), size: 'PM', angle: 'Normal', move: 'Fijo', lens: '', support: '', dur: '', desc: '', chars: [], notes: '', done: false, ...f };
    return id;
  };
  const D = X.shots;
  const s1 = S(0, A[0], A[0], { size: 'PG', angle: 'Contrapicado', move: 'Tilt', lens: '24', support: 'Trípode', dur: '6', desc: D[0], chars: [ANA], done: true });
  const s2 = S(0, A[1], A[2], { size: 'PE', move: 'Fijo', lens: '35', support: 'Trípode', dur: '40', desc: D[1], chars: [ANA, TITO], done: true });
  const s3 = S(0, A[3], A[4], { size: 'PM', angle: 'Picado', lens: '50', support: 'Mano', dur: '12', desc: D[2], chars: [TITO] });
  S(1, A[5], A[6], { size: 'PD', move: 'Dolly in', lens: '50', support: 'Slider', dur: '8', desc: D[3] });
  S(1, A[6], A[7], { size: 'PMC', lens: '35', support: 'Gimbal', move: 'Seguimiento', dur: '25', desc: D[4], chars: [ANA, TITO] });
  S(1, A[8], A[9], { size: 'PA', angle: 'Normal', lens: '35', dur: '10', desc: D[5], chars: [ALF] });
  S(1, A[10], A[10], { size: 'INS', lens: '85', dur: '3', desc: D[6] });
  S(4, A[11], A[12], { size: 'PP', angle: 'Normal', lens: '50', support: 'Mano', move: 'Cámara en mano', dur: '15', desc: D[7], chars: [ANA] });
  S(4, A[13], A[14], { size: 'PD', lens: '85', dur: '4', desc: D[8] });
  S(5, A[15], A[16], { size: 'GPG', angle: 'Picado', lens: '18', support: 'Trípode', dur: '20', desc: D[9], chars: [ALF] });
  S(5, A[7], A[16], { size: 'PM', angle: 'Sobre el hombro', lens: '50', dur: '12', desc: D[10], chars: [TITO, ALF] });
  S(6, A[17], A[18], { size: 'PG', angle: 'Contrapicado', move: 'Dolly out', lens: '24', support: 'Dolly', dur: '18', desc: D[11], chars: [ANA] });
  Pn.sup.takes[s1] = [{ n: 1, st: 'ng', t: '07:42', note: X.takes[0] }, { n: 2, st: 'bn', t: '07:46', note: '' }];
  Pn.sup.takes[s2] = [{ n: 1, st: 'ok', t: '08:10', note: '' }, { n: 2, st: 'ng', t: '08:14', note: X.takes[1] }, { n: 3, st: 'bn', t: '08:17', note: '' }];
  Pn.sup.takes[s3] = [{ n: 1, st: 'ok', t: '08:40', note: X.takes[2] }];
  // una conversación de ejemplo: así se ve una nota pegada a un plano, con su respuesta
  const t0 = Date.now() - 3 * 3600e3, on2 = { t: 'shot', id: s2, sec: 'storyboard', tab: 'board', label: X.noteLabel };
  Pn.notes = {
    nej1: { id: 'nej1', on: on2, by: 'ej-dir', name: X.noteDir, ts: t0, text: X.note1 },
    nej2: { id: 'nej2', on: on2, by: 'ej-prod', name: X.noteProd, ts: t0 + 40 * 60e3, text: X.note2, re: 'nej1' },
  };
  // Construcción: el argumento, las sinopsis de la escaleta, tres actos, dos tramas y una escena por escribir
  X.syn.forEach((t, i) => { if (t && sc.scenes[i]) Pn.scenes[sc.scenes[i].key] = { synopsis: t }; });
  const act = [0, 0, 1, 1, 1, 2, 2], K = i => sc.scenes[i] && sc.scenes[i].key;
  Pn.build = {
    arg: { logline: X.logline, storyline: X.storyline, sinopsis: X.sinopsis, argumento: '' },
    cards: K(2) ? { kej1: { id: 'kej1', h: X.card[0], syn: X.card[1], after: K(3), ord: 0, act: 1, plot: 'p2' } } : {},
    sc: Object.fromEntries(sc.scenes.map((s, i) => [s.key, { act: act[i] ?? 2, plot: i === 3 ? 'p2' : 'p1' }])),
    acts: X.acts.slice(),
    plots: [{ id: 'p1', name: X.plots[0], c: '#E0523A' }, { id: 'p2', name: X.plots[1], c: '#3D7FD6' }],
    bios: ANA ? { [ANA]: { id: ANA, el: ANA, name: 'ANA', age: '34', ord: 0, ...X.bio, notes: '' } } : {},
  };
  Pn.schedule.pagesPerDay = 1.5;
  autoPlan(Pn, sc, sceneMetrics(Pn.paras, layoutScript(Pn.paras), sc));
  const sem = sceneElementMap(Pn, sc);
  syncBudget(Pn, sc, sem);
  Pn._sample = true;
  Pn._saved = false;
  return Pn;
}
