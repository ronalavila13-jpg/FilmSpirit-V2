/* ============================================================
   INTERIORES Y JARDINES
   · Muebles nuevos (cocina, sala, dormitorio, baño, comedor, oficina y jardín) en el mismo estilo de los objetos.
   · Ambientes: la habitación (s3.room) puede ser una cocina, una sala, un dormitorio, un comedor, un baño, una
     oficina o un ascensor. Cada uno trae su piso, el color de sus muros y sus muebles, que quedan como objetos normales
     (se mueven, se cambian o se quitan). Los muebles van contra los muros del fondo y de los lados: el centro y
     el lado de la cámara quedan libres para actuar.
   · Entornos exteriores: jardín trasero (patio de la casa) y jardín delantero (frente de la casa).
   El frente de cada mueble mira hacia +z y su piso es y = 0, como el resto de los objetos.
   ============================================================ */
const FURN_KINDS = {
  refri: { name: 'Refrigeradora', w: .7, d: .7, cat: 'mueble' },
  cocina: { name: 'Cocina (estufa con horno)', w: .6, d: .62, cat: 'mueble' },
  lavadero: { name: 'Lavadero de cocina', w: 1.2, d: .62, cat: 'mueble' },
  gabinete: { name: 'Muebles de cocina', w: 1.2, d: .62, cat: 'mueble' },
  tv: { name: 'Televisor con mueble', w: 1.6, d: .45, cat: 'mueble' },
  sillon: { name: 'Sillón', w: .9, d: .85, cat: 'mueble' },
  mesa_centro: { name: 'Mesa de centro', w: 1.1, d: .6, cat: 'mueble' },
  estante: { name: 'Estante con libros', w: 1, d: .35, cat: 'mueble' },
  alfombra: { name: 'Alfombra', w: 2.4, d: 1.7, cat: 'mueble' },
  planta: { name: 'Planta en maceta', w: .45, d: .45, cat: 'mueble' },
  cuadro: { name: 'Cuadro', w: .7, d: .04, cat: 'mueble' },
  ropero: { name: 'Ropero', w: 1.4, d: .6, cat: 'mueble' },
  velador: { name: 'Mesa de noche', w: .45, d: .4, cat: 'mueble' },
  escritorio: { name: 'Escritorio', w: 1.3, d: .65, cat: 'mueble' },
  silla_ofi: { name: 'Silla de oficina', w: .62, d: .62, cat: 'mueble' },
  inodoro: { name: 'Inodoro', w: .42, d: .7, cat: 'mueble' },
  lavamanos: { name: 'Lavamanos con espejo', w: .55, d: .45, cat: 'mueble' },
  tina: { name: 'Tina de baño', w: 1.6, d: .75, cat: 'mueble' },
  parrilla: { name: 'Parrilla', w: 1.1, d: .5, cat: 'mueble' },
  banca: { name: 'Banca de jardín', w: 1.5, d: .6, cat: 'mueble' },
  mesa_jardin: { name: 'Mesa con sombrilla', w: 1, d: 1, cat: 'mueble' },
};
Object.assign(OBJ_KINDS, FURN_KINDS);
Object.assign(S3_PROPS, FURN_KINDS);
function furnMats() {
  const M = R3.mats; if (M.fWhite) return M;
  const P = (c, s, sp, o) => new THREE.MeshPhongMaterial({ color: c, shininess: s, specular: sp, ...o });
  Object.assign(M, {
    fWhite: toon('#EEEBE4'), fCeram: P('#F4F2EC', 70, '#FFFFFF'), fSteel: P('#C3C7CC', 70, '#F2F4F6'), fSteelD: P('#8E949B', 50, '#D4D8DC'), fBlack: toon('#2B2D31'),
    fCab: toon('#E6DDCB'), fCabD: toon('#BFB39C'), fTop: toon('#6A655F'), fWood: toon('#8E5F3E'), fWoodL: toon('#C29A6E'), fWoodD: toon('#5E3E2A'),
    fSofa: toon('#7E8C99'), fSofa2: toon('#B5674D'), fSheet: toon('#F2EFE8'), fBlanket: toon('#5E7FA3'), fPillow: toon('#E7E2D6'),
    fRug: toon('#9E5646'), fRug2: toon('#E2CFA8'), fLeaf: toon('#5F8F4E'), fLeafD: toon('#46703D'), fPot: toon('#B5653F'), fSoil: toon('#5A4636'),
    fScreen: P('#262B33', 90, '#7C8896'), fMirror: P('#B7CAD6', 110, '#FFFFFF'), fWater: toon('#CFE0E6'), fCanvas: toon('#FFFFFF'), fUmb: toon('#E8D9B5'),
  });
  M.fUmb.side = THREE.DoubleSide;
  return M;
}
const FURN_BOOKS = ['#9C3B32', '#2F5D8C', '#E2B547', '#3F7D4E', '#6B4F3A', '#D97A2B', '#E9E4D8', '#5A4E7A', '#2B2D31', '#B85C7A'];
/* cuadro: un paisaje sencillo pintado a mano */
function furnPainting() {
  return geoOnce('furnPaint', () => {
    const c = document.createElement('canvas'); c.width = 160; c.height = 112; const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, 70); sky.addColorStop(0, '#7FA6CF'); sky.addColorStop(1, '#F1D9B0'); g.fillStyle = sky; g.fillRect(0, 0, 160, 112);
    g.fillStyle = '#F4C66A'; g.beginPath(); g.arc(112, 40, 13, 0, 7); g.fill();
    g.fillStyle = '#7C8F6A'; g.beginPath(); g.moveTo(0, 78); g.quadraticCurveTo(40, 44, 82, 70); g.quadraticCurveTo(120, 52, 160, 72); g.lineTo(160, 112); g.lineTo(0, 112); g.fill();
    g.fillStyle = '#56704E'; g.beginPath(); g.moveTo(0, 96); g.quadraticCurveTo(60, 70, 160, 92); g.lineTo(160, 112); g.lineTo(0, 112); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(.6, .4); geo.userData.tex = t; return geo;
  });
}
function furnBuild(kind, inner, put, B, C, S) {
  const M = furnMats(), T = THREE;
  const piv = (x, y, z, ry = 0) => { const p = new T.Group(); p.position.set(x, y, z); p.rotation.y = ry; inner.add(p); return p; };
  // un mueble bajo de cocina: cuerpo, zócalo, puertas con tirador y encimera
  const baseCab = (w, doors) => {
    B(w, .8, .58, 0, .48, -.01, M.fCab, .012); B(w - .04, .08, .5, 0, .04, -.04, M.fBlack, .01);
    for (let i = 1; i < doors; i++) B(.008, .7, .006, -w / 2 + w * i / doors, .48, .281, M.fCabD, .002);
    for (let i = 0; i < doors; i++) { const cx = -w / 2 + w * (i + .5) / doors, sx = i % 2 ? -1 : 1; B(.014, .12, .022, cx + sx * (w / doors / 2 - .06), .74, .29, M.fSteel, .005); }
    B(w + .02, .04, .62, 0, .9, 0, M.fTop, .008);
  };
  switch (kind) {
    case 'refri':
      B(.7, 1.8, .66, 0, .9, -.02, M.fWhite, .045); B(.69, .012, .012, 0, 1.18, .31, M.fCabD, .003);
      B(.026, .32, .034, -.28, 1.4, .33, M.fSteel, .01); B(.026, .5, .034, -.28, .85, .33, M.fSteel, .01);
      B(.6, .05, .012, 0, .06, .31, M.fBlack, .004);
      break;
    case 'cocina': {
      B(.6, .86, .6, 0, .44, 0, M.fWhite, .02); B(.6, .02, .6, 0, .885, 0, M.fBlack, .005);
      for (const [x, z] of [[-.14, -.13], [.14, -.13], [-.14, .14], [.14, .14]]) { C(.075, .012, x, .9, z, M.fSteelD, false, false, .004); C(.035, .016, x, .904, z, M.fBlack, false, false, .004); }
      B(.6, .14, .04, 0, .96, -.28, M.fWhite, .012);
      for (const x of [-.21, -.07, .07, .21]) C(.018, .022, x, .95, -.255, M.fBlack, false, true, .005);
      B(.52, .44, .012, 0, .43, .302, M.fWhite, .006); B(.4, .2, .006, 0, .45, .31, M.fScreen, .004);
      C(.011, .44, 0, .7, .335, M.fSteel, true, false, .003);
      for (const x of [-.2, 0, .2]) C(.014, .015, x, .7, .305, M.fBlack, false, true, .004);
      break;
    }
    case 'lavadero': {
      baseCab(1.2, 2);
      B(.58, .012, .42, 0, .921, .02, M.fSteel, .004); B(.5, .006, .34, 0, .925, .02, M.fSteelD, .03);
      C(.016, .26, 0, 1.03, -.23, M.fSteel, false, false, .004);
      const sp = C(.012, .17, 0, 1.15, -.155, M.fSteel, false, true, .004); sp.rotation.x = Math.PI / 2 + .3;
      C(.012, .05, .07, .945, -.23, M.fSteel, false, false, .003);
      break;
    }
    case 'gabinete': {
      baseCab(1.2, 2);
      B(1.2, .72, .34, 0, 1.86, -.14, M.fCab, .012); B(.008, .66, .006, 0, 1.86, .031, M.fCabD, .002);
      for (const sx of [-1, 1]) B(.014, .12, .022, sx * .06, 1.58, .04, M.fSteel, .005);
      // frascos sobre la encimera
      C(.04, .14, -.35, .99, -.18, M.fCeram, false, false, .01); C(.045, .1, -.24, .97, -.2, M.fPot, false, false, .01); B(.18, .26, .04, .32, 1.05, -.27, M.fWoodL, .008);
      break;
    }
    case 'tv':
      B(1.6, .44, .45, 0, .22, 0, M.fWood, .02); for (const x of [-.4, .4]) B(.72, .3, .012, x, .24, .226, M.fWoodD, .006);
      B(.3, .02, .2, 0, .45, -.08, M.fBlack, .006); B(.07, .08, .04, 0, .5, -.1, M.fBlack, .01);
      B(1.25, .73, .045, 0, .9, -.1, M.fBlack, .012); B(1.19, .67, .006, 0, .9, -.075, M.fScreen, .004);
      break;
    case 'sillon': {
      B(.86, .22, .78, 0, .21, 0, M.fSofa2, .05); B(.6, .14, .58, 0, .38, .07, M.fSofa2, .06);
      const bk = B(.86, .52, .2, 0, .62, -.3, M.fSofa2, .08); bk.rotation.x = -.12;
      for (const s of [-1, 1]) B(.15, .4, .78, s * .37, .4, 0, M.fSofa2, .07);
      for (const [x, z] of [[-.36, -.32], [.36, -.32], [-.36, .32], [.36, .32]]) C(.022, .1, x, .05, z, M.fWood, false, false, .005);
      break;
    }
    case 'mesa_centro':
      B(1.1, .04, .6, 0, .4, 0, M.fWood, .012); B(1, .02, .5, 0, .12, 0, M.fWoodL, .008);
      for (const [x, z] of [[-.5, -.25], [.5, -.25], [-.5, .25], [.5, .25]]) B(.05, .38, .05, x, .2, z, M.fWood, .01);
      B(.22, .03, .16, -.22, .435, .05, M.fBlanket, .006);
      break;
    case 'estante': {
      for (const sx of [-1, 1]) B(.03, 1.9, .35, sx * .485, .95, 0, M.fWood, .006);
      B(1, 1.9, .012, 0, .95, -.17, M.fWoodD, .003);
      const ys = [.06, .46, .86, 1.26, 1.66, 1.885];
      for (const y of ys) B(1, .025, .35, 0, y, 0, M.fWood, .005);
      const ub = rbox(1, 1, 1, .004); let r = 7;   // lomos casi rectos: pocos triángulos por libro
      const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
      ys.slice(0, 5).forEach((y, si) => {
        let x = -.46; const stop = si === 2 ? .1 : .44;
        while (x < stop) {
          const w = .022 + rnd() * .03, h = .2 + rnd() * .12; if (x + w > stop) break;
          const bi = (si * 7 + Math.floor((x + 1) * 97)) % FURN_BOOKS.length, bm = M['fBook' + bi] || (M['fBook' + bi] = toon(FURN_BOOKS[bi]));
          const o = put(ub, bm, x + w / 2, y + .0125 + h / 2, .01 + rnd() * .02);
          o.scale.set(w, h, .22 + rnd() * .06); x += w + .002;
        }
        if (si === 2) { C(.06, .16, .26, y + .09, 0, M.fPot, false, false, .01, .07); S(.09, .26, y + .24, 0, M.fLeaf, 1, .8, 1); }
      });
      break;
    }
    case 'alfombra': {
      const a = B(2.4, .01, 1.7, 0, .005, 0, M.fRug, .003); B(2.2, .011, 1.5, 0, .0055, 0, M.fRug2, .003); B(1.96, .012, 1.26, 0, .006, 0, M.fRug, .003);
      for (const o of inner.children) o.userData.noOutline = true; a.receiveShadow = true;
      break;
    }
    case 'planta': {
      C(.16, .34, 0, .17, 0, M.fPot, false, false, .02, .2); C(.185, .03, 0, .34, 0, M.fPot, false, false, .008); C(.17, .02, 0, .345, 0, M.fSoil, false, false, .004);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2 + (i % 2) * .3, p = piv(Math.cos(a) * .04, .34, Math.sin(a) * .04, -a); p.rotation.z = 0;
        const t = new T.Group(); t.rotation.z = -(.35 + (i % 3) * .18); p.add(t);
        const lf = new T.Mesh(rsph(.1, 12), i % 2 ? M.fLeaf : M.fLeafD); lf.scale.set(.42, 2.4 + (i % 3) * .5, .16); lf.position.y = .25 + (i % 3) * .05; t.add(lf);
      }
      break;
    }
    case 'cuadro': {
      B(.7, .5, .03, 0, 1.55, 0, M.fWoodD, .006);
      const geo = furnPainting(); const pm = new T.Mesh(geo, M.fPaint || (M.fPaint = toon('#FFFFFF', { map: geo.userData.tex }))); pm.position.set(0, 1.55, .0155); pm.userData.noOutline = true; inner.add(pm);
      break;
    }
    case 'ropero':
      B(1.4, 1.92, .58, 0, 1.04, -.01, M.fWoodL, .02); B(1.36, .08, .54, 0, .04, -.02, M.fWoodD, .01); B(1.44, .05, .62, 0, 2.02, 0, M.fWood, .012);
      B(.008, 1.84, .006, 0, 1.04, .281, M.fWood, .002);
      for (const sx of [-1, 1]) B(.016, .26, .03, sx * .045, 1.05, .29, M.fSteel, .006);
      break;
    case 'velador':
      B(.45, .48, .4, 0, .28, 0, M.fWood, .015); B(.41, .006, .005, 0, .4, .2, M.fWoodD, .002); C(.013, .02, 0, .45, .205, M.fSteel, false, true, .004);
      for (const [x, z] of [[-.2, -.17], [.2, -.17], [-.2, .17], [.2, .17]]) B(.03, .05, .03, x, .025, z, M.fWoodD, .006);
      C(.055, .025, .1, .533, -.05, M.fCeram, false, false, .008); C(.01, .22, .1, .65, -.05, M.fSteelD); C(.1, .15, .1, .8, -.05, R3.mats.shade || M.fSheet, false, false, .008, .07);
      break;
    case 'escritorio':
      B(1.3, .035, .65, 0, .745, 0, M.fWood, .01); B(1.22, .46, .02, 0, .5, .29, M.fWoodD, .006);
      for (const sx of [-1, 1]) B(.03, .73, .6, sx * .62, .365, 0, M.fWoodD, .008);
      B(.4, .6, .55, .4, .43, -.02, M.fWoodL, .01); for (const y of [.25, .45, .62]) B(.36, .006, .005, .4, y, -.296, M.fWood, .002);
      break;
    case 'silla_ofi': {
      C(.025, .32, 0, .26, 0, M.fSteelD);
      for (let i = 0; i < 5; i++) { const p = piv(0, .06, 0, i / 5 * Math.PI * 2); const leg = put(rbox(.04, .03, .3, .01), M.fBlack, 0, 0, .15, p); leg.rotation.x = -.08; put(rsph(.025, 10), M.fBlack, 0, -.03, .28, p); }
      B(.5, .08, .48, 0, .46, 0, M.fBlack, .035);
      const bk = B(.46, .54, .06, 0, .82, -.24, M.fBlack, .04); bk.rotation.x = -.12; B(.08, .2, .04, 0, .58, -.25, M.fSteelD, .01);
      break;
    }
    case 'inodoro': {
      const bowl = C(.16, .38, 0, .19, .07, M.fCeram, false, false, .04, .19); bowl.scale.z = 1.28;
      const seat = C(.2, .035, 0, .395, .07, M.fWhite, false, false, .012); seat.scale.z = 1.25;
      B(.42, .38, .18, 0, .59, -.25, M.fCeram, .03); B(.44, .035, .2, 0, .79, -.25, M.fCeram, .012); C(.016, .012, 0, .812, -.25, M.fSteel, false, false, .003);
      break;
    }
    case 'lavamanos':
      C(.07, .7, 0, .35, -.07, M.fCeram, false, false, .02, .09); B(.55, .16, .45, 0, .78, 0, M.fCeram, .06);
      { const bs = S(.18, 0, .862, .03, M.fWater, 1, .1, .7); bs.userData.noOutline = true; }
      C(.012, .12, 0, .92, -.17, M.fSteel, false, false, .003); { const sp = C(.01, .1, 0, .97, -.13, M.fSteel, false, true, .003); sp.rotation.x = Math.PI / 2 + .25; }
      B(.56, .76, .016, 0, 1.52, -.218, M.fWoodD, .006); B(.5, .7, .01, 0, 1.52, -.207, M.fMirror, .004);
      break;
    case 'tina':
      B(1.6, .55, .75, 0, .275, 0, M.fCeram, .07); { const w = B(1.44, .012, .59, 0, .546, 0, M.fWater, .12); w.userData.noOutline = true; }
      C(.016, .16, -.74, .62, 0, M.fSteel, false, false, .004); { const sp = C(.012, .12, -.7, .68, 0, M.fSteel, true, false, .003); sp.position.x = -.68; }
      break;
    case 'parrilla':
      B(.8, .22, .45, 0, .82, 0, M.fBlack, .02); B(.76, .012, .41, 0, .935, 0, M.fSteelD, .004);
      for (let x = -.33; x <= .34; x += .06) B(.008, .01, .4, x, .944, 0, M.fSteel, .002);
      for (const [x, z] of [[-.36, -.18], [.36, -.18], [-.36, .18], [.36, .18]]) B(.03, .72, .03, x, .36, z, M.fBlack, .006);
      B(.3, .02, .4, .56, .84, 0, M.fWood, .006); B(.66, .02, .34, 0, .2, 0, M.fBlack, .006);
      break;
    case 'banca': {
      for (const z of [-.12, -.03, .06, .15]) B(1.5, .03, .075, 0, .45, z, M.fWood, .01);
      const bp = piv(0, .45, -.2); bp.rotation.x = -.18;
      for (const y of [.18, .28, .38]) put(rbox(1.5, .075, .03, .01), M.fWood, 0, y, 0, bp);
      for (const sx of [-.62, .62]) { B(.05, .45, .05, sx, .225, .14, M.fBlack, .01); B(.05, .86, .05, sx, .43, -.2, M.fBlack, .01); B(.05, .04, .4, sx, .43, -.02, M.fBlack, .01); }
      break;
    }
    case 'mesa_jardin': {
      C(.5, .03, 0, .73, 0, M.fWhite, false, false, .01); C(.03, .7, 0, .37, 0, M.fWhite); C(.26, .03, 0, .015, 0, M.fWhite, false, false, .01);
      C(.018, 1.6, 0, 1.45, 0, M.fWoodL);
      const can = geoOnce('furnUmb', () => new T.ConeGeometry(1.25, .42, 10, 1, true)); const cm = put(can, M.fUmb, 0, 2.3, 0); cm.userData.noOutline = true; cm.castShadow = true;
      C(.025, .06, 0, 2.53, 0, M.fWoodL);
      break;
    }
  }
}

