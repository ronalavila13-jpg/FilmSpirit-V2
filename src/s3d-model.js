/* ============================================================
   ESCENA 3D DEL PLANO · modelo de datos (sin DOM ni THREE)
   Unidades en metros y grados. x a la derecha, z hacia la cámara
   por defecto. rot 0 = la figura mira hacia +z. yaw 0 = la cámara
   mira hacia −z.
   ============================================================ */
const S3_EXPR = [
  ['neutral', 'Neutral'], ['feliz', 'Feliz'], ['risa', 'Risa'], ['triste', 'Triste'], ['enojado', 'Enojado'],
  ['sorpresa', 'Sorpresa'], ['miedo', 'Miedo'], ['pensativo', 'Pensativo'], ['grito', 'Grito'], ['ojos cerrados', 'Ojos cerrados'],
  ['preocupado', 'Preocupado'], ['dolor', 'Dolor'], ['asco', 'Asco'], ['desconfiado', 'Desconfiado'], ['cansado', 'Cansado'],
  ['avergonzado', 'Avergonzado'], ['guino', 'Guiño'], ['decidido', 'Decidido'], ['llanto', 'Llanto'], ['confundido', 'Confundido'],
];
/* posturas predefinidas: solo el cuerpo, sin objetos. Cada una es la cadera (altura en unidades del
   maniquí, 0,95 = de pie; giro hacia atrás en grados; corrimiento) más ángulos de S3_JOINTS que se suman
   a la figura de pie. Los ángulos que la persona mueve después se suman encima.
   h: alto visible respecto de la figura de pie (encuadres y nombre); ground: la cadera baja hasta que
   el pie de apoyo toque el suelo; walk: al desplazarse entre claves da pasos (1 camina, 1.7 corre);
   seat: sentado o de rodillas (se oculta la falda); expr: expresión que sugiere si la cara está neutral;
   ir: giro de cada brazo hacia adentro sobre su eje [der, izq], para que el codo doble hacia el cuerpo */
const S3_POSES = {
  pie: { name: 'De pie', h: 1, ground: true, walk: 1 },
  camina: { name: 'Caminando', h: .99, ground: true, walk: 1, f: [18, 18], j: { lR: 24, kR: 4, lL: -16, kL: 18, sRx: -18, sLx: 18, eR: 8, eL: 8 } },
  corre: { name: 'Corriendo', h: .95, ground: true, walk: 1.7, f: [52, 52], j: { tx: 12, hx: -9, lR: 52, kR: 72, lL: -28, kL: 70, sRx: -36, eR: 80, sLx: 30, eL: 76 } },
  sentado: { name: 'Sentado', h: .74, seat: true, hips: [.5], j: { lR: 85.94, lL: 85.94, kR: 83.08, kL: 83.08, sRx: 20.05, sLx: 20.05, eR: 38.96, eL: 38.96 } },
  suelo: { name: 'Tendido', h: .3, hips: [.14, -90, .2], j: { sRz: 17.19, sLz: 17.19 } },
  maneja: { name: 'Manejando', h: .72, seat: true, hips: [.5], j: { tx: -6, hx: -4, lR: 78, lL: 82, kR: 62, kL: 70, sRx: 56, sLx: 56, sRz: -4, sLz: -4, eR: 30, eL: 30 } },
  salta: { name: 'Saltando', h: 1.08, hips: [1.1], j: { lR: 42, lL: 36, kR: 78, kL: 70, sRz: 128, sLz: 128, sRx: 24, sLx: 24, eR: 12, eL: 12, hx: -8 } },
  lucha: { name: 'Lucha', h: .94, ground: true, expr: 'enojado', j: { tx: 12, ty: -16, hx: -6, oR: 10, oL: 10, lR: 18, kR: 26, lL: -12, kL: 18, sRx: 52, sRz: 14, eR: 128, sLx: 70, sLz: 14, eL: 112 } },
  brazos: { name: 'Manos arriba', h: 1, ground: true, j: { sRz: 151.83, sLz: 151.83, eR: -6.88, eL: -6.88 } },
  saluda: { name: 'Saludando', h: 1, ground: true, expr: 'feliz', j: { sRz: 118, sRx: 22, eR: 42, hy: -8, tz: -3 } },
  ciclista: { name: 'Ciclista', h: .82, seat: true, hips: [.9], j: { tx: 38, hx: -30, lR: 80, kR: 100, lL: 30, kL: 50, sRx: 62, sLx: 62, sRz: 6, sLz: 6, eR: 18, eL: 18 } },
  llora: { name: 'Llorando', h: .96, ground: true, expr: 'triste', neck: 14, j: { tx: 14, hx: 12, sRx: 43, sLx: 43, sRz: 12, sLz: 12, eR: 124, eL: 124, kR: 6, kL: 6 } },
  piensa: { name: 'Pensando', h: 1, ground: true, expr: 'pensativo', ir: [18, 74], j: { sRx: 34, sRz: 4, eR: 140, sLx: 14, sLz: -6, eL: 96, hx: 8, hy: 12, tz: 2 } },
  senala: { name: 'Señalando', h: 1, ground: true, walk: 1, j: { sRx: 83.08, sRz: -2.86, eR: -4.01, hy: -8.59 } },
  manos: { name: 'Manos al rostro', h: .99, ground: true, neck: 8.59, j: { sRx: 42.97, sLx: 42.97, sRz: 14.32, sLz: 14.32, eR: 122.04, eL: 122.04, tx: 6.88 } },
  cruzados: { name: 'Brazos cruzados', h: 1, ground: true, ir: [74, 68], j: { sRx: 16, sLx: 12, sRz: -6, sLz: -6, eR: 84, eL: 90 } },
  cuclillas: { name: 'En cuclillas', h: .56, ground: true, seat: true, j: { tx: 30, hx: -18, lR: 108, lL: 108, kR: 140, kL: 140, oR: 14, oL: 14, sRx: 40, sLx: 40, eR: 40, eL: 40 } },
  rodillas: { name: 'De rodillas', h: .7, ground: true, seat: true, j: { kR: 92, kL: 92, sRx: 8, sLx: 8, eR: 14, eL: 14 } },
  rodilla: { name: 'Rodilla en tierra', h: .72, ground: true, seat: true, j: { lR: 90, kR: 90, kL: 92, oL: 4, sRx: 30, eR: 60, sLx: 6 } },
  sentsuelo: { name: 'Sentado en el suelo', h: .5, seat: true, hips: [.13], j: { tx: 12, hx: -4, lR: 78, lL: 78, kR: 64, kL: 64, oR: 8, oL: 8, sRx: 52, sLx: 52, eR: 34, eL: 34 } },
  mesa: { name: 'Sentado a la mesa', h: .72, seat: true, hips: [.5], j: { tx: 14, hx: 14, lR: 86, lL: 86, kR: 86, kL: 86, sRx: 16, sLx: 16, eR: 66, eL: 66, sRz: 4, sLz: 4 } },
  bocabajo: { name: 'Boca abajo', h: .26, hips: [.14, 90, -.2], j: { hx: -22, sRz: 18, sLz: 18 } },
  inclinado: { name: 'Inclinado', h: .74, ground: true, j: { tx: 66, hx: -20, lR: 6, lL: 6, kR: 6, kL: 6, sRx: 62, sLx: 62, eR: 10, eL: 10 } },
  reza: { name: 'Rezando', h: .99, ground: true, expr: 'ojos cerrados', ir: [34, 34], j: { hx: 16, sRx: 14, sLx: 14, sRz: -8, sLz: -8, eR: 100, eL: 100 } },
  baila: { name: 'Bailando', h: .98, ground: true, expr: 'feliz', j: { tz: 9, ty: 14, hx: -6, hy: 10, sRz: 128, sRx: 18, eR: 34, sLz: 38, sLx: -18, eL: 64, lR: 30, kR: 50, oR: 6 } },
  cubre: { name: 'Cubriéndose', h: .9, ground: true, expr: 'miedo', j: { tx: 16, hx: 12, sRx: 72, sLx: 72, sRz: 10, sLz: 10, eR: 124, eL: 124, lR: 14, lL: 14, kR: 26, kL: 26 } },
};
const S3_POSE = Object.entries(S3_POSES).map(([k, p]) => [k, p.name]);
const poseDef = k => S3_POSES[k] || S3_POSES.pie;
const S3_PROPS = {
  mesa: { name: 'Mesa', w: 1.4, d: .8, cat: 'mueble' }, silla: { name: 'Silla', w: .45, d: .45, cat: 'mueble' }, sofa: { name: 'Sofá', w: 2, d: .85, cat: 'mueble' },
  cama: { name: 'Cama', w: 1.5, d: 2, cat: 'mueble' }, puerta: { name: 'Puerta', w: 1, d: .12, wall: true, cat: 'escena' }, ventana: { name: 'Ventana', w: 1.3, d: .12, wall: true, cat: 'escena' },
  pared: { name: 'Pared', w: 3, d: .15, cat: 'escena' }, auto: { name: 'Auto', w: 1.8, d: 4.5, cat: 'vehiculo' }, moto: { name: 'Mototaxi', w: 1.3, d: 2.4, cat: 'vehiculo' },
  arbol: { name: 'Árbol', w: 1.4, d: 1.4, cat: 'escena' }, caja: { name: 'Caja', w: .5, d: .5, cat: 'objeto' }, detalle: { name: 'Objeto de detalle', w: .6, d: .6, cat: 'objeto' },
  poste: { name: 'Poste', w: .25, d: .25, cat: 'escena' }, mostrador: { name: 'Mostrador', w: 2.2, d: .6, cat: 'mueble' }, lampara: { name: 'Lámpara de pie', w: .4, d: .4, cat: 'mueble' },
  guitarra: { name: 'Guitarra', w: .4, d: .15, small: true, cat: 'objeto' }, camara_foto: { name: 'Cámara de fotos', w: .16, d: .12, small: true, cat: 'objeto' },
  camara_video: { name: 'Cámara de video', w: .2, d: .35, small: true, cat: 'objeto' }, camara_cine: { name: 'Cámara de cine en trípode', w: .9, d: .9, cat: 'equipo' },
  celular: { name: 'Celular', w: .08, d: .02, small: true, cat: 'objeto' }, mochila: { name: 'Mochila', w: .32, d: .2, small: true, cat: 'objeto' },
};
/* grupos de la lista «+ Objeto» */
const S3_PROP_CATS = [['vehiculo', 'Vehículos'], ['animal', 'Animales'], ['mueble', 'Muebles'], ['objeto', 'Objetos'], ['arma', 'Armas de utilería'], ['escena', 'Puertas, muros y exteriores'], ['equipo', 'Equipo de rodaje']];
const S3_BODY = {
  hombre: { name: 'Hombre', s: 1, h: 1.72, sh: 1, hip: 1, head: 1, hunch: 0, hair: 'corto', hc: '#2E241D' },
  mujer: { name: 'Mujer', s: .94, h: 1.62, sh: .86, hip: 1.07, head: .96, hunch: 0, hair: 'largo', hc: '#3B2A20', fem: true },
  anciano: { name: 'Anciano', s: .95, h: 1.68, sh: .96, hip: 1.02, head: 1, hunch: .25, hair: 'calvo', hc: '#CFCAC2' },
  anciana: { name: 'Anciana', s: .9, h: 1.56, sh: .86, hip: 1.08, head: .98, hunch: .25, hair: 'recogido', hc: '#D8D4CC', fem: true },
  nino: { name: 'Niño', s: .62, h: 1.3, sh: .95, hip: .95, head: 1.3, hunch: 0, hair: 'corto', hc: '#2E241D' },
  nina: { name: 'Niña', s: .6, h: 1.26, sh: .9, hip: .95, head: 1.3, hunch: 0, hair: 'colitas', hc: '#2E241D', fem: true },
  // figura de relleno: maniquí sin rasgos faciales
  extra: { name: 'Extra', s: 1, h: 1.7, sh: .96, hip: 1, head: 1, hunch: 0, hair: 'ninguno', hc: '#8E949C', skin: '#C3C8CF', faceless: true },
};
const S3_TONOS = ['#D9D3C9', '#C8D2DD', '#CAD6CA', '#E0CCCB', '#E3D2B5', '#D2CBDD', '#BDBCBA', '#D6C6AE'];  // tono sutil del maniquí
// peinados estilo anime (se arman en s3d-pelo.js): cortos, medios y largos o recogidos, para todas las edades
const S3_PELO = [['ninguno', 'Sin pelo'], ['rapado', 'Rapado'], ['corto', 'Corto'], ['despeinado', 'Despeinado'], ['raya', 'Raya al lado'], ['flequillo', 'Flequillo'], ['entradas', 'Entradas'], ['calvicie', 'Calvicie'],
  ['melena', 'Melena'], ['ondas', 'Ondas'], ['larga', 'Larga'], ['cola', 'Cola'], ['coletas', 'Coletas'], ['recogido', 'Moño']];
const S3_SKIN = ['#EFE7DB', '#F2D9C4', '#E2BD98', '#C99A72', '#9E6E4B', '#6B4632', '#C3C8CF'];
/* proporciones del cuerpo en % (100 = la del tipo de cuerpo) */
const S3_PROP = [['shw', 'Hombros', 75, 135], ['hipw', 'Caderas', 75, 135], ['headk', 'Cabeza', 80, 130], ['limb', 'Extremidades', 75, 150], ['belly', 'Abdomen', 85, 150]];
const S3_JOINTS = [
  ['hy', 'Cabeza: giro', -80, 80], ['hx', 'Cabeza: inclinación', -40, 45], ['tx', 'Torso: inclinación', -25, 70],
  ['tz', 'Torso: a un lado', -35, 35], ['ty', 'Torso: giro', -60, 60],
  ['sRx', 'Brazo der.: adelante', -60, 180], ['sRz', 'Brazo der.: abrir', -10, 170], ['eR', 'Codo der.', 0, 150],
  ['sLx', 'Brazo izq.: adelante', -60, 180], ['sLz', 'Brazo izq.: abrir', -10, 170], ['eL', 'Codo izq.', 0, 150],
  ['lR', 'Pierna der.: adelante', -60, 110], ['oR', 'Pierna der.: abrir', -12, 60], ['kR', 'Rodilla der.', 0, 150],
  ['lL', 'Pierna izq.: adelante', -60, 110], ['oL', 'Pierna izq.: abrir', -12, 60], ['kL', 'Rodilla izq.', 0, 150],
  // la mano: giro sobre el antebrazo (grados; media vuelta para cada lado, la palma queda arriba o abajo con el brazo
  // en cualquier dirección), muñeca doblada hacia la palma (+) o hacia el dorso (−) y dedos cerrados (0 abierta, 100 puño)
  ['wR', 'Mano der.: girar', -180, 180], ['wL', 'Mano izq.: girar', -180, 180], ['mR', 'Muñeca der.: doblar', -80, 80], ['mL', 'Muñeca izq.: doblar', -80, 80],
  ['fR', 'Dedos der.: cerrar', 0, 100], ['fL', 'Dedos izq.: cerrar', 0, 100],
];
const S3_LIGHTS = {
  fresnel: { name: 'Fresnel (spot)', ang: 30, int: 60, k: 3200, h: 2.3, tilt: 25 },
  panel: { name: 'Panel LED suave', ang: 100, int: 60, k: 5600, h: 1.9, tilt: 15 },
  practica: { name: 'Práctica (lámpara)', ang: 0, int: 45, k: 2700, h: 1.5, tilt: 0 },
  sol: { name: 'Sol o HMI lejano', ang: 0, int: 70, k: 5600, h: 8, tilt: 40 },
  rebote: { name: 'Rebote', ang: 150, int: 100, k: 5600, h: 1.5, tilt: 0 },
  bandera: { name: 'Bandera', ang: 0, int: 100, k: 3200, h: 1.7, tilt: 0 },
};
/* kelvin a color RGB (aproximación de Tanner Helland) */
function kelvinHex(k) {
  const t = clamp(k, 1000, 12000) / 100;
  let r, g, b;
  if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; }
  else { r = 329.7 * Math.pow(t - 60, -.1332); g = 288.12 * Math.pow(t - 60, -.0755); b = 255; }
  const h = v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}
/* color de una luz visto por una cámara balanceada a wb kelvin */
function lightColor(k, wb) {
  const a = kelvinHex(k), b = kelvinHex(wb || 4300);
  const c = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16) / Math.max(1, parseInt(b.slice(i, i + 2), 16)));
  const m = Math.max(...c);
  return '#' + c.map(v => Math.round(clamp(v / m, 0, 1) * 255).toString(16).padStart(2, '0')).join('');
}
/* apariencia de una figura: la de su personaje (se comparte entre planos) o la propia */
/* aspecto que se deduce del nombre y del guion: se calcula una vez por nombre hasta el próximo derive() (antes se
   releía el guion entero con una expresión nueva en cada dibujo de cada figura) */
const GUESS_C = new Map();
function guessLook(el) {
  const ck = el && typeof P !== 'undefined' && P ? el.name : null;
  if (ck != null && GUESS_C.has(ck)) return { ...GUESS_C.get(ck) };
  const r = guessLook0(el);
  if (ck != null) GUESS_C.set(ck, r);
  return { ...r };
}
function guessLook0(el) {
  const n = deaccent((el && el.name || '').toUpperCase());
  let age = 0;
  if (el && typeof P !== 'undefined') {
    const rx = new RegExp('(?:^|[^A-Z])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\((\\d{1,2})', 'i');
    for (const p of P.paras) { if (p.t !== 'a') continue; const m = deaccent(p.x.toUpperCase()).match(rx); if (m) { age = +m[1]; break; } }
  }
  const first = n.replace(/^(EL|LA|LOS|LAS)\s+/, '').split(/\s+/)[0] || '';
  let fem = /^(DONA|SENORA|SRA|LA |ABUELA|NINA|MADRE|MAMA|TIA|HERMANA|HIJA|SENORITA)/.test(n) || /\b(ABUELA|MADRE|MAMA|TIA|HERMANA|HIJA|NINA|SENORA|VECINA|VENDEDORA|DOCTORA|PROFESORA|ENFERMERA|POLICIA FEMENINA)\b/.test(n);
  if (!fem && /A$/.test(first) && !/^(JOSHUA|LUCA|NICOLA|BAUTISTA|ELIAS|MATIAS|TOMAS|GARCIA|POLICIA|GUARDIA|COMANDANTA)$/.test(first)) fem = true;
  if (/^(DON|SENOR|SR\.?|ABUELO|PADRE|PAPA|TIO|HERMANO|HIJO|NINO)\b/.test(n)) fem = false;
  const old = age >= 62 || /\b(ABUEL[OA]|ANCIAN[OA])\b/.test(n) || /^(DON|DONA)\b/.test(n) && age === 0;
  const kid = (age && age <= 12) || /\b(NIN[OA]|BEBE|CHIQUILL[OA])\b/.test(n);
  const extra = /\b(EXTRAS?|FIGURANTES?|TRANSEUNTES?|PEATON(ES)?|MULTITUD|GENTE|PUBLICO|CLIENTES?|CURIOSOS?|BACKGROUND)\b/.test(n);
  const body = extra ? 'extra' : kid ? (fem ? 'nina' : 'nino') : old ? (fem ? 'anciana' : 'anciano') : (fem ? 'mujer' : 'hombre');
  const B = S3_BODY[body];
  return { body, hair: B.hc, hairStyle: B.hair, skin: B.skin || S3_SKIN[2], ropa: 'pantalon' };
}
function lookOf(ob) {
  const el = ob.el && typeof P !== 'undefined' && P.elements[ob.el];
  const base = el ? guessLook(el) : { body: 'hombre', hair: S3_BODY.hombre.hc, hairStyle: 'corto', skin: S3_SKIN[2], ropa: 'pantalon' };
  const lk = { ...base, ...(el ? el.look : ob.look) };
  lk.color = (el && el.look && el.look.color) || (!el && ob.look && ob.look.color) || ob.color || S3_COLORS[0];
  if (!S3_BODY[lk.body]) lk.body = 'hombre';
  const B = S3_BODY[lk.body];
  lk.height = clamp(num(lk.height) || B.h, .5, 2.4);
  lk.build = lk.build || 'media';
  lk.pants = lk.pants || '#5E626B';
  lk.tono = lk.tono || (B.faceless ? S3_TONOS[6] : S3_TONOS[0]);   // el extra, gris salvo que se elija otro tono
  lk.pelo = lk.pelo || 'ninguno';
  for (const [f, , a, b] of S3_PROP) lk[f] = clamp(num(lk[f]) || 100, a, b);
  lk.s = lk.height / (1.56 + .25 * B.head * lk.headk / 100);
  lk.w = num(lk.bw) ? clamp(num(lk.bw), 75, 140) / 100 : { delgada: .88, media: 1, robusta: 1.2 }[lk.build] || 1;
  lk.key = el ? el.id : null;
  return lk;
}
const bodyOf = ob => S3_BODY[lookOf(ob).body] || S3_BODY.hombre;
function eyeOf(s3, id, pose) {
  const ob = s3.objs.find(o => o.id === id);
  const B = ob ? bodyOf(ob) : S3_BODY.hombre;
  return eyeH(pose) * (ob ? lookOf(ob).s : 1) * (1 - B.hunch * .08);
}
/* «int:cocina» y los demás son la habitación con ese ambiente (s3.set = 'int', s3.room.kind = 'cocina'); «auto:suv» y los
   demás, el interior de ese vehículo (s3.set = 'auto', s3.car.m = 'suv'; «auto» solo es el sedán) */
const S3_SETS = [['int', 'Habitación vacía'], ['int:sala', 'Sala'], ['int:comedor', 'Comedor'], ['int:cocina', 'Cocina'], ['int:dormitorio', 'Dormitorio'], ['int:bano', 'Baño'], ['int:oficina', 'Oficina'], ['int:ascensor', 'Ascensor'], ['plano', 'Plano importado'],
  ['auto', 'Interior de vehículo: sedán'], ['auto:suv', 'Interior de vehículo: SUV'], ['auto:van', 'Interior de vehículo: van o combi'], ['auto:pickup', 'Interior de vehículo: pick-up'], ['auto:bus', 'Interior de vehículo: bus urbano'], ['ext', 'Exterior abierto'], ['calle', 'Calle'], ['jardin_d', 'Frente de la casa (jardín)'], ['jardin_t', 'Patio trasero (jardín)'], ['parque', 'Parque'], ['bosque', 'Bosque'], ['montana', 'Montaña'], ['playa', 'Playa'], ['mar', 'Mar abierto (en un bote)'], ['desierto', 'Desierto o arenal'], ['canaveral', 'Cañaveral o chacra'], ['vacio', 'Vacío (estudio)']];
const S3_COLORS = ['#C8563F', '#3D6FB6', '#C99A2E', '#4E8F5A', '#8B5BA6', '#3E8F94', '#B5577D', '#6B6F7A'];
/* ---------- el piso que se pisa ----------
   Casi todo está a nivel 0, pero las veredas de la calle tienen 15 cm. Figuras, objetos y luces se apoyan en
   el suelo que tienen debajo (más lo que se subió a mano con «Altura»), y la cámara nunca baja de él: nada
   queda hundido en la vereda ni la cámara dentro del piso. Las veredas y los edificios son los que dibuja
   s3d-render (CALLE_WALK) y los que la cámara no atraviesa (CALLE_BLOCKS, en floorplan). */
const CALLE_WALK = { h: .15, z: [-.75, -10.25], d: 2.5 };
function groundAt(s3, x, z) {
  if (s3 && s3.set === 'calle') for (const c of CALLE_WALK.z) if (Math.abs(z - c) <= CALLE_WALK.d / 2) return CALLE_WALK.h;
  return 0;
}
/* dónde se apoya una figura, un objeto o una luz: el suelo bajo sus pies más su «Altura» (solo figuras y objetos pequeños) */
const liftOf = (s3, p, withH = true) => p ? groundAt(s3, p.x, p.z) + (withH ? p.h || 0 : 0) : 0;
const CAM_FLOOR = .06;   // lo más bajo que va la cámara sobre el suelo
/* escenas de antes (v1), cuando la vereda no se pisaba sola: quien subió a mano una figura o un objeto 15 cm
   para pararlo en la vereda ahora lo tendría flotando; se le quita esa altura una sola vez */