/* ---------- ambientes interiores ---------- */
const ROOM_KINDS = {
  cocina: { name: 'Cocina', w: 4.6, d: 4, wall: '#EDE6D6', floor: ['tile', '#E6E0D2', '#C9BFAA', .3] },
  sala: { name: 'Sala', w: 6, d: 5, wall: '#E8DFD1', floor: ['wood', '#B88F67', '#9F7650', .16] },
  dormitorio: { name: 'Dormitorio', w: 4.8, d: 4.6, wall: '#DCE4E7', floor: ['wood', '#C49B72', '#AC845E', .14] },
  comedor: { name: 'Comedor', w: 5, d: 4.5, wall: '#ECDFCB', floor: ['wood', '#A87E58', '#8F663F', .16] },
  bano: { name: 'Baño', w: 3.4, d: 3, wall: '#E2EBEE', floor: ['tile', '#E9EDEE', '#C2CCD0', .25], band: ['#D4E4E8', '#B3C9CF', 1.45] },
  oficina: { name: 'Oficina', w: 5, d: 4.5, wall: '#E5E5E0', floor: ['tile', '#CBC9C2', '#B3B0A7', .6] },
  // cabina de acero cepillado, piso de piedra oscura, 2,4 m de alto; sin muebles: puertas, botonera y pasamanos fijos
  ascensor: { name: 'Ascensor', w: 1.6, d: 1.5, h: 2.4, tight: true, wall: '#A7ADB3', floor: ['tile', '#4E4C49', '#3A3836', .4] },
};
/* piso: baldosas o tablas (una textura que se repite) */
function roomTex(spec, w, d) {
  const [type, c1, c2, sz] = spec;
  const key = 'rt|' + spec.join();
  let base = GEO3.get(key);
  if (!base) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    if (type === 'tile') {
      g.fillStyle = c1; g.fillRect(0, 0, 256, 256); g.fillStyle = c2;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2) { g.globalAlpha = .35; g.fillRect(i * 128, j * 128, 128, 128); }
      g.globalAlpha = 1; g.strokeStyle = c2; g.lineWidth = 4; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 256); g.moveTo(0, i * 128); g.lineTo(256, i * 128); g.stroke(); }
    } else {
      // tablas de madera desfasadas, con vetas suaves
      g.fillStyle = c1; g.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 4; r++) {
        const off = (r * 97) % 256;
        for (let k = 0; k < 3; k++) { g.fillStyle = k % 2 ? c2 : c1; g.globalAlpha = .25 + ((r * 3 + k) % 4) * .1; g.fillRect(((off + k * 128) % 256), r * 64, 128, 64); }
        g.globalAlpha = 1; g.fillStyle = c2; g.fillRect(0, r * 64, 256, 3);
        for (const x of [off, (off + 128) % 256]) g.fillRect(x, r * 64, 3, 64);
        g.globalAlpha = .18; for (let v = 0; v < 6; v++) g.fillRect(0, r * 64 + 10 + v * 9, 256, 1); g.globalAlpha = 1;
      }
    }
    base = new THREE.CanvasTexture(c); base.colorSpace = THREE.SRGBColorSpace; base.wrapS = base.wrapT = THREE.RepeatWrapping; base.anisotropy = 4;
    base.userData = { shared: true }; GEO3.set(key, base);
  }
  const t = base.clone(); t.needsUpdate = true;
  const tile = type === 'tile' ? sz * 2 : sz * 4;   // la textura trae 2×2 baldosas o 4 tablas
  t.repeat.set(w / tile, d / tile);
  return t;
}
/* el piso, los muros y los detalles fijos del ambiente (dentro de syncRoom) */
function roomDress(g, R, ownDoor) {
  const K = ROOM_KINDS[R.kind]; if (!K) return null;
  const T = THREE;
  const fl = new T.Mesh(new T.PlaneGeometry(R.w, R.d), toon('#FFFFFF', { map: roomTex(K.floor, R.w, R.d) })); fl.rotation.x = -Math.PI / 2; fl.position.y = .001; fl.receiveShadow = true; fl.userData.noOutline = true; g.add(fl);
  if (K.band) {
    // azulejos hasta media altura en tres muros (el de la cámara queda abierto)
    const bm = toon('#FFFFFF', { map: roomTex(['tile', K.band[0], K.band[1], .15], 1, 1) });
    for (const [L, x, z, ry] of [[R.w, 0, -R.d / 2 + .006, 0], [R.d, -R.w / 2 + .006, 0, Math.PI / 2], [R.d, R.w / 2 - .006, 0, -Math.PI / 2]]) {
      const m2 = bm.clone(); m2.map = bm.map.clone(); m2.map.needsUpdate = true; m2.map.repeat.set(L / .3, K.band[2] / .3);
      const p = new T.Mesh(new T.PlaneGeometry(L, K.band[2]), m2); p.position.set(x, K.band[2] / 2, z); p.rotation.y = ry; p.userData.noOutline = true; p.receiveShadow = true; g.add(p);
    }
  }
  if (R.kind === 'ascensor') elevDress(g, R, ownDoor);
  return R3.mats['wall_' + R.kind] || (R3.mats['wall_' + R.kind] = toon(K.wall));
}
/* una textura dibujada una sola vez (el indicador de piso, la botonera); cada uso lleva su copia, que se libera sola */
function roomCanvasTex(key, w, h, draw) {
  let base = GEO3.get(key);
  if (!base) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    base = new THREE.CanvasTexture(c); base.colorSpace = THREE.SRGBColorSpace; base.anisotropy = 4; base.userData = { shared: true }; GEO3.set(key, base);
  }
  const t = base.clone(); t.needsUpdate = true; return t;
}
/* el ascensor: las puertas corredizas con su marco en el muro del fondo (detrás de los personajes en el encuadre de
   siempre), el indicador de piso encima, la botonera al lado, pasamanos en los costados y las juntas de los paneles.
   Lo de cada muro va en su grupo: con la cámara del otro lado, se esconde junto con el muro (roomSideHide), como una
   pared que se retira en el set. Así el contraplano desde las puertas ve a los personajes */