function s3FloorFix(s3) {
  if (!s3 || typeof s3 !== 'object' || (s3.v || 1) >= 2) return;
  s3.v = 2;
  if (s3.set !== 'calle' || !Array.isArray(s3.keys)) return;
  for (const ob of s3.objs || []) {
    if (ob.kind !== 'actor' && !(S3_PROPS[ob.kind] || {}).small) continue;
    for (const k of s3.keys) {
      const p = k.o && k.o[ob.id];
      if (p && p.h && groundAt(s3, p.x, p.z) && Math.abs(p.h - CALLE_WALK.h) <= .04) p.h = round2(Math.max(0, p.h - CALLE_WALK.h));
    }
  }
}
const SIZE_FRAME = { // altura visible (m), centro vertical (m), lente sugerido
  GPG: [40, 3, 18], PG: [10, 1.2, 24], PC: [4.4, 1, 28], PE: [2.2, .92, 35], PA: [1.48, 1.22, 35], PM: [1.05, 1.42, 50],
  PMC: [.72, 1.55, 50], PP: [.46, 1.66, 85], PPP: [.26, 1.68, 100], PD: [.22, .8, 100], INS: [.16, .8, 100],
};
/* altura de los ojos (m) de una figura de 1,62 m de ojos en cada postura */
const eyeH = k => k === 'sentado' ? 1.18 : k === 'suelo' ? .32 : Math.round(162 * poseDef(k).h) / 100;
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const lerp = (a, b, u) => a + (b - a) * u;
const lerpAng = (a, b, u) => { let d = ((b - a + 540) % 360) - 180; return a + d * u; };
const smooth = u => u * u * (3 - 2 * u);
const round2 = v => Math.round(v * 100) / 100;

/* tamaños de sensor: [clave, nombre, corto, ancho en mm]. El ancho decide cuánto abarca un lente: con un sensor más
   chico, el mismo lente encuadra más cerrado (full frame, 36 mm, es la referencia de siempre) */
const SENSORS = [['ff', 'Full frame', 'FF', 36], ['s35', 'Super 35', 'S35', 24.9], ['apsc', 'APS-C', 'APS-C', 23.5], ['m43', 'Micro 4/3', 'M4/3', 17.3],
  ['1in', '1 pulgada', '1"', 13.2], ['s16', 'Super 16', 'S16', 12.5], ['phone', 'Teléfono', 'Tel.', 9.8], ['action', 'Cámara de acción', 'Acción', 6.2], ['lf', 'Formato grande (65 mm)', 'LF', 54.1]];
const sensorOf = s3 => SENSORS.find(x => x[0] === (s3 && s3.sensor)) || SENSORS[0];
const sensorW = s3 => sensorOf(s3)[3];
/* el lente equivalente en full frame (lo que usa el 3D para su ángulo de visión) */
const camFF = cam => Math.max(2, Math.min(2000, Math.max(8, Math.min(600, cam.lens || 35)) * 36 / (cam.sw || 36)));
const lensEqText = s3 => { const S = sensorOf(s3); return S[0] === 'ff' ? '' : S[2]; };
/* desenfoque del plano (s3.dof): se enfoca a s3.focus o, si no, a quien sigue la cámara o a la primera figura; el punto
   es el de sus ojos (un objeto o una luz: su altura). El diafragma es el de Luz › Exposición (f/2.8 si no se eligió) */
function dofFocus(s3, st) {
  const has = id => id && st.o[id] && s3.objs.some(o => o.id === id);
  const id = [s3.focus, s3.aim, ...s3.objs.filter(o => o.kind === 'actor').map(o => o.id)].find(has);
  if (!id) return null;
  const p = st.o[id], ob = s3.objs.find(o => o.id === id);
  return { id, x: p.x, z: p.z, y: ob.kind === 'actor' ? eyeOf(s3, id, p.pose) + liftOf(s3, p) : liftOf(s3, p) };
}
const dofF = s3 => { const f = +(((s3.light || {}).exp || {}).f); return f > 0 && isFinite(f) ? f : 2.8; };
function vfovFor(lens, aspect) {
  const filmH = 36 / Math.max(aspect, 1);
  return 2 * Math.atan(filmH / 2 / lens);
}
function aspectOf() { return (typeof ASPECTS !== 'undefined' && P && ASPECTS[P.meta.aspect]) || 16 / 9; }

/* ---------- duración estimada de un plano ---------- */
function estDur(sh) {
  if (sh.dur && num(sh.dur) > 0) return num(sh.dur);
  if (sh.p0 == null || typeof P === 'undefined') return 3;
  let dw = 0, aw = 0;
  for (let i = sh.p0; i <= sh.p1; i++) {
    const p = P.paras[i];
    if (!p) continue;
    const w = p.x.trim().split(/\s+/).filter(Boolean).length;
    if (p.t === 'd') dw += w; else if (p.t === 'a' || p.t === 'g') aw += w;
  }
  let s = dw / 2.4 + aw / 4.5;
  if (sh.size === 'PD' || sh.size === 'INS') s = Math.min(s, 3);
  return Math.round(clamp(s || 3, 1.5, 24) * 2) / 2;
}
const shotDur = sh => sh.dur && num(sh.dur) > 0 ? num(sh.dur) : estDur(sh);

const VEH_LIKE = /^(moto|taxi|patrullero|limosina|suv|pickup|van|bus|deportivo)$/;
/* ---------- escena por defecto a partir de los datos del plano ---------- */
/* elementos de la escena: luces, objetos y animales puestos desde la planta general (planta-general.js).
   P.scEls[escena] = [{ ob, pos }]: están en todos sus planos. Los que tienen puesta en escena propia los llevan en su
   escena 3D (se agregan, mueven y quitan desde la planta general); los demás y los que se crean después los toman de
   aquí al armar su escena por defecto */
const scEls = k => typeof P !== 'undefined' && P && P.scEls && Array.isArray(P.scEls[k]) ? P.scEls[k].filter(x => x && x.ob && x.ob.id && x.pos) : [];
function scElPut(s3, ob, pos) {
  if (s3.objs.some(o => o.id === ob.id)) return;
  s3AddObj(s3, JSON.parse(JSON.stringify(ob)), { ...pos });
  if (ob.kind === 'luz') { if (!s3.light) s3.light = { mode: 'sim', amb: .22, rig: true }; s3.light.mode = 'sim'; }   // como s3AddLight
}
function s3Default(sh) {
  const s = typeof sceneOfKey === 'function' ? sceneOfKey(sh.sc) : null;
  const ENV = envFromScene(s), set = ENV.set;
  const ids = (sh.chars || []).filter(id => P.elements[id]);
  const objs = [], st = {};
  const n = Math.max(ids.length, sh.size === 'PD' || sh.size === 'INS' ? 0 : 1);
  for (let i = 0; i < n; i++) {
    const el = ids[i] ? P.elements[ids[i]] : null;
    const id = 'a' + i;
    objs.push({ id, kind: 'actor', el: el ? el.id : null, name: el ? el.name : 'Figura', color: S3_COLORS[i % S3_COLORS.length] });
    let x = 0, z = 0, rot = 0;
    if (n === 2) { x = i ? .75 : -.75; rot = i ? -55 : 55; }
    else if (n > 2) { const a = rad(-60 + 120 * i / (n - 1)); x = Math.sin(a) * 1.6; z = -Math.cos(a) * 1.6 + 1.2; rot = deg(Math.atan2(-x, 1.6 - z)) * .7; }
    st[id] = { x: round2(x), z: round2(z), rot: Math.round(rot), expr: 'neutral', pose: 'pie' };
  }
  // objetos sugeridos por el desglose de la escena
  if (s && typeof D !== 'undefined' && D && D.sem && D.sem[s.idx]) {
    const names = [...D.sem[s.idx]].map(id => P.elements[id]).filter(Boolean).map(e => deaccent(e.name.toLowerCase()));
    const want = [];
    // vehículos y animales con nombre propio en el desglose (el taxi como taxi, el perro como perro)
    const SPEC = [[/mototaxi/, 'moto'], [/\btaxi/, 'taxi'], [/patrull/, 'patrullero'], [/limosina|limusina/, 'limosina'], [/pick-?\s?up/, 'pickup'], [/^(?!.*pick-?\s?up).*(camioneta|\bsuv\b|4x4)/, 'suv'], [/\b(van|combi|minivan)\b/, 'van'], [/\b(bus|autobus|omnibus|micro|custer)\b/, 'bus'], [/bicicleta|\bbici\b/, 'bici'], [/triciclo/, 'triciclo'], [/avioneta/, 'avioneta'], [/avion de combate|caza\b/, 'caza'], [/\bavion\b/, 'avion'], [/deportivo/, 'deportivo'], [/auto|carro|coche/, 'auto'],
      [/\bperr[oa]/, 'perro'], [/\bgat[oa]\b/, 'gato'], [/caball|yegua/, 'caballo'], [/\btoro\b/, 'toro'], [/\bvaca\b/, 'vaca'], [/\bburr[oa]|\basno\b/, 'burro'], [/\bllama\b|alpaca/, 'llama'], [/\boveja/, 'oveja'], [/\bcerdo|chancho/, 'cerdo'], [/gallin|gallo\b/, 'gallina'], [/dragon/, 'dragon'], [/dinosaurio|t-?rex/, 'dinosaurio']];
    // (dentro del interior de vehículo no se pone otro vehículo)
    for (const [re, k] of SPEC) if (S3_PROPS[k] && names.some(x => re.test(x)) && !want.includes(k)) { if (k === 'auto' && want.some(w => VEH_LIKE.test(w))) continue; if (set === 'auto' && S3_PROPS[k].cat === 'vehiculo') continue; want.push(k); }
    if (names.some(x => /mostrador|vitrina/.test(x))) want.push('mostrador');
    if (names.some(x => /mesa|escritorio/.test(x))) want.push('mesa');
    if (names.some(x => /sofa|sillon/.test(x))) want.push('sofa');
    if (names.some(x => /cama/.test(x))) want.push('cama');
    if ((sh.size === 'PD' || sh.size === 'INS') && !ids.length) { objs.push(detailOf(sh, 'd0')); st.d0 = { x: 0, z: 0, rot: 0 }; }
    // en una cocina, sala o dormitorio, lo que ya trae el ambiente no se repite
    if (set === 'int' && ENV.room && typeof roomLayout === 'function') { const have = new Set(roomLayout(ENV.room, { w: 6, d: 5 }).map(r => r[0])); for (let i = want.length - 1; i >= 0; i--) if (have.has(want[i])) want.splice(i, 1); }
    want.slice(0, 2).forEach((k, i) => {
      const id = 'o' + i;
      objs.push({ id, kind: k });
      const fp = S3_PROPS[k] || {}, far = fp.cat === 'vehiculo' || Math.max(fp.w || 0, fp.d || 0) > 1.6;
      const big = Math.max(fp.w || 0, fp.d || 0), dx = far ? Math.max(2.6, (fp.w || 1) / 2 + 1.8) : 1.6;
      st[id] = { x: i ? -dx : dx, z: far ? -Math.max(2.4, big * .3) : -1.2, rot: far ? 90 : 0 };
    });
  }
  const lp = s && typeof P !== 'undefined' && P.locPlans && P.locPlans[s.loc];
  // la locación con su escenario 3D importado (escenarios-3d.js) o con su plano de planta
  const ms = s && typeof set3dForLoc === 'function' ? set3dForLoc(s.loc) : null;
  const s3 = { v: 2, set: ms ? 'modelo' : lp && P.plans && P.plans[lp] ? 'plano' : set, set3d: ms || undefined, planId: !ms && lp && P.plans && P.plans[lp] ? lp : undefined, aim: objs.find(o => o.kind === 'actor') ? 'a0' : null, shake: 0, objs, keys: [{ t: 0, ease: 'suave', cam: { x: 0, z: 4, h: 1.6, yaw: 0, pitch: 0, roll: 0, lens: num(sh.lens) || 35 }, o: st }] };
  if (ENV.atm && ENV.atm !== 'dia') s3.atm = ENV.atm;
  if (ENV.rain) s3.rain = true;
  // el sensor de la cámara del proyecto (Ajustes del storyboard); full frame no se anota
  if (P && P.meta && P.meta.sensor && P.meta.sensor !== 'ff' && SENSORS.some(x => x[0] === P.meta.sensor)) s3.sensor = P.meta.sensor;
  if (set === 'auto' && !ms && typeof envSeatCar === 'function') { if (ENV.car && ENV.car !== 'sedan') s3.car = { m: ENV.car }; envSeatCar(s3); }
  if (s3.set === 'int' && ENV.room && typeof roomFurnish === 'function') roomFurnish(s3, ENV.room);
  s3Frame(s3, sh.size, sh.angle, num(sh.lens) || 0);
  if (set === 'auto' && !ms && typeof envCarCam === 'function') envCarCam(s3);
  s3ApplyMove(s3, sh.move, shotDur(sh), sh.desc);
  if ((s3.set === 'plano' || s3.set === 'calle') && typeof s3CamInside === 'function') s3CamInside(s3);
  for (const x of scEls(sh.sc)) scElPut(s3, x.ob, x.pos);   // las luces, objetos y animales de la escena
  return s3;
}

/* el objeto de un plano detalle o un inserto: lo que el desglose marca en su texto (utilería, decorado, efectos, armas) */
function detailOf(sh, id) {
  let pn = 'Detalle';
  if (sh.p0 != null) {
    // con varios en el mismo texto, el que nombra la descripción del plano («Detalle: celular»)
    const ts = P.tags.filter(t => t.p >= sh.p0 && t.p <= sh.p1 && P.elements[t.el] && ['props', 'setdress', 'vfx', 'weapons'].includes(P.elements[t.el].cat));
    const dsc = deaccent(String(sh.desc || '').toLowerCase()), t = ts.find(t => dsc.includes(deaccent(P.elements[t.el].name.toLowerCase()))) || ts[0];
    if (t) pn = P.elements[t.el].name;
  }
  const d0 = { id, kind: 'detalle', name: pn };
  // una lámpara del guion se ve como lámpara (quemada si el plano o su texto lo dicen)
  if (detailModel(d0) === 'lampara') {
    let txt = deaccent(((sh.desc || '') + ' ' + (sh.p0 != null ? P.paras.slice(sh.p0, (sh.p1 ?? sh.p0) + 1).map(p => p.x).join(' ') : '')).toLowerCase());
    d0.model = /quemad|fundid|negra|rota/.test(txt) ? 'lampara_q' : 'lampara';
  }
  return d0;
}

/* ---------- el máster de la escena (lote U) ----------
   Los planos de una escena toman la puesta en escena de su máster: dónde está cada personaje (posición, giro y
   postura), el escenario con sus muebles, objetos y luces, la hora del día y la lluvia. Cada plano pone solo su
   cámara, que encuadra a su personaje según el tamaño del plano, del mismo lado de la línea de acción que la del
   máster (regla de los 180°); en un diálogo, por encima del hombro del otro (plano y contraplano). Un personaje del
   plano que no está en el máster se para junto al grupo; un inserto, dentro del mismo escenario.
   Un plano sin puesta en escena propia (sin sh.s3) sigue al máster: se arma de nuevo desde él cada vez, así que si
   alguien se mueve en el máster los demás se acomodan. Al ajustarlo a mano guarda lo suyo y deja de seguirlo.
   El máster es el que se eligió («Usar como máster») o el que sugirió FilmSpirit (sh.master = true); si ninguno lo
   dice, el primero cuya descripción dice «máster». sh.master = false: no lo es aunque su descripción lo diga. */
const saysMaster = sh => /\bmaster\b/.test(deaccent(String((sh && sh.desc) || '').toLowerCase()));
let MASTER_C = { rev: -1, d: null, by: new Map() };
function shotMaster(scKey) {
  if (typeof D === 'undefined' || !D || !D.shotsBy) return null;
  if (MASTER_C.rev !== S3REV || MASTER_C.d !== D) MASTER_C = { rev: S3REV, d: D, by: new Map() };
  if (MASTER_C.by.has(scKey)) return MASTER_C.by.get(scKey);
  const list = (D.shotsBy[scKey] || []).filter(Boolean);
  const m = list.find(sh => sh.master === true) || list.find(sh => sh.master !== false && saysMaster(sh)) || null;
  MASTER_C.by.set(scKey, m);
  return m;
}
const isMaster = sh => !!sh && (m => !!m && m.id === sh.id)(shotMaster(sh.sc));
/* el máster que sigue un plano (null si es el máster, si la escena no tiene o si el plano tiene puesta propia) */
const masterOf = sh => { if (!sh || sh.s3) return null; const m = shotMaster(sh.sc); return m && m.id !== sh.id ? m : null; };
/* elegir (o dejar de usar) el máster: uno por escena, marcar otro desmarca el anterior */
function setMaster(sh, on = true) {
  for (const o of (typeof D !== 'undefined' && D.shotsBy[sh.sc]) || []) {
    if (!o) continue;
    if (o.id === sh.id) o.master = !!on;
    else if (on && (o.master === true || (o.master !== false && saysMaster(o)))) o.master = false;
  }
  S3REV++;
}
/* los personajes que hablan en la escena (elementos del desglose con diálogo): con ellos se arma el plano y contraplano */
function sceneSpeakers(scKey) {
  const out = new Set(), s = typeof sceneOfKey === 'function' && typeof D !== 'undefined' && D && D.sc ? sceneOfKey(scKey) : null;
  if (!s || typeof P === 'undefined' || !P || !Array.isArray(P.paras)) return out;
  const byName = new Map(Object.values(P.elements || {}).filter(e => e && e.cat === 'cast').map(e => [e.name, e.id]));
  for (let i = s.p0 + 1; i < s.p1 && i < P.paras.length; i++) { const p = P.paras[i]; if (p && p.t === 'c') { const id = byName.get(typeof normCue === 'function' ? normCue(p.x) : String(p.x || '').trim().toUpperCase()); if (id) out.add(id); } }
  return out;
}
/* el lado del máster: de la línea que pasa por p con dirección w (unitaria), la normal que apunta a la cámara c */
function sideOf(p, w, c) {
  const n = { x: -w.z, z: w.x };
  return (c.x - p.x) * n.x + (c.z - p.z) * n.z < 0 ? { x: -n.x, z: -n.z } : n;
}
const unit2 = (x, z) => { const l = Math.hypot(x, z); return l > 1e-6 ? { x: x / l, z: z / l } : null; };
const angOf = v => Math.atan2(v.x, v.z);   // como el giro de una figura: 0 mira hacia +z
/* encuadra la clave 0 de s3 para el plano sh dentro de la puesta del máster (mcam: la cámara del máster, que decide de
   qué lado de la línea de acción va la cámara). Devuelve s3 */
function s3FrameFollow(s3, sh, mcam) {
  const k = s3.keys[0], size = sh.size || 'PM', lens = num(sh.lens) || 0, ins = size === 'PD' || size === 'INS';
  const wide = ['GPG', 'PG', 'PC', 'PE'].includes(size);
  let ang = sh.angle || 'Normal';
  const acts = s3.objs.filter(o => o.kind === 'actor' && k.o[o.id]);
  const P0 = id => k.o[id];
  // a quién encuadra: sus personajes (en el orden del plano); un inserto, su objeto
  const mine = (sh.chars || []).map(id => acts.find(o => o.el === id)).filter(Boolean);
  const det = ins && !mine.length ? s3.objs.find(o => o.kind === 'detalle' && k.o[o.id]) : null;
  const frameWith = (objs, dir, a = ang, ln = lens) => {
    const red = { ...s3, objs, keys: [{ ...k, o: Object.fromEntries(objs.map(o => [o.id, k.o[o.id]])) }] };
    s3Frame(red, size, a, ln, dir);   // cambia k.cam (es el mismo objeto)
    s3.aim = null; if (red.aimF != null) s3.aimF = red.aimF; else delete s3.aimF;
  };
  const toCam = p => unit2(mcam.x - p.x, mcam.z - p.z) || { x: 0, z: 1 };
  if (det) { frameWith([det], angOf(toCam(P0(det.id)))); return s3; }
  const group = mine.length ? mine : acts;
  if (!group.length) { frameWith([], 0); return s3; }
  if (wide || ang === 'Cenital') {
    // general: desde el lado del máster, hacia el centro de los suyos
    const c = { x: group.reduce((a, o) => a + P0(o.id).x, 0) / group.length, z: group.reduce((a, o) => a + P0(o.id).z, 0) / group.length };
    frameWith(group, angOf(toCam(c)));
    return s3;
  }
  const A = group[0], pa = P0(A.id);
  // el otro del diálogo: otro personaje del plano o, si no, el más cercano de los que hablan en la escena (si nadie
  // más habla, el más cercano)
  const near = (a, b) => Math.hypot(P0(a.id).x - pa.x, P0(a.id).z - pa.z) - Math.hypot(P0(b.id).x - pa.x, P0(b.id).z - pa.z);
  let others = group.length > 1 ? group.slice(1) : acts.filter(o => o.id !== A.id);
  if (group.length < 2) { const sp = sceneSpeakers(sh.sc), talk = others.filter(o => o.el && sp.has(o.el)); if (talk.length) others = talk; }
  const B = others.sort(near)[0];
  // solo: a 3/4 de su cara, del lado del máster
  const single = () => { const f = { x: Math.sin(rad(pa.rot || 0)), z: Math.cos(rad(pa.rot || 0)) }, m = sideOf(pa, f, mcam); frameWith([A], angOf(unit2(f.x + m.x * .6, f.z + m.z * .6) || f)); return s3; };
  if (!B) return single();
  if (ang === 'Subjetivo (POV)') { frameWith([A, B], 0); return s3; }
  // diálogo: por encima del hombro de B, del lado del máster (el contraplano de B queda del mismo lado). Primero a qué
  // distancia da el tamaño del plano con su lente; la cámara va al menos 1,6 m detrás de B (con el lente más cerrado si
  // hace falta, para el mismo tamaño) y se gira hacia el lado del máster hasta que la cabeza de B queda a un costado del
  // cuadro (a 0,85 del medio cuadro): su nuca y su hombro entran por el borde sin tapar a A
  if (ang === 'Sobre el hombro') ang = 'Normal';
  const pb = P0(B.id), L = Math.hypot(pb.x - pa.x, pb.z - pa.z), w = unit2(pb.x - pa.x, pb.z - pa.z) || { x: 0, z: 1 }, n = sideOf(pa, w, mcam);
  frameWith([A], angOf(w));
  let d = Math.hypot(k.cam.x - pa.x, k.cam.z - pa.z), ln = k.cam.lens;
  const maxL = Math.round(135 * sensorW(s3) / 36);
  if (d < L + 1.6 && !lens && ang !== 'Nadir') { const l2 = Math.min(maxL, Math.round(ln * (L + 1.6) / Math.max(.2, d))); d *= l2 / ln; ln = l2; }
  if (d < L + .6) return single();   // el otro queda casi pegado a la cámara (o detrás): un plano solo, del lado del máster
  const hf = Math.atan(18 / (ln * 36 / sensorW(s3)));
  // el ángulo φ (desde la línea A→B hacia el lado del máster) en que la cabeza de B queda a 0,85 del medio cuadro
  const off = f => Math.atan2(L * Math.sin(f), d - L * Math.cos(f)) - .85 * hf;
  let lo = 0, hi = 1.2;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (off(mid) < 0) lo = mid; else hi = mid; }
  const f = (lo + hi) / 2, dir = { x: w.x * Math.cos(f) + n.x * Math.sin(f), z: w.z * Math.cos(f) + n.z * Math.sin(f) };
  frameWith([A], angOf(dir), ang, ln);
  return s3;
}
/* la escena 3D de un plano que sigue al máster ms: la puesta del máster en su instante 0 (quieta: la acción del
   máster no se copia), los personajes del plano que faltan junto al grupo, el objeto del inserto y su propia cámara */