function elevDress(g0, R, ownDoor) {
  const T = THREE, hw = R.w / 2, hd = R.d / 2, M = R3.mats;
  const side = k => { const s = new T.Group(); s.userData.side = k; g0.add(s); (g0.userData.sides = g0.userData.sides || []).push(s); return s; };
  const gN = side('N'), gO = side('O'), gE = side('E');
  g0.userData.R = R;
  let g = gN;
  const mat = (k, c) => M[k] || (M[k] = toon(c));
  const door = mat('elevDoor', '#C4C8CC'), frame = mat('elevFrame', '#6E747A'), rail = mat('elevRail', '#D9DCDF'), seam = mat('elevSeam', '#7F858B'), plate = mat('elevPlate', '#BFC3C7');
  const add = (geo, m, x, y, z, o = {}) => { const ms = new T.Mesh(geo, m); ms.position.set(x, y, z); if (o.rx) ms.rotation.x = o.rx; if (o.rz) ms.rotation.z = o.rz; ms.castShadow = !o.flat; ms.receiveShadow = true; if (o.flat) ms.userData.noOutline = true; g.add(ms); return ms; };
  const dw = Math.min(.9, R.w - .5), dh = Math.min(2.1, R.h - .3), zN = -hd;
  // puertas: dos hojas con la ranura al centro, el marco y el umbral
  // (los planos nuevos traen las hojas como objeto: se abren con «Apertura»; los de antes, fijas y cerradas)
  if (!ownDoor) {
    for (const sx of [-1, 1]) add(rbox(dw / 2 - .006, dh, .03, .004), door, sx * dw / 4, dh / 2, zN + .022);
    add(rbox(.006, dh - .02, .034, .002), frame, 0, dh / 2, zN + .022, { flat: true });
  }
  for (const sx of [-1, 1]) add(rbox(.07, dh + .07, .05, .006), frame, sx * (dw / 2 + .035), (dh + .07) / 2, zN + .025);
  add(rbox(dw + .14, .07, .05, .006), frame, 0, dh + .035, zN + .025);
  add(rbox(dw + .14, .012, .09, .003), frame, 0, .006, zN + .045, { flat: true });
  // indicador de piso: «▲ 5» en ámbar sobre negro (brilla aunque la cabina esté a oscuras)
  const yI = Math.min(R.h - .1, dh + .07 + .1);
  add(rbox(.32, .11, .025, .006), mat('elevInd', '#1E1F21'), 0, yI, zN + .0125);
  const ind = roomCanvasTex('elevInd', 256, 88, (c, w, h) => {
    c.fillStyle = '#121314'; c.fillRect(0, 0, w, h); c.fillStyle = '#FFB13B'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 60px Arial, sans-serif'; c.fillText('5', w * .58, h / 2 + 3);
    c.beginPath(); c.moveTo(w * .3, h * .66); c.lineTo(w * .38, h * .3); c.lineTo(w * .46, h * .66); c.closePath(); c.fill();
  });
  add(new T.PlaneGeometry(.28, .085), new T.MeshBasicMaterial({ map: ind }), 0, yI, zN + .0262, { flat: true });
  // botonera al lado de la puerta: placa con botones numerados
  const px = Math.min(hw - .09, dw / 2 + .07 + .13), py = 1.22;
  add(rbox(.14, .5, .014, .004), plate, px, py, zN + .007);
  const btn = roomCanvasTex('elevBtn', 128, 448, (c, w, h) => {
    c.fillStyle = '#BFC3C7'; c.fillRect(0, 0, w, h);
    const lab = ['7', '8', '5', '6', '3', '4', '1', '2', 'S', 'B'];
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 22px Arial, sans-serif';
    lab.forEach((t, i) => {
      const x = w * (i % 2 ? .7 : .3), y = 44 + Math.floor(i / 2) * 64;
      c.fillStyle = '#8E9399'; c.beginPath(); c.arc(x, y, 21, 0, Math.PI * 2); c.fill();
      c.fillStyle = t === '5' ? '#FFB13B' : '#E9EBED'; c.beginPath(); c.arc(x, y, 17, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2B2D30'; c.fillText(t, x, y + 1);
    });
    c.fillStyle = '#C8372D'; c.beginPath(); c.arc(w / 2, h - 46, 19, 0, Math.PI * 2); c.fill();
  });
  add(new T.PlaneGeometry(.12, .42), new T.MeshBasicMaterial({ map: btn }), px, py, zN + .0145, { flat: true });
  // pasamanos en los muros de los costados, con sus soportes
  const rl = Math.max(.4, R.d - .5);
  for (const sx of [-1, 1]) {
    g = sx < 0 ? gO : gE;
    const x = sx * (hw - .055);
    add(rcyl(.018, rl, .006, 16), rail, x, .92, 0, { rx: Math.PI / 2 });
    for (const z of [-rl / 2 + .12, rl / 2 - .12]) add(rcyl(.011, .05, .003, 10), rail, sx * (hw - .028), .92, z, { rz: Math.PI / 2 });
  }
  g = g0;
  // el techo de la cabina con su panel de luz (mira hacia abajo: desde arriba, la vista cenital la atraviesa)
  const ce = add(new T.PlaneGeometry(R.w, R.d), mat('elevCeil', '#D2D5D8'), 0, R.h - .002, 0, { flat: true, rx: Math.PI / 2 }); ce.castShadow = false;
  const lp = add(new T.PlaneGeometry(Math.max(.3, R.w - .6), Math.max(.3, R.d - .6)), M.elevLamp || (M.elevLamp = new T.MeshBasicMaterial({ color: '#F6F4EC' })), 0, R.h - .006, 0, { flat: true, rx: Math.PI / 2 }); lp.castShadow = false;
  // alrededor, el pasillo del edificio (muros y piso neutros): desde afuera de la cabina no se ve el barrio del interior
  const hall = mat('elevHall', '#5E6268'), hallF = mat('elevHallF', '#4A4844'), far = 7, wd = 1.3;
  const pl = (w, h, x, y, z, ry, m) => { const p = new T.Mesh(new T.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.y = ry; p.receiveShadow = true; p.userData.noOutline = true; g.add(p); return p; };
  pl(far + R.d / 2 + wd, 6, -hw - wd, 3, (far - R.d / 2 - wd) / 2 + 0, Math.PI / 2, hall); pl(far + R.d / 2 + wd, 6, hw + wd, 3, (far - R.d / 2 - wd) / 2, -Math.PI / 2, hall);
  pl(R.w + wd * 2, 6, 0, 3, -hd - wd, 0, hall);
  const hf = new T.Mesh(new T.PlaneGeometry(R.w + wd * 2, far + R.d / 2 + wd), hallF); hf.rotation.x = -Math.PI / 2; hf.position.set(0, -.002, (far - R.d / 2 - wd) / 2); hf.receiveShadow = true; hf.userData.noOutline = true; g.add(hf);
  // juntas de los paneles de acero (verticales) en los costados
  const sh = R.h - .12;
  for (const sx of [-1, 1]) { g = sx < 0 ? gO : gE; for (let i = 1; i < 3; i++) add(rbox(.006, sh, .006, .002), seam, sx * (hw - .003), .06 + sh / 2, -hd + R.d * i / 3, { flat: true }); }
}
/* los muros de la habitación se ven solo por dentro: con la cámara afuera, el de su lado no se dibuja. Lo que va
   pegado a ese muro (las puertas del ascensor, los pasamanos) se esconde con él */
function roomSideHide(cam) {
  const g = R3.room, L = g && g.userData.sides; if (!L) return '';
  const R = g.userData.R, p = cam.position, hw = R.w / 2, hd = R.d / 2;
  for (const s of L) { const k = s.userData.side; s.visible = k === 'N' ? p.z > -hd : k === 'S' ? p.z < hd : k === 'O' ? p.x > -hw : p.x < hw; }
  // las puertas del ascensor (objeto) se van con su muro
  for (const E of R3.objs.values()) if (E.parts && E.parts.slide) E.root.visible = p.z > -hd;
  return L.map(s => s.visible ? 1 : 0).join('');
}
/* los muebles de cada ambiente: [tipo, x, z, giro, extra] según el tamaño de la habitación */
function roomLayout(kind, R) {
  const hw = R.w / 2, hd = R.d / 2, L = [], gap = .03;
  const fp = k => S3_PROPS[k] || { w: 1, d: 1 };
  const N = (k, x, o) => L.push([k, x, -hd + fp(k).d / 2 + gap, 0, o]);
  const W = (k, z, o) => L.push([k, -hw + fp(k).d / 2 + gap, z, 90, o]);
  const E = (k, z, o) => L.push([k, hw - fp(k).d / 2 - gap, z, -90, o]);
  const C = (k, x, z, rot = 0, o) => L.push([k, x, z, rot, o]);
  const wall = (k, side, u) => L.push([k, side === 'N' ? u : side === 'W' ? -hw : side === 'E' ? hw : u, side === 'N' ? -hd : side === 'S' ? hd : u, { N: 0, S: 180, W: 90, E: -90 }[side], { open: 0 }]);
  if (kind === 'cocina') {
    let cx = -hw + gap, sink = 0;
    for (const k of ['refri', 'gabinete', 'lavadero', 'cocina', 'gabinete']) { const w = fp(k).w; if (cx + w > hw - gap) break; N(k, cx + w / 2); if (k === 'lavadero') sink = cx + w / 2; cx += w; }
    wall('ventana', 'N', sink);
    C('mesa', -hw + .85, .35, 90); C('silla', -hw + .3, .05, 90); C('silla', -hw + .3, .7, 90);
    C('taza', -hw + .85, .2, 0, { h: .77 }); C('botella', sink + .45, -hd + .2, 0, { h: .92 });
    wall('puerta', 'E', .9);
  } else if (kind === 'sala') {
    N('estante', -hw + .6); wall('ventana', 'N', .5); N('planta', hw - .3);
    W('sofa', -.2); C('alfombra', -hw + 1.55, -.2, 90); C('mesa_centro', -hw + 1.45, -.2, 90); W('cuadro', -.2);
    C('lampara', -hw + .3, 1.2); E('tv', -.2); C('sillon', hw - 1.1, -hd + .9, -125);
    wall('puerta', 'E', Math.min(1.7, hd - .6));
  } else if (kind === 'dormitorio') {
    N('cama', 0); N('velador', -1.03); N('velador', 1.03); N('cuadro', 0);
    W('ropero', .5); wall('ventana', 'E', -.3); wall('puerta', 'W', -hd + .7);
    C('alfombra', 0, .25, 0);
  } else if (kind === 'comedor') {
    const tz = -hd + 1.25;
    C('mesa', 0, tz, 0); C('silla', -.4, tz - .62, 0); C('silla', .4, tz - .62, 0); C('silla', -.95, tz, 90); C('silla', .95, tz, -90);
    N('estante', -hw + .6); wall('ventana', 'N', .3); N('planta', hw - .3); W('cuadro', .2); wall('puerta', 'E', .8);
    C('botella', .15, tz, 0, { h: .77 }); C('taza', -.3, tz + .15, 0, { h: .77 });
  } else if (kind === 'bano') {
    N('inodoro', -hw + .55); N('lavamanos', .4); W('tina', .6); wall('puerta', 'E', .3);
  } else if (kind === 'ascensor') {
    wall('puerta', 'N', 0);   // las puertas corredizas (type 'ascensor'): se abren con «Apertura»
  } else if (kind === 'oficina') {
    const tz = -hd + 1.05;
    C('escritorio', 0, tz, 0); C('silla_ofi', 0, tz - .6, 0); C('laptop', -.15, tz, 180, { h: .765 }); C('taza', .35, tz + .1, 0, { h: .765 });
    N('estante', -hw + .6); wall('ventana', 'N', .9); N('planta', hw - .3); W('cuadro', 0); wall('puerta', 'E', 1);
  }
  return L;
}
/* cambia el ambiente: tamaño de la habitación y muebles (los de antes salen; lo demás se queda) */
function roomFurnish(s3, kind) {
  const K = ROOM_KINDS[kind];
  const old = new Set(s3.objs.filter(o => o.room).map(o => o.id));
  s3.objs = s3.objs.filter(o => !old.has(o.id));
  for (const k of s3.keys) for (const id of old) delete k.o[id];
  for (const o of s3.objs) if (o.hold && old.has(o.hold.a)) delete o.hold;
  const R = s3.room = { ...roomOf(s3) };
  if (!K) { delete R.kind; return s3; }
  R.kind = kind; R.w = K.w; R.d = K.d; if (K.h) R.h = K.h; else if (!s3.room.h || s3.room.h > 3.2) R.h = 2.7;
  roomLayout(kind, R).forEach(([k, x, z, rot, o = {}], i) => {
    const id = 'r' + i + kind.slice(0, 2);
    s3.objs.push({ id, kind: k, room: kind, ...(kind === 'ascensor' && k === 'puerta' ? { type: 'ascensor' } : {}) });
    const small = !!(S3_PROPS[k] || {}).small;
    for (const key of s3.keys) key.o[id] = { x: round2(x), z: round2(z), rot, ...(small ? { h: 0 } : {}), ...o };
  });
  // una cabina chica (el ascensor): las figuras y lo que cabe en la mano entran; lo grande (un auto, una mesa), las
  // luces, las puertas y las ventanas se quedan donde estaban
  if (K.tight) {
    const mx = Math.max(.1, R.w / 2 - .28), mz = Math.max(.1, R.d / 2 - .28);
    for (const ob of s3.objs) {
      const fp = S3_PROPS[ob.kind] || {};
      if (ob.room || ob.kind === 'luz' || fp.wall || (ob.kind !== 'actor' && ob.kind !== 'detalle' && !fp.small && Math.max(fp.w || 1, fp.d || 1) > .8)) continue;
      for (const key of s3.keys) { const p = key.o[ob.id]; if (p) { p.x = round2(clamp(p.x, -mx, mx)); p.z = round2(clamp(p.z, -mz, mz)); } }
    }
  }
  return s3;
}
/* la habitación cambió de tamaño: los muebles del ambiente que quedan vuelven a su sitio contra los muros */
function roomRelayout(s3) {
  const R = roomOf(s3), kind = R.kind; if (!ROOM_KINDS[kind]) return;
  roomLayout(kind, R).forEach(([k, x, z, rot, o = {}], i) => {
    const id = 'r' + i + kind.slice(0, 2), ob = s3.objs.find(q => q.id === id && q.kind === k); if (!ob) return;
    for (const key of s3.keys) if (key.o[id]) Object.assign(key.o[id], { x: round2(x), z: round2(z), rot });
  });
}
/* qué ambiente sugiere el lugar de la escena (INT. COCINA DE MARTA…) */
function roomFromLoc(L) {
  if (/\b(ASCENSOR|ELEVADOR)(ES)?\b/.test(L)) return 'ascensor';
  if (/COCINA/.test(L)) return 'cocina';
  if (/COMEDOR/.test(L)) return 'comedor';
  if (/\b(BANO|SERVICIOS HIGIENICOS|SS\.? ?HH|DUCHA)\b/.test(L)) return 'bano';
  // lugares públicos: una «sala» de cine o un «cuarto» de máquinas no son de una casa
  if (/CINE|TEATRO|AUDITORIO|HOSPITAL|CLINICA|COLEGIO|ESCUELA|IGLESIA|DISCOTECA|BAILE|FIESTAS|MAQUINAS|PROYECCION|LIMPIEZA/.test(L)) return /OFICINA|DESPACHO/.test(L) ? 'oficina' : '';
  if (/DORMITORIO|CUARTO|HABITACION|RECAMARA|ALCOBA/.test(L)) return 'dormitorio';
  if (/OFICINA|DESPACHO|ESCRITORIO|CONSULTORIO/.test(L)) return 'oficina';
  if (/\b(SALA|LIVING|SALON)\b/.test(L) && !/SALA DE (?!ESTAR)/.test(L)) return 'sala';
  return '';
}

/* ---------- jardines (exteriores) ---------- */
function envGarden(k, g, put, M, rnd) {
  const T = THREE;
  const H = {
    wall: toon('#E9DCC4'), trim: toon('#F4F1EA'), roof: toon('#9C4A36'), door: toon('#6B4A33'), win: new T.MeshPhongMaterial({ color: '#4F6273', shininess: 90, specular: '#C9D6E0' }),
    fence: toon('#A57E57'), fenceD: toon('#8A6644'), tileP: toon('#C9C0B0'), stone: toon('#CFC6B6'), flower: toon('#D8577A'), flower2: toon('#F0C24B'), white: toon('#F4F2EC'), rope: toon('#E9E4D8'),
  };
  const flat = (w, d, m, x, z, y = .003) => { const p = new T.Mesh(new T.PlaneGeometry(w, d), m); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; g.add(p); return p; };
  // fachada de una casa de un piso que mira hacia +z: muro, zócalo, ventanas, puerta y techo de tejas
  const house = (x0, z, w, h, door, wins, par = g) => {
    const hg = new T.Group(); hg.position.set(x0, 0, z); par.add(hg);
    const D = 7;   // fondo de la casa
    put(rbox(w, h, D, .02), H.wall, 0, h / 2, -D / 2, hg); put(rbox(w + .02, .3, .32, .02), H.trim, 0, .15, -.15, hg);
    put(rbox(w + .2, .18, D + .1, .02), H.trim, 0, h + .09, -D / 2, hg);   // techo plano con su borde
    for (const wx of wins) { put(rbox(1.3, 1.15, .06, .02), H.trim, wx, 1.55, .02, hg); put(rbox(1.16, 1.01, .04, .01), H.win, wx, 1.55, .04, hg); put(rbox(.04, 1.01, .05, .005), H.trim, wx, 1.55, .06, hg); put(rbox(1.4, .06, .14, .01), H.trim, wx, .96, .06, hg); }
    if (door != null) { put(rbox(1.08, 2.18, .06, .02), H.trim, door, 1.09, .02, hg); put(rbox(.96, 2.1, .05, .01), H.door, door, 1.05, .04, hg); put(rsph(.035, 10), R3.mats.metal, door + .36, 1.02, .08, hg); }
    const rf = put(rbox(w + .7, .14, 2.4, .03), H.roof, 0, h + .38, -.55, hg); rf.rotation.x = .32;
    put(rbox(w + .72, .16, .05, .01), H.trim, 0, h + .02, .58, hg).rotation.x = .32;
    return hg;
  };
  // cerco de tablas verticales (en una sola malla) entre dos puntos
  const fence = (x1, z1, x2, z2, h, gapAt) => {
    const L = Math.hypot(x2 - x1, z2 - z1), n = Math.floor(L / .17), ry = Math.atan2(x2 - x1, z2 - z1), list = [];
    for (let i = 0; i < n; i++) { const u = (i + .5) / n; const x = x1 + (x2 - x1) * u, z = z1 + (z2 - z1) * u; if (gapAt && Math.hypot(x - gapAt[0], z - gapAt[1]) < gapAt[2]) continue; list.push([x, h / 2, z, 1, ry + Math.PI / 2, 1 + ((i * 37) % 7) / 70]); }
    envInst(rbox(.15, h, .03, .01), H.fence, list, g);
    for (const y of [h * .25, h * .75]) { const r = put(rbox(.05, .08, L, .01), H.fenceD, (x1 + x2) / 2, y, (z1 + z2) / 2); r.rotation.y = ry; }
  };
  const bushes = (list, m = M.leafD, s0 = .5) => envInst(lowPoly(new T.IcosahedronGeometry(.5, 1)), m, list.map(([x, z, s = 1]) => [x, .32 * s * s0 * 2, z, s * s0 * 1.6, rnd() * 6, .75]), g);
  const flowers = (x0, x1, z, m) => { const L = []; for (let x = x0; x < x1; x += .22) L.push([x + (rnd() - .5) * .1, .32, z + (rnd() - .5) * .3, .7 + rnd() * .5]); envInst(rsph(.07, 8), m, L, g); };
  g.add(envGround(M.grass, 400));
  if (k === 'jardin_t') {
    // patio trasero: la casa al fondo, el piso de baldosas junto a ella, cerco de madera a los lados
    house(0, -6, 16, 2.9, -2.2, [-5.4, 1.4, 5]);
    flat(16, 2.6, H.tileP, 0, -4.7); { const gm = toon('#B3AA99'); for (let x = -8; x <= 8; x += .6) flat(.025, 2.6, gm, x, -4.7, .004); for (let z = -5.9; z <= -3.4; z += .6) flat(16, .025, gm, 0, z, .004); }
    fence(-8, -6, -8, 16, 1.9); fence(8, -6, 8, 16, 1.9); fence(-8, 16, 8, 16, 1.9);
    bushes([[-7.4, -2], [-7.5, 0], [-7.3, 3], [7.4, -1], [7.5, 2.5], [7.3, 6], [-7.4, 8]]);
    flat(1, 3.2, M.soil, -6.8, 3.4, .004); flowers(-7.2, -6.4, 3.4, H.flower);
    envForest(g, [[5.4, 3.2, 1.05, 1]], 'hoja');
    // tendedero con ropa
    for (const z of [-2, 4.5]) put(rcyl(.03, 2, .005, 8), R3.mats.metal, -5.6, 1, z);
    { const ln = put(rcyl(.006, 6.5, .001, 4), H.rope, -5.6, 1.92, 1.25); ln.rotation.x = Math.PI / 2; }
    [['#C0473C', -1.2], ['#3E6FA1', -.2], ['#F2EFE8', .9], ['#E2B547', 2.2], ['#5E8E5B', 3.2]].forEach(([c, z]) => { const p = put(rbox(.03, .6, .55, .01), toon(c), -5.6, 1.6, z); p.rotation.x = (rnd() - .5) * .1; });
    // parrilla y mesa con sombrilla junto a la casa
    const gp = new T.Group(); gp.position.set(-3.2, 0, -4.4); gp.rotation.y = .3; g.add(gp);
    const gput = (geo, m, x, y, z) => put(geo, m, x, y, z, gp);
    gput(rbox(.8, .22, .45, .02), toon('#2B2D31'), 0, .82, 0); for (const [x, z] of [[-.36, -.18], [.36, -.18], [-.36, .18], [.36, .18]]) gput(rbox(.03, .72, .03, .006), toon('#2B2D31'), x, .36, z);
    const tp = new T.Group(); tp.position.set(3.2, 0, -4.2); g.add(tp);
    put(rcyl(.55, .03, .01, 24), H.white, 0, .73, 0, tp); put(rcyl(.03, .7, .005, 10), H.white, 0, .37, 0, tp); put(rcyl(.018, 1.6, .004, 8), R3.mats.wood, 0, 1.45, 0, tp);
    { const um = toon('#C9563F'); um.side = T.DoubleSide; const u = put(new T.ConeGeometry(1.3, .42, 10, 1, true), um, 0, 2.3, 0, tp); u.userData.noOutline = true; }
    for (const a of [0, 2.1, 4.2]) { const c = new T.Group(); c.position.set(Math.sin(a) * .85, 0, Math.cos(a) * .85); c.rotation.y = a + Math.PI; tp.add(c); put(rbox(.44, .04, .42, .01), H.white, 0, .45, 0, c); put(rbox(.44, .4, .04, .01), H.white, 0, .68, -.2, c); for (const [x, z] of [[-.19, -.18], [.19, -.18], [-.19, .18], [.19, .18]]) put(rbox(.03, .44, .03, .006), H.white, x, .22, z, c); }
    // casas vecinas asomando por encima del cerco
    house(-15, -2, 9, 3.4, null, [-2, 2]).rotation.y = Math.PI / 2; house(15, -2, 9, 3.4, null, [-2, 2]).rotation.y = -Math.PI / 2;
  } else {
    // frente de la casa: fachada con puerta y ventanas, camino de piedras hasta la vereda, cerco bajo y la pista
    house(0, -7, 13, 3, 0, [-3.6, 3.6]);
    put(rbox(2.2, .16, 1, .02), H.stone, 0, .08, -6.5); put(rbox(1.8, .16, .5, .02), H.stone, 0, .24, -6.75);
    for (let z = -5.8; z < 9; z += .75) put(rbox(1 + (rnd() - .5) * .2, .04, .55, .05), H.stone, (rnd() - .5) * .12, .02, z);
    bushes([[-5.6, -6.2], [-4.4, -6.3], [-2.2, -6.3], [2.2, -6.3], [4.4, -6.3], [5.6, -6.2]], M.leaf, .45);
    flat(10.5, .9, M.soil, 0, -5.9, .004); flowers(-5.8, -1.2, -5.8, H.flower); flowers(1.2, 5.8, -5.8, H.flower2);
    fence(-7, 9.2, -.8, 9.2, .9); fence(.8, 9.2, 7, 9.2, .9); fence(-7, -7, -7, 9.2, .9); fence(7, -7, 7, 9.2, .9);
    envForest(g, [[-4.6, 1.5, 1.1, .5]], 'hoja');
    // buzón
    put(rcyl(.04, 1.05, .005, 8), R3.mats.wood, 1.5, .52, 8.7); put(rbox(.24, .22, .42, .05), toon('#3E6FA1'), 1.5, 1.14, 8.7);
    // vereda y pista
    flat(400, 2.2, H.stone, 0, 10.6, .006); flat(400, 9, M.asph, 0, 16.3, .005);
    for (let x = -60; x <= 60; x += 6) flat(2.6, .14, H.white, x, 16.3, .007);
    // casas vecinas a los lados
    house(-14.5, -7.5, 13, 3.2, -2, [-5, 2.5]); house(14.5, -7.5, 13, 3.6, 2, [-2.5, 5]);
    house(0, 30, 40, 3.4, null, [-14, -8, -2, 4, 10, 16]).rotation.y = Math.PI;   // las de enfrente, al otro lado de la pista
  }
}