function s3Follow(sh, ms) {
  const s3 = JSON.parse(JSON.stringify(ms));
  // lo que es de la cámara del máster (a quién sigue, su temblor, su cámara B, su foco, sus medidas) no viene
  for (const f of ['aim', 'aimF', 'aimTilt', 'shake', 'camB', 'meas', 'from', 'dof', 'focus']) delete s3[f];
  const st0 = s3At(ms, 0, true), o = {};
  for (const ob of s3.objs) { const p = st0.o[ob.id]; if (!p) continue; const q = { ...p }; delete q.walk; delete q.walkN; if (q.j) q.j = { ...q.j }; o[ob.id] = q; }
  const mcam = { ...camKeys(ms)[0].cam };
  s3.keys = [{ t: 0, ease: 'suave', cam: { ...mcam }, o }];
  // los personajes del plano que no están en el máster: junto al grupo, del lado derecho de la cámara del máster
  const acts = s3.objs.filter(x => x.kind === 'actor'), pts = acts.map(a => o[a.id]).filter(Boolean);
  const miss = (sh.chars || []).filter(id => typeof P !== 'undefined' && P.elements[id] && !acts.some(a => a.el === id));
  const freeId = pre => { let i = 0; while (s3.objs.some(x => x.id === pre + i)) i++; return pre + i; };
  if (miss.length) {
    const c = pts.length ? { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, z: pts.reduce((a, p) => a + p.z, 0) / pts.length } : { x: 0, z: 0 };
    const r = { x: Math.cos(rad(mcam.yaw || 0)), z: -Math.sin(rad(mcam.yaw || 0)) };   // la derecha de la cámara del máster
    let edge = pts.length ? Math.max(...pts.map(p => (p.x - c.x) * r.x + (p.z - c.z) * r.z)) : -.8;
    miss.forEach((id, i) => {
      const el = P.elements[id], nid = freeId('a');
      s3.objs.push({ id: nid, kind: 'actor', el: id, name: el.name, color: S3_COLORS[(acts.length + i) % S3_COLORS.length] });
      edge += .8;
      const x = c.x + r.x * edge, z = c.z + r.z * edge;
      o[nid] = { x: round2(x), z: round2(z), rot: pts.length ? Math.round(deg(Math.atan2(c.x - x, c.z - z))) : 0, expr: 'neutral', pose: 'pie' };
    });
    if (s3.set === 'auto' && !s3.set3d && typeof envSeatCar === 'function') envSeatCar(s3);
  }
  // el inserto: su objeto dentro del escenario, entre el grupo y la cámara del máster y un poco a un lado
  if ((sh.size === 'PD' || sh.size === 'INS') && !(sh.chars || []).some(id => s3.objs.some(x => x.kind === 'actor' && x.el === id))) {
    const nid = freeId('d'), d0 = detailOf(sh, nid);
    const all = s3.objs.filter(x => x.kind === 'actor').map(a => o[a.id]).filter(Boolean);
    const c = all.length ? { x: all.reduce((a, p) => a + p.x, 0) / all.length, z: all.reduce((a, p) => a + p.z, 0) / all.length } : { x: 0, z: 0 };
    const u = unit2(mcam.x - c.x, mcam.z - c.z) || { x: 0, z: 1 }, sd = { x: -u.z, z: u.x };
    // el primer lugar libre (a más de 0,8 m de cada figura y sin nadie justo detrás, visto desde la cámara del máster),
    // cada vez un poco más lejos o más al costado
    const free = q => all.every(p => { const dx = p.x - q.x, dz = p.z - q.z, along = -(dx * u.x + dz * u.z), side = Math.abs(dx * sd.x + dz * sd.z); return Math.hypot(dx, dz) >= .8 && !(along > 0 && side < .7); });
    // (primero a los costados del grupo, donde detrás no queda nadie; después entre el grupo y la cámara)
    const ext = all.length ? Math.max(...all.map(p => Math.abs((p.x - c.x) * sd.x + (p.z - c.z) * sd.z))) : 0;
    let at = null;
    for (const r of [.6, 1, 1.5, 2.2]) { for (const sx of [ext + .9, -(ext + .9), .55, -.55, 1.1, -1.1, 0]) { const q = { x: c.x + u.x * r + sd.x * sx, z: c.z + u.z * r + sd.z * sx }; if (free(q)) { at = q; break; } } if (at) break; }
    if (!at) for (const r of [.9, 1.3, 1.8]) { for (const sx of [.55, -.55, 1.1, -1.1]) { const q = { x: c.x + u.x * r + sd.x * sx, z: c.z + u.z * r + sd.z * sx }; if (all.every(p => Math.hypot(p.x - q.x, p.z - q.z) >= .8)) { at = q; break; } } if (at) break; }
    at = at || { x: c.x + u.x * .9 + sd.x * .55, z: c.z + u.z * .9 + sd.z * .55 };
    s3.objs.push(d0);
    o[nid] = { x: round2(at.x), z: round2(at.z), rot: Math.round(deg(angOf(u))) };
  }
  // los del plano, primero: a ellos apuntan el encuadre y los movimientos de cámara (seguimiento, arco…)
  const mine = (sh.chars || []).map(id => s3.objs.find(x => x.kind === 'actor' && x.el === id)).filter(Boolean);
  if (mine.length) s3.objs = [...mine, ...s3.objs.filter(x => !mine.includes(x))];
  s3.keys[0].cam.lens = num(sh.lens) || 35;
  s3FrameFollow(s3, sh, mcam);
  // en un auto, la cámara del parabrisas (como en la escena armada sola)
  if (s3.set === 'auto' && !s3.set3d && typeof envCarCam === 'function') envCarCam(s3);
  s3ApplyMove(s3, sh.move, shotDur(sh), sh.desc);
  if ((s3.set === 'plano' || s3.set === 'calle') && typeof s3CamInside === 'function') s3CamInside(s3);
  for (const x of scEls(sh.sc)) scElPut(s3, x.ob, x.pos);   // las luces, objetos y animales de la escena
  return s3;
}

/* ---------- encuadre por tamaño y ángulo (modifica la clave 0) ---------- */
/* cómo se ve el objeto de detalle: lo elegido a mano o lo que dice su nombre (por defecto, un florero) */
const DETAIL_MODELS = [['flores', 'Florero con flores'], ['lampara', 'Lámpara de proyector'], ['lampara_q', 'Lámpara quemada']];
function detailModel(ob) {
  if (ob && ob.model && DETAIL_MODELS.some(([k]) => k === ob.model)) return ob.model;
  const n = deaccent(String((ob && ob.name) || '').toLowerCase());
  return /lampara|foco|bombilla|bulbo|ampolleta/.test(n) ? (/quemad|fundid/.test(n) ? 'lampara_q' : 'lampara') : 'flores';
}
/* qué se encuadra del objeto de detalle: centro y alto del cuadro en un plano detalle o un inserto */
const detailFrame = m => m === 'flores' ? { cy: 1.25, PD: .4, INS: .3 } : { cy: .94, PD: .36, INS: .27 };
function s3Target(s3, key) {
  const k = key || s3.keys[0];
  const actors = s3.objs.filter(o => o.kind === 'actor');
  const aimO = actors.find(o => o.id === s3.aim) || actors[0];
  if (!aimO) {
    const dObj = s3.objs.find(o => o.kind === 'detalle') || s3.objs[0];
    const p = dObj && k.o[dObj.id];
    return { x: p ? p.x : 0, z: p ? p.z : 0, y: .8, lift: liftOf(s3, p), face: 0, group: false };
  }
  const a = k.o[aimO.id];
  // y: ojos sobre sus pies; lift: dónde están sus pies (vereda, tarima…)
  return { x: a.x, z: a.z, y: eyeOf(s3, aimO.id, a.pose), lift: liftOf(s3, a), face: a.rot, id: aimO.id, pose: a.pose, bs: lookOf(aimO).s };
}
/* dir (opcional, radianes): desde dónde se mira, medido como el giro de una figura (0 = desde +z). Lo usan los planos
   que siguen al máster para quedar del mismo lado de la línea de acción (s3FrameFollow) */
function s3Frame(s3, size, angle, lens, dir) {
  const k = s3.keys[0];
  const cam = k.cam;
  const fr = SIZE_FRAME[size] || SIZE_FRAME.PM;
  // sin lente elegido: el de siempre para ese tamaño de plano, llevado al sensor (mismo ángulo de visión)
  cam.lens = lens || Math.max(8, Math.round(fr[2] * sensorW(s3) / 36));
  const actors = s3.objs.filter(o => o.kind === 'actor').map(o => k.o[o.id]);
  const tg = s3Target(s3, k);
  let cx = tg.x, cz = tg.z, dirA = rad(tg.face || 0);
  const wide = ['GPG', 'PG', 'PC', 'PE'].includes(size);
  if (wide && actors.length > 1) {
    cx = actors.reduce((a, b) => a + b.x, 0) / actors.length;
    cz = actors.reduce((a, b) => a + b.z, 0) / actors.length;
    dirA = 0;
  } else if (actors.length === 2 && !wide) {
    // en diálogo, la cámara se coloca a 3/4 del personaje que se encuadra
    dirA = rad((tg.face || 0) * .55);
  }
  if (dir != null && isFinite(dir)) dirA = dir;
  const ratio = (tg.pose === 'sentado' ? .72 : poseDef(tg.pose).h) * (tg.bs || 1);
  let centerY = fr[1] * (size === 'GPG' ? 1 : ratio);
  // el detalle: se encuadra lo que importa (las flores, no el cuerpo del florero; la lámpara entera)
  const dOb = (size === 'PD' || size === 'INS') && s3.objs.find(o => o.kind === 'detalle'), DF = dOb && detailFrame(detailModel(dOb));
  if (size === 'PD' || size === 'INS') centerY = DF ? DF.cy : .8;
  const vf = vfovFor(cam.lens * 36 / sensorW(s3), aspectOf());
  let d = ((DF ? DF[size] : fr[0]) * (wide ? 1 : ratio > .5 ? 1 : .8) / 2) / Math.tan(vf / 2);
  d = Math.max(d, .35);
  // las alturas se miden desde donde pisa lo encuadrado (g); los ángulos bajos, desde donde pisa la cámara
  const g = tg.lift || 0;
  let h = size === 'GPG' ? 6 : clamp(centerY, .4, 1.75), pitch;
  const ang = angle || 'Normal';
  if (ang === 'Picado') h = centerY + d * Math.tan(rad(28));
  if (ang === 'Nadir') d = Math.max(d * .6, .5);
  if (ang === 'Cenital') { h = centerY + d; d = .02; }
  cam.x = round2(cx + Math.sin(dirA) * d);
  cam.z = round2(cz + Math.cos(dirA) * d);
  const gc = groundAt(s3, cam.x, cam.z);
  if (ang === 'Contrapicado') h = Math.max(gc + .25, g + centerY - d * Math.tan(rad(24))) - g;
  if (ang === 'Nadir') h = gc + .12 - g;
  cam.h = round2(Math.max(h + g, gc + CAM_FLOOR));
  cam.roll = ang === 'Holandés' ? 14 : 0;
  if (ang === 'Subjetivo (POV)' || ang === 'Sobre el hombro') {
    const other = s3.objs.filter(o => o.kind === 'actor' && o.id !== tg.id)[0];
    if (other) {
      const o = k.o[other.id], go = liftOf(s3, o);
      const vx = tg.x - o.x, vz = tg.z - o.z, L = Math.hypot(vx, vz) || 1;
      if (ang === 'Subjetivo (POV)') { cam.x = round2(o.x + vx / L * .15); cam.z = round2(o.z + vz / L * .15); cam.h = round2(eyeH(o.pose) + go); }
      else { const px = -vz / L, pz = vx / L; cam.x = round2(o.x - vx / L * .55 + px * .35); cam.z = round2(o.z - vz / L * .55 + pz * .35); cam.h = round2(eyeH(o.pose) + .08 + go); }
    }
  }
  s3.aim = null;
  if (tg.id) s3.aimF = round2(centerY / (eyeOf(s3, tg.id, tg.pose) || 1.62));
  const dx = cx - cam.x, dz = cz - cam.z;
  cam.yaw = Math.round(deg(Math.atan2(-dx, -dz)) * 10) / 10;
  if (ang === 'Cenital') { cam.pitch = -89; cam.yaw = 0; }
  else { pitch = deg(Math.atan2(g + centerY - cam.h, Math.hypot(dx, dz))); cam.pitch = Math.round(pitch * 10) / 10; }
  return s3;
}

/* ---------- movimientos de cámara: generan claves ---------- */
/* hacia dónde va un tilt: abajo si la descripción del plano lo dice («bajamos hasta la escalera»), si no, arriba */
const tiltDown = desc => /\b(baj|desciend|descend|hacia abajo)/.test(deaccent(String(desc || '').toLowerCase()));
function s3ApplyMove(s3, move, dur, desc) {
  const k0 = s3.keys[0];
  s3.keys = [k0];
  s3.shake = 0;
  const m = (move || 'Fijo').toLowerCase();
  if (m === 'fijo' || !m) return s3;
  const T = Math.max(1, dur || 4);
  const end = JSON.parse(JSON.stringify(k0));
  end.t = T;
  const c = end.cam;
  const fx = -Math.sin(rad(c.yaw)), fz = -Math.cos(rad(c.yaw)); // dirección de mirada
  const rx = Math.cos(rad(c.yaw)), rz = -Math.sin(rad(c.yaw));   // derecha de cámara
  const tg = s3Target(s3, k0);
  const dist = Math.hypot(tg.x - c.x, tg.z - c.z);
  const moveCam = (dx, dz) => { c.x = round2(c.x + dx); c.z = round2(c.z + dz); };
  if (m.startsWith('dolly in')) moveCam(fx * dist * .45, fz * dist * .45);
  else if (m.startsWith('dolly out')) moveCam(-fx * Math.max(1, dist * .7), -fz * Math.max(1, dist * .7));
  else if (m.startsWith('zoom in')) c.lens = Math.round(c.lens * 1.9);
  else if (m.startsWith('zoom out')) c.lens = Math.max(12, Math.round(c.lens / 1.9));
  else if (m.startsWith('paneo')) { c.yaw = Math.round(c.yaw - 40); s3.aim = null; }
  else if (m.startsWith('tilt')) { const s = tiltDown(desc) ? -1 : 1; k0.cam.pitch = Math.round(k0.cam.pitch - 15 * s); c.pitch = Math.round(c.pitch + 15 * s); s3.aim = null; }
  else if (m.startsWith('travelling')) { s3.aim = null; moveCam(rx * 2.2, rz * 2.2); }
  else if (m.startsWith('seguimiento') || m.startsWith('plano secuencia')) {
    const a = s3.objs.find(o => o.kind === 'actor');
    if (a) s3.aim = a.id;
    const L = m.startsWith('plano') ? 6 : 3;
    if (a) { const p = end.o[a.id]; p.x = round2(p.x + rx * L); p.z = round2(p.z + rz * L); p.rot = Math.round(deg(Math.atan2(rx, rz))); k0.o[a.id].rot = p.rot; }
    moveCam(rx * L, rz * L);
  } else if (m.startsWith('cámara en mano')) { s3.shake = 1; return s3; }
  else if (m.startsWith('steadicam') || m.startsWith('gimbal')) { const a0 = s3.objs.find(o => o.kind === 'actor'); if (a0) s3.aim = a0.id; moveCam(fx * Math.min(2, dist * .5), fz * Math.min(2, dist * .5)); s3.shake = .25; }
  else if (m.startsWith('grúa')) { c.h = round2(c.h + 3); }
  else if (m.startsWith('drone')) { k0.cam.h = Math.max(k0.cam.h, 3); c.h = 14; moveCam(-fx * 8, -fz * 8); }
  else if (m.startsWith('barrido')) { c.yaw = Math.round(c.yaw - 90); s3.aim = null; end.t = Math.min(T, 1); }
  else if (m.startsWith('arco')) {
    const a0 = s3.objs.find(o => o.kind === 'actor'); if (a0) s3.aim = a0.id;
    const steps = 4;
    for (let i = 1; i <= steps; i++) {
      const k = JSON.parse(JSON.stringify(k0));
      const a = rad(70 * i / steps);
      const ox = k0.cam.x - tg.x, oz = k0.cam.z - tg.z;
      k.t = round2(T * i / steps); k.ease = 'lineal';
      k.cam.x = round2(tg.x + ox * Math.cos(a) + oz * Math.sin(a));
      k.cam.z = round2(tg.z - ox * Math.sin(a) + oz * Math.cos(a));
      s3.keys.push(k);
    }
    k0.ease = 'lineal';
    return s3;
  } else return s3;
  s3.keys.push(end);
  return s3;
}

/* ---------- estado interpolado en el tiempo t ---------- */
/* pistas: una clave puede ser solo de cámara (co) o solo de figuras y objetos (oo); las demás llevan ambas.
   Así un plano copia la acción de otro sin su cámara y la acción se desplaza en el tiempo sin moverla. */
const camKeys = s3 => s3.keys.some(k => k.oo) ? s3.keys.filter(k => !k.oo) : s3.keys;
const objKeys = s3 => s3.keys.some(k => k.co) ? s3.keys.filter(k => !k.co) : s3.keys;
/* ---------- la marcha (al desplazarse entre claves) ----------
   Medidas en largos de pierna. S: largo de un paso; ps: parte del ciclo en que cada pie apoya (caminando los dos
   pies se apoyan a la vez un momento; corriendo hay un vuelo sin ninguno); xa: dónde cae el pie, delante de la
   cadera; rodilla: un poco al apoyar (kSt, en kc) y mucho al pasar la pierna (kSw, en pSw); talón (heel) que se
   levanta antes de despegar; brazos opuestos a las piernas (arm: centro y vaivén, en grados; elb: codo); tronco
   inclinado (lean), cadera que gira (yaw), cae del lado de la pierna que pasa (roll) y se corre hacia el pie de
   apoyo (sway); lift: el vuelo al correr. Caminar es walk 1 y correr, walk 1.7; en medio se mezclan. */
const GAIT_W = { S: .70, ps: .60, xa: .38, kb: 3, kSt: 13, kc: .13, kw: .08, kSw: 57, pSw: .71, sw: .14, over: 4, pk: .85, es: 0, heel: 14, toeUp: 10, lean: 3, yaw: 6, roll: 3, sway: .012, arm: [-2, 25], ac: .92, elb: [10, 20], abd: 0, lift: 0 };
const GAIT_R = { S: 1.25, ps: .32, xa: .28, kb: 12, kSt: 30, kc: .15, kw: .10, kSw: 100, pSw: .72, sw: .16, over: 16, pk: .75, es: .5, heel: 26, toeUp: 0, lean: 2, yaw: 8, roll: 2, sway: .008, arm: [-4, 34], ac: .88, elb: [84, 12], abd: 8, lift: .055 };
const GAIT_C = new Map();
function gaitOf(k) {
  const f = clamp((k - 1) / .7, 0, 1), key = Math.round(f * 100);
  if (GAIT_C.has(key)) return GAIT_C.get(key);
  const o = {};
  for (const n in GAIT_W) o[n] = Array.isArray(GAIT_W[n]) ? GAIT_W[n].map((v, i) => lerp(v, GAIT_R[n][i], f)) : lerp(GAIT_W[n], GAIT_R[n], f);
  GAIT_C.set(key, o);
  return o;
}
function keySeg(list, t) {
  let i = 0;
  while (i < list.length - 1 && list[i + 1].t <= t) i++;
  const a = list[i], b = list[i + 1];
  let u = 0;
  if (b && t > a.t) u = clamp((t - a.t) / Math.max(.001, b.t - a.t), 0, 1);
  return { a, b, u, e: b ? (a.ease === 'lineal' ? u : smooth(u)) : 0 };
}
/* estado en el tiempo t. raw: sin pasos, sin seguir a la figura y sin temblor (para guardar en claves) */
function s3At(s3, t, raw) {
  const ks = s3.keys, C = keySeg(camKeys(s3), t), O = keySeg(objKeys(s3), t);
  const cam = {};
  { const { a, b, e } = C; for (const f of ['x', 'z', 'h', 'pitch', 'roll', 'lens']) cam[f] = b ? lerp(a.cam[f], b.cam[f], e) : a.cam[f]; cam.yaw = b ? lerpAng(a.cam.yaw, b.cam.yaw, e) : a.cam.yaw; }
  cam.sw = sensorW(s3);   // ancho del sensor del plano (mm)
  const o = {}, { a, b, u, e } = O;
  for (const ob of s3.objs) {
    const pa = a.o[ob.id] || findPose(s3, ob.id), pb = b ? (b.o[ob.id] || pa) : null;
    if (!pa) continue;
    const st = { ...pa };
    if (pa.j) st.j = { ...pa.j };
    if (pb) {
      for (const f in pa) {
        if (f === 'rot') st.rot = lerpAng(pa.rot, pb.rot ?? pa.rot, e);
        else if (typeof pa[f] === 'number' && typeof pb[f] === 'number') st[f] = lerp(pa[f], pb[f], e);
      }
      if (pa.j || pb.j) { const ja = pa.j || {}, jb = pb.j || {}; st.j = {}; for (const f of new Set([...Object.keys(ja), ...Object.keys(jb)])) st.j[f] = lerp(ja[f] || 0, jb[f] || 0, e); }
      const dist = Math.hypot(pb.x - pa.x, pb.z - pa.z);
      if (!raw && dist > .05 && u > 0 && u < 1 && poseDef(pa.pose).walk) {
        // un paso (π de la fase) por cada largo de paso de esta figura: los pies no patinan
        const Sw = gaitOf(poseDef(pa.pose).walk).S * .95 * (ob.kind === 'actor' ? lookOf(ob).s || 1 : 1);
        st.walk = (dist * e) / Sw * Math.PI; st.walkN = dist / Sw * Math.PI;
        // si se desplaza sin girar, mira hacia donde camina
        if (Math.abs(((pb.rot - pa.rot + 540) % 360) - 180) < 1) st.rot = deg(Math.atan2(pb.x - pa.x, pb.z - pa.z));
      }
    }
    o[ob.id] = st;
  }
  if (!raw && s3.aim && o[s3.aim]) {
    const tg = o[s3.aim];
    const ty = eyeOf(s3, s3.aim, tg.pose) * (s3.aimF || 1) + liftOf(s3, tg);
    const dx = tg.x - cam.x, dz = tg.z - cam.z, hd = Math.hypot(dx, dz);
    if (hd > .05) { cam.yaw = deg(Math.atan2(-dx, -dz)); cam.pitch = deg(Math.atan2(ty - cam.h, hd)) + (s3.aimTilt || 0); }
  }
  if (!raw && s3.shake) {
    const n = (f, p) => Math.sin(t * f + p) * .6 + Math.sin(t * f * 2.3 + p * 1.7) * .4;
    cam.yaw += n(1.7, 1) * 1.1 * s3.shake; cam.pitch += n(2.1, 2) * .8 * s3.shake; cam.roll += n(1.3, 3) * .9 * s3.shake;
  }
  const i = Math.max(0, ks.indexOf(C.a)), on = ks.findIndex(k => Math.abs(k.t - t) < .02);
  return { cam, o, key: i, onKey: on };
}
/* ordena las claves, junta las que caen en el mismo instante y rellena la parte que no manda en cada una
   (la cámara de una clave de figuras, las figuras de una clave de cámara) con lo que dan las otras */
function s3Bake(s3) {
  const ks = s3.keys.sort((a, b) => a.t - b.t);
  for (let i = ks.length - 1; i > 0; i--) {
    const a = ks[i - 1], b = ks[i];
    if (Math.abs(a.t - b.t) >= .02) continue;
    const isCam = !a.oo || !b.oo, isObj = !a.co || !b.co;
    const m = { t: a.t, ease: a.ease || b.ease || 'suave', cam: !a.oo ? a.cam : b.cam, o: !a.co ? a.o : b.o };
    const cb = !a.oo ? a.camB : b.camB; if (cb) m.camB = cb;   // la cámara B va con la clave de cámara
    if (!isObj) m.co = true;
    if (!isCam) m.oo = true;
    ks.splice(i - 1, 2, m);
  }
  if (!ks.some(k => k.co || k.oo)) { s3FillB(s3); return s3; }
  for (const k of ks) {
    if (!k.co && !k.oo) continue;
    const st = s3At(s3, k.t, true);
    if (k.co) { k.o = {}; for (const id in st.o) { const p = { ...st.o[id] }; for (const f in p) if (typeof p[f] === 'number') p[f] = f === 'rot' ? Math.round(p[f]) : round2(p[f]); if (p.j) { p.j = { ...p.j }; for (const f in p.j) p.j[f] = Math.round(p.j[f] * 10) / 10; } k.o[id] = p; } }
    if (k.oo) { k.cam = {}; for (const f of ['x', 'z', 'h', 'yaw', 'pitch', 'roll', 'lens']) k.cam[f] = round2(st.cam[f]); delete k.camB; }
  }
  s3FillB(s3);
  return s3;
}
/* separa cada clave doble en una de cámara y otra de figuras, y corre las de figuras dt segundos */
function s3ShiftAction(s3, dt) {
  const out = [];
  for (const k of s3.keys) {
    if (k.co) { out.push(k); continue; }
    if (k.oo) { out.push({ ...k, t: round2(k.t + dt) }); continue; }
    out.push({ t: k.t, ease: k.ease, cam: k.cam, ...(k.camB ? { camB: k.camB } : {}), o: {}, co: true });
    out.push({ t: round2(k.t + dt), ease: k.ease, cam: { ...k.cam }, o: k.o, oo: true });
  }
  s3.keys = out;
  return s3Bake(s3);
}
/* trae a este plano la puesta en escena de otro (figuras, objetos, luces, escenario) con la animación de sus
   figuras y objetos; la cámara de este plano no cambia. off: segundo del otro plano en el que empieza este */
function s3CopyAction(dst, src, srcId, off = 0) {
  const out = JSON.parse(JSON.stringify(src));
  const camK = camKeys(dst).map(k => ({ t: k.t, ease: k.ease, cam: { ...k.cam }, ...(k.camB ? { camB: { ...k.camB } } : {}), o: {}, co: true }));
  const objK = objKeys(src).map(k => ({ t: round2(k.t - off), ease: k.ease, cam: { ...k.cam }, o: JSON.parse(JSON.stringify(k.o)), oo: true }));
  out.keys = [...camK, ...objK];
  // lo que es de la cámara se queda como estaba en este plano; a quién sigue se busca por personaje
  const aimEl = dst.aim && (dst.objs.find(o => o.id === dst.aim) || {}).el;
  out.aim = aimEl ? ((src.objs.find(o => o.el === aimEl) || {}).id || src.aim) : dst.aim && src.objs.some(o => o.id === dst.aim) ? dst.aim : src.aim;
  for (const f of ['aimF', 'aimTilt', 'shake']) { if (dst[f] != null) out[f] = dst[f]; else delete out[f]; }
  // la cámara B de este plano (si la tiene) también se queda; la del otro plano no viene
  if (dst.camB) out.camB = JSON.parse(JSON.stringify(dst.camB)); else delete out.camB;
  out.from = { id: srcId, off: round2(off) };
  return s3Bake(out);
}

/* ---------- clonar los atributos de un plano en otros (storyboard: Ctrl+clic y «Clonar sus atributos…») ----------
   El plano de origen puede ser de otra escena. Lo que se elige: tamaño, ángulo, movimiento, soporte, lente, sonido,
   duración, la cámara 3D y la puesta en escena 3D. La descripción, el tramo del guion, las notas, «Rodado», las
   imágenes subidas y los dibujos 2D de cada plano no cambian */
/* lo de la cámara que va arriba en la escena (no en las claves): a quién sigue, temblor, sensor y desenfoque */
const CLONE_CAM_F = ['aimF', 'aimTilt', 'shake', 'sensor', 'dof'];
/* la figura de la escena «out» que hace de la figura «id» de «src»: el mismo personaje; si no está, la figura en el
   mismo lugar de la lista (la segunda por la segunda); un objeto, si está con el mismo id y la misma clase */
function s3MapObj(id, src, out) {
  if (!id) return null;
  const o = src.objs.find(x => x.id === id); if (!o) return null;
  if (o.el) { const m = out.objs.find(x => x.el === o.el); if (m) return m.id; }
  if (o.kind === 'actor') {
    const A = src.objs.filter(x => x.kind === 'actor'), B = out.objs.filter(x => x.kind === 'actor');
    const m = B[Math.min(A.indexOf(o), B.length - 1)];
    return m ? m.id : null;
  }
  return out.objs.some(x => x.id === id && x.kind === o.kind) ? id : null;
}
/* la escena de dst (decorado, figuras, objetos, luces y su animación) vista con la cámara de src: posición, altura,
   giro, lente y recorrido, a quién sigue (por personaje), temblor, sensor, desenfoque y la cámara B */
function s3TakeCam(dst, src) {
  const out = JSON.parse(JSON.stringify(dst));
  const camK = camKeys(src).map(k => ({ t: k.t, ease: k.ease, cam: { ...k.cam }, ...(k.camB ? { camB: { ...k.camB } } : {}), o: {}, co: true }));
  const objK = objKeys(dst).map(k => ({ t: k.t, ease: k.ease, cam: { ...k.cam }, o: JSON.parse(JSON.stringify(k.o)), oo: true }));
  out.keys = [...camK, ...objK];
  out.aim = s3MapObj(src.aim, src, out);
  const fo = s3MapObj(src.focus, src, out); if (fo) out.focus = fo; else delete out.focus;
  for (const f of CLONE_CAM_F) { if (src[f] != null) out[f] = JSON.parse(JSON.stringify(src[f])); else delete out[f]; }
  if (s3HasB(src)) { out.camB = JSON.parse(JSON.stringify(src.camB)); if (out.camB.aim != null) out.camB.aim = s3MapObj(src.camB.aim, src, out); }
  else delete out.camB;
  return s3Bake(out);
}
/* la puesta en escena de src (decorado, figuras, objetos, luces y su animación) con la cámara de dst. Como «Copiar la
   escena del plano anterior», pero sin quedar ligada a src (en el animatic no pasa a ser un inserto encima de él) */
function s3TakeStage(dst, src) {
  const out = s3CopyAction(dst, src, null, 0);
  delete out.from;
  for (const f of ['sensor', 'dof']) { if (dst[f] != null) out[f] = JSON.parse(JSON.stringify(dst[f])); else delete out[f]; }
  const fo = s3MapObj(dst.focus, dst, out); if (fo) out.focus = fo; else delete out.focus;
  return out;
}
/* ¿su viñeta muestra la escena 3D? Desde el lote U un dibujo 2D la puede llevar como capa («Viñeta 3D»: shot3D, en
   s2d-editor.js); un dibujo sin ella no tiene 3D que clonar */
const shotHas3D = sh => !!sh && (typeof shot3D === 'function' ? shot3D(sh) : sh.ws !== '2d');
/* el lente que muestra la viñeta: el de la primera clave de cámara (en un dibujo sin 3D, el anotado) */
const shotLens = sh => shotHas3D(sh) ? Math.round(camKeys(s3Of(sh))[0].cam.lens || 0) : Math.round(num(sh.lens));
const CLONE_F = ['size', 'angle', 'move', 'support', 'lens', 'snd', 'dur', 'cam', 'stage'];
/* pasa a dst lo elegido de src (pick: { size, angle, move, support, lens, snd, dur, cam, stage }: true o false).
   Devuelve qué pasó de llamativo: { show3d } si dst es un dibujo 2D que ahora muestra la escena 3D debajo */
function shotCloneFrom(dst, src, pick) {
  const res = {};
  if (!dst || !src || dst === src) return res;
  const src3d = shotHas3D(src), take3d = src3d && !!(pick.cam || pick.stage);
  const lens0 = shotLens(dst), lensS = shotLens(src);
  // primero los datos del plano: en un plano automático (sin escena 3D propia) también lo reencuadran
  for (const f of ['size', 'angle', 'move', 'support']) if (pick[f]) dst[f] = src[f] != null ? src[f] : '';
  if (pick.snd) { if (src.snd) dst.snd = src.snd; else delete dst.snd; }
  if (pick.dur) dst.dur = String(shotDur(src));
  const lensOn = !!pick.lens && lensS > 0;
  if (lensOn) {
    dst.lens = String(lensS);
    // con escena 3D propia, el lente va en sus claves (como al cambiarlo en el guion técnico)
    if (dst.s3 && !take3d) { const r = lensS / (camKeys(dst.s3)[0].cam.lens || lensS); dst.s3.keys.forEach(k => { if (k.cam) k.cam.lens = Math.round(k.cam.lens * r * 10) / 10; }); }
  }
  if (take3d) {
    const a = s3Of(src), b = s3Of(dst);
    let out;
    if (pick.cam && pick.stage) { out = JSON.parse(JSON.stringify(a)); delete out.from; }
    else out = pick.cam ? s3TakeCam(b, a) : s3TakeStage(b, a);
    // el lente: el de src si se eligió; con la cámara de src pero sin su lente, el que tenía dst
    const L = lensOn ? lensS : pick.cam ? lens0 : 0, L0 = camKeys(out)[0].cam.lens;
    if (L > 0 && L0 > 0 && Math.abs(L - L0) > .05) { const r = L / L0; out.keys.forEach(k => { if (k.cam) k.cam.lens = Math.round(k.cam.lens * r * 10) / 10; }); }
    dst.s3 = out;
    s3SyncShot(dst);
    // un dibujo a mano: la escena 3D que llega se ve como su capa «Viñeta 3D», debajo del dibujo, y el plano se sigue
    // abriendo en el 2D. Un plano 2D sin dibujo pasa a abrirse en el 3D
    const d = dst.d2;
    if (d && Array.isArray(d.frames) && d.frames.length && Array.isArray(d.layers)) {
      if (typeof d2Norm === 'function') d2Norm(dst, d);
      if (d.base !== '3d') { d.base = '3d'; res.show3d = true; }
      d.rev = (d.rev || 0) + 1;
    } else if (dst.ws === '2d') dst.ws = '3d';
    // armó la escena 3D: se ve (como al guardar el editor)
    if (shotBlank(dst)) { if (typeof P !== 'undefined' && P && P.meta && P.meta.sbBlank) dst.blank = false; else delete dst.blank; }
    if (pick.stage) {
      if (src.noNames) dst.noNames = true; else delete dst.noNames;
      const els = [...new Set(out.objs.filter(o => o.kind === 'actor' && o.el).map(o => o.el))];
      if (els.length) dst.chars = els;
    }
    delete dst.auto;
  }
  return res;
}
function findPose(s3, id) { for (const k of s3.keys) if (k.o[id]) return k.o[id]; return null; }

/* ---------- edición con clave automática ---------- */
function s3KeyAt(s3, t, create = true) {
  const k = s3.keys.find(k => Math.abs(k.t - t) < .02);
  if (k || !create) return k || null;
  const st = s3At(s3, t);
  const nk = { t: round2(t), ease: 'suave', cam: {}, o: {} };
  for (const f of ['x', 'z', 'h', 'yaw', 'pitch', 'roll', 'lens']) nk.cam[f] = round2(st.cam[f]);
  for (const id in st.o) { const p = { ...st.o[id] }; delete p.walk; delete p.walkN; for (const f in p) if (typeof p[f] === 'number') p[f] = f === 'rot' ? Math.round(p[f]) : round2(p[f]); if (p.j) { p.j = { ...p.j }; for (const f in p.j) p.j[f] = Math.round(p.j[f]); } nk.o[id] = p; }
  s3.keys.push(nk);
  s3.keys.sort((a, b) => a.t - b.t);
  return nk;
}
function s3AddObj(s3, obj, pos) {
  s3.objs.push(obj);
  for (const k of s3.keys) k.o[obj.id] = { ...pos };
}
function s3DelObj(s3, id) {
  s3.objs = s3.objs.filter(o => o.id !== id);
  for (const k of s3.keys) delete k.o[id];
  if (s3.aim === id) s3.aim = (s3.objs.find(o => o.kind === 'actor') || {}).id || null;
}
/* recorridos de cámara rápidos: crean o ajustan la clave final */
function s3Track(s3, kind, m, dur) {
  if (s3.keys.length < 2) { const end = JSON.parse(JSON.stringify(s3.keys[0])); end.t = Math.max(1, dur || 4); s3.keys.push(end); }
  const end = s3.keys[s3.keys.length - 1], c = end.cam;
  if (kind !== 'ped') s3.aim = s3.aim && kind === 'dolly' ? s3.aim : null;
  const yaw = rad(c.yaw);
  if (kind === 'lateral') { c.x = round2(c.x + Math.cos(yaw) * m); c.z = round2(c.z - Math.sin(yaw) * m); }
  if (kind === 'dolly') { c.x = round2(c.x - Math.sin(yaw) * m); c.z = round2(c.z - Math.cos(yaw) * m); }
  if (kind === 'ped') c.h = round2(clamp(c.h + m, .1, 30));
  return end;
}
function s3AddLight(s3, type, pos, extra = {}) {
  const L = S3_LIGHTS[type] || S3_LIGHTS.fresnel;
  const n = s3.objs.filter(o => o.kind === 'luz').length + 1;
  const id = 'l' + uid();
  s3AddObj(s3, { id, kind: 'luz', type, name: extra.name || (L.name.split(' ')[0] + ' ' + n), aim: extra.aim || null }, { x: round2(pos.x), z: round2(pos.z), rot: Math.round(pos.rot || 0), h: pos.h ?? L.h, tilt: pos.tilt ?? L.tilt, int: pos.int ?? L.int, k: pos.k ?? L.k, ang: pos.ang ?? L.ang });
  if (!s3.light) s3.light = { mode: 'sim', amb: .22, rig: true };
  s3.light.mode = 'sim';
  return id;
}
/* esquema de tres puntos para una figura, respecto de la cámara */
function s3ThreePoint(s3, actorId, cam) {
  const k = s3.keys[0], a = k.o[actorId];
  if (!a) return;
  const toCam = Math.atan2(cam.x - a.x, cam.z - a.z);
  const put = (off, d, type, h, int, k2, name) => {
    const ang = toCam + rad(off);
    const x = a.x + Math.sin(ang) * d, z = a.z + Math.cos(ang) * d;
    return s3AddLight(s3, type, { x, z, rot: deg(Math.atan2(a.x - x, a.z - z)), h, tilt: deg(Math.atan2(h - eyeOf(s3, actorId, a.pose), d)), int, k: k2 }, { name, aim: actorId });
  };
  put(45, 2.6, 'fresnel', 2.4, 70, 3200, 'Principal');
  put(-50, 2.8, 'panel', 1.7, 28, 3200, 'Relleno');
  put(165, 2.4, 'fresnel', 2.7, 55, 4300, 'Contraluz');
}
function roomOf(s3) { return { w: 8, d: 8, h: 3, ...(s3.room || {}) }; }
/* coloca puertas y ventanas sobre el muro más cercano del interior */
function snapToWall(s3, p) {
  const R = roomOf(s3), hw = R.w / 2, hd = R.d / 2;
  const opts = [['N', Math.abs(p.z + hd), { z: -hd, rot: 0 }], ['S', Math.abs(p.z - hd), { z: hd, rot: 180 }], ['O', Math.abs(p.x + hw), { x: -hw, rot: 90 }], ['E', Math.abs(p.x - hw), { x: hw, rot: -90 }]];
  opts.sort((a, b) => a[1] - b[1]);
  if (opts[0][1] > .8) return false;
  const w = opts[0][2];
  if ('z' in w) { p.z = w.z; p.x = round2(clamp(p.x, -hw + .6, hw - .6)); } else { p.x = w.x; p.z = round2(clamp(p.z, -hd + .6, hd - .6)); }
  p.rot = w.rot;
  return true;
}
/* ---------- cámara B: una segunda cámara en el mismo plano ----------
   s3.camB = { aim, aimF, aimTilt, shake }: lo de la cámara B que no cambia con el tiempo (a quién sigue, su ajuste y su
   temblor); cada clave lleva k.camB: dónde está la cámara B en ese instante (los mismos campos que k.cam). La cámara A
   sigue siendo k.cam, s3.aim…: un plano sin camB es como siempre. La viñeta de la B no se guarda: se dibuja de la
   escena, como la de la A (shotB). */
const CAM_F = ['x', 'z', 'h', 'yaw', 'pitch', 'roll', 'lens'];
const CAMB_F = ['aim', 'aimF', 'aimTilt', 'shake'];
const s3HasB = s3 => !!(s3 && s3.camB && typeof s3.camB === 'object' && !Array.isArray(s3.camB));
const camOk = c => !!c && typeof c === 'object' && CAM_F.every(f => typeof c[f] === 'number' && isFinite(c[f]));
/* dónde empieza una cámara B nueva: 1,2 m a la derecha de la A, a su altura, con un lente más cerrado */
function camBNear(c) {
  const y = rad(c.yaw || 0);
  return { x: round2(c.x + Math.cos(y) * 1.2), z: round2(c.z - Math.sin(y) * 1.2), h: c.h, yaw: c.yaw || 0, pitch: c.pitch || 0, roll: 0, lens: Math.min(135, Math.round((c.lens || 35) * 2)) };
}
/* las claves sin cámara B la toman de las vecinas (entre dos, en proporción; si no hay ninguna, junto a la A) */
function s3FillB(s3) {
  if (!s3HasB(s3) || !Array.isArray(s3.keys)) return s3;
  const has = s3.keys.filter(k => camOk(k.camB));
  for (const k of s3.keys) {
    if (camOk(k.camB)) continue;
    if (!has.length) { k.camB = camBNear(k.cam); continue; }
    let a = null, b = null;
    for (const h of has) { if (h.t <= k.t) a = h; else if (!b) b = h; }
    if (a && b) { const u = (k.t - a.t) / Math.max(.001, b.t - a.t), c = {}; for (const f of CAM_F) c[f] = round2(f === 'yaw' ? lerpAng(a.camB.yaw, b.camB.yaw, u) : lerp(a.camB[f], b.camB[f], u)); k.camB = c; }
    else k.camB = { ...(a || b).camB };
  }
  return s3;
}
/* agrega la cámara B: quieta, al lado de la A, siguiendo a la misma figura */
function s3AddB(s3) {
  if (s3HasB(s3)) return s3;
  s3.camB = {};
  for (const f of CAMB_F) if (f in s3) s3.camB[f] = s3[f];
  const c = camBNear(camKeys(s3)[0].cam);
  for (const k of s3.keys) k.camB = { ...c };
  return s3;
}
function s3DelB(s3) { if (!s3) return s3; delete s3.camB; for (const k of s3.keys || []) delete k.camB; return s3; }
/* cambia la cámara A por la B (y al revés): el editor edita la B con todo lo de siempre y al guardar las vuelve a
   cambiar. Los campos se reemplazan en su lugar (el orden no cambia: quitar y volver a poner sí lo cambiaría) */
function s3SwapB(s3) {
  if (!s3HasB(s3)) return s3;
  s3FillB(s3);
  for (const k of s3.keys) { const c = k.cam; k.cam = k.camB; k.camB = c; }
  const B = s3.camB, A = {};
  for (const f of CAMB_F) { if (f in s3) A[f] = s3[f]; if (f in B) s3[f] = B[f]; else delete s3[f]; }
  s3.camB = A;
  return s3;
}
/* la escena vista por la cámara B (una copia: para dibujar su viñeta y su planta) */
const s3ForB = s3 => s3HasB(s3) ? s3SwapB(JSON.parse(JSON.stringify(s3))) : null;
/* al abrir un proyecto: la cámara B solo con lo que se conoce; sin camB, ninguna clave la lleva */
function s3CleanB(s3) {
  if (!s3 || !Array.isArray(s3.keys)) return s3;
  if (s3.camB != null && !s3HasB(s3)) delete s3.camB;
  if (!s3HasB(s3)) { for (const k of s3.keys) if (k && 'camB' in k) delete k.camB; return s3; }
  const B = s3.camB;
  for (const f of Object.keys(B)) if (!CAMB_F.includes(f)) delete B[f];
  if (B.aim != null && !(s3.objs || []).some(o => o.id === B.aim)) B.aim = null;
  for (const f of ['aimF', 'aimTilt', 'shake']) if (f in B && !(typeof B[f] === 'number' && isFinite(B[f]))) delete B[f];
  for (const k of s3.keys) {
    if (k.camB != null && !camOk(k.camB)) delete k.camB;
    else if (k.camB) for (const f of Object.keys(k.camB)) if (!CAM_F.includes(f)) delete k.camB[f];
  }
  return s3FillB(s3);
}
/* el plano visto por la cámara B, como si fuera otro plano (id «<plano>~b»): su viñeta se dibuja y se guarda en la
   memoria igual que las demás. Sin cámara B (o en un plano dibujado a mano), null */
const SHB = new WeakMap();
function shotB(sh) {
  if (!sh || sh.ws === '2d' || !s3HasB(sh.s3)) return null;
  const sig = JSON.stringify(sh.s3), c = SHB.get(sh);
  if (c && c.sig === sig) return c.v;
  const v = { ...sh, id: sh.id + '~b', s3: s3ForB(sh.s3), ws: '3d', camOf: sh.id };
  delete v.refBack; delete v.d2;
  SHB.set(sh, { sig, v });
  return v;
}
/* el lente de la cámara B (el de su primera clave) */
const lensB = sh => s3HasB(sh && sh.s3) ? Math.round((camKeys(sh.s3)[0].camB || {}).lens || 0) : 0;

/* lente del plano = lente de la primera clave */
function s3SyncShot(sh) { if (sh.s3) sh.lens = String(Math.round(sh.s3.keys[0].cam.lens)); }
/* la escena por defecto de un plano sin puesta en escena propia: se arma una vez por versión del proyecto
   (S3REV sube con cada cambio y con cada derive) y por datos del plano */
var S3REV = 0;
const S3D_C = new WeakMap();
/* viñeta en blanco: el plano no muestra la escena 3D (para subir una imagen o dibujar encima después). Lo decide el
   plano (sh.blank, «Dejar en blanco» o «Volver a la escena 3D») y, si no dice nada, el storyboard para sus viñetas
   automáticas (P.meta.sbBlank: las que nadie armó en 3D) */
const shotBlank = sh => !!sh && (sh.blank != null ? !!sh.blank : !!(typeof P !== 'undefined' && P && P.meta && P.meta.sbBlank && !sh.s3));
/* la escena armada sola: desde el máster de la escena si lo tiene (s3Follow), si no, desde los datos del plano */
function s3Auto(sh) { const m = masterOf({ ...sh, s3: null }); return m ? s3Follow(sh, s3Of(m)) : s3Default(sh); }
function s3Of(sh) {
  if (sh.s3) return sh.s3;
  // el máster entra en la firma: al cambiar de máster (o al cambiar él, que sube S3REV) se vuelve a armar
  const m = masterOf(sh);
  const sig = S3REV + '|' + (m ? m.id : '') + '|' + ((P && P.meta && P.meta.sensor) || '') + '|' + sh.sc + '|' + (sh.chars || []).join(',') + '|' + sh.size + '|' + sh.angle + '|' + sh.lens + '|' + sh.move + '|' + sh.dur + '|' + sh.desc + '|' + sh.p0 + '|' + sh.p1;
  const c = S3D_C.get(sh);
  if (c && c.sig === sig) return c.s3;
  const s3 = m ? s3Follow(sh, s3Of(m)) : s3Default(sh);
  S3D_C.set(sh, { sig, s3 });
  return s3;
}

if (typeof module !== 'undefined') module.exports = { shotBlank, scEls, scElPut, s3Default, s3Auto, s3Follow, s3FrameFollow, shotMaster, isMaster, masterOf, setMaster, saysMaster, s3At, s3Frame, s3ApplyMove, s3KeyAt, s3AddObj, s3DelObj, estDur, vfovFor, SENSORS, camFF, s3HasB, s3AddB, s3DelB, s3SwapB, s3ForB, s3FillB, s3CleanB, shotB, lensB, s3Bake, s3MapObj, s3TakeCam, s3TakeStage, shotLens, shotHas3D, shotCloneFrom, CLONE_F };
