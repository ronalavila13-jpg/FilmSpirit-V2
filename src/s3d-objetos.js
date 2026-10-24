/* ============================================================
   OBJETOS COMUNES Y ARMAS DE UTILERÍA
   Objetos de mano en el mismo estilo de los demás. Los que se empuñan (cuchillo, machete, pistola,
   ametralladora, linterna) se arman como se sostienen —el mango vertical en el origen, la hoja o el cañón
   hacia +z— y en el piso o una mesa quedan acostados de lado (parts.lay).
   ============================================================ */
const OBJ_KINDS = {
  papel: { name: 'Hoja de papel', w: .21, d: .3, small: true, cat: 'objeto' },
  libro: { name: 'Libro', w: .16, d: .23, small: true, cat: 'objeto' },
  laptop: { name: 'Laptop', w: .33, d: .24, small: true, cat: 'objeto' },
  computadora: { name: 'Computadora de escritorio', w: .6, d: .4, small: true, cat: 'objeto' },
  taza: { name: 'Taza', w: .11, d: .09, small: true, cat: 'objeto' },
  botella: { name: 'Botella', w: .08, d: .08, small: true, cat: 'objeto' },
  linterna: { name: 'Linterna', w: .05, d: .2, small: true, cat: 'objeto' },
  maleta: { name: 'Maleta', w: .45, d: .25, small: true, cat: 'objeto' },
  paraguas: { name: 'Paraguas', w: 1, d: 1, small: true, cat: 'objeto' },
  cuchillo: { name: 'Cuchillo', w: .04, d: .32, small: true, cat: 'arma' },
  machete: { name: 'Machete', w: .07, d: .65, small: true, cat: 'arma' },
  pistola: { name: 'Pistola', w: .12, d: .2, small: true, cat: 'arma' },
  ametralladora: { name: 'Ametralladora', w: .22, d: .95, small: true, cat: 'arma' },
};
Object.assign(S3_PROPS, OBJ_KINDS);
/* cómo se sostiene cada uno (además de los de s3d-figs.js) */
const OBJ_PI = Math.PI;
Object.assign(GRIP, {
  papel: { mano: [0, -.17, 0, 0, 0, OBJ_PI / 2], pecho: [0, -.06, .28, -1.05, 0, 0] },
  libro: { mano: [0, -.15, 0, 0, 0, OBJ_PI / 2], pecho: [0, -.1, .22, -1.05, 0, 0] },
  laptop: { mano: [0, -.19, 0, 0, 0, OBJ_PI / 2], pecho: [0, -.22, .26, 0, 0, 0] },
  taza: { mano: [0, -.01, -.035, OBJ_PI / 2, 0, 0], pecho: [0, -.16, .2, 0, 0, 0] },
  botella: { mano: [0, -.01, -.12, OBJ_PI / 2, 0, 0], pecho: [0, -.26, .2, 0, 0, 0] },
  linterna: { mano: [0, -.01, .03, OBJ_PI / 2, 0, 0], pecho: [0, -.06, .2, OBJ_PI / 2, 0, 0] },
  maleta: { mano: [0, -.69, 0, 0, OBJ_PI / 2, 0], pecho: [0, -.75, .1, 0, 0, 0] },
  paraguas: { mano: [0, -.01, -.07, OBJ_PI / 2, 0, 0], pecho: [0, -.28, .26, 0, 0, 0] },
  cuchillo: { mano: [0, -.01, .02, OBJ_PI / 2, 0, 0], pecho: [0, -.12, .2, 0, 0, 0] },
  machete: { mano: [0, -.01, .02, OBJ_PI / 2, 0, 0], pecho: [0, -.14, .2, 0, 0, 0] },
  pistola: { mano: [0, -.02, .02, OBJ_PI / 2, 0, 0], pecho: [0, -.1, .2, -OBJ_PI / 2, 0, 0] },
  ametralladora: { mano: [0, -.02, .02, OBJ_PI / 2, 0, 0], pecho: [-.1, -.26, .14, -OBJ_PI / 2, OBJ_PI / 4, OBJ_PI / 2] },
});
/* cuánto se cierra la mano que lo sostiene (1 = puño) */
const OBJ_FIST = { cuchillo: 1, machete: 1, pistola: .9, ametralladora: .9, linterna: 1, paraguas: 1, maleta: 1, botella: .85, taza: .7, libro: .5, papel: .45, laptop: .5 };
function objMats() {
  if (R3.mats.oPaper) return R3.mats;
  const P = (c, s, sp) => new THREE.MeshPhongMaterial({ color: c, shininess: s, specular: sp });
  Object.assign(R3.mats, {
    oPaper: toon('#F6F4EE'), oCover: toon('#A2382F'), oPages: toon('#EFE8D6'), oPlastic: toon('#2B2D31'), oAlu: P('#B9BDC3', 40, '#E8EBEE'),
    oSteel: P('#C9CDD2', 80, '#FFFFFF'), oGun: P('#2A2C30', 35, '#6E737A'), oWood: toon('#7A4E2E'), oMug: toon('#E9E4D8'), oGlassG: new THREE.MeshPhongMaterial({ color: '#3F7A4E', shininess: 90, specular: '#D8EBDD', transparent: true, opacity: .82 }),
    oCase: toon('#3D4A5C'), oUmb: toon('#2E3E66'), oLight: new THREE.MeshBasicMaterial({ color: '#FFF4D6' }), oScreenOn: new THREE.MeshBasicMaterial({ color: '#9FC3E6' }),
  });
  return R3.mats;
}
/* líneas de texto impresas (papel, pantalla) */
function objLinesTex(key, w, h, rows, ink, bg) {
  return geoOnce('ol|' + key, () => {
    const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * h / w);
    const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = ink;
    for (let i = 0; i < rows; i++) { const y = c.height * (.12 + i * .76 / rows), L = c.width * (.7 + ((i * 37) % 23) / 100); g.fillRect(c.width * .12, y, i % 6 === 5 ? L * .5 : L * .95 - c.width * .1, Math.max(1.5, c.height / rows * .28)); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const geo = new THREE.PlaneGeometry(w, h); geo.rotateX(-Math.PI / 2); geo.userData.tex = t; return geo;
  });
}
function objBuild(kind, inner, put, B, C, S) {
  const M = objMats(), T = THREE;
  // papel impreso (con luz) o pantalla encendida (sin sombra)
  const tex = (key, w, h, rows, ink, bg, lit) => { const geo = objLinesTex(key, w, h, rows, ink, bg); const m = new T.Mesh(geo, lit ? toon('#FFFFFF', { map: geo.userData.tex }) : new T.MeshBasicMaterial({ map: geo.userData.tex })); m.userData.noOutline = true; return m; };
  // grupo «como se sostiene» (se acuesta cuando no está en una mano)
  const hg = new T.Group(); const H = (geo, m, x, y, z) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); hg.add(o); return o; };
  const HB = (w, h, d, x, y, z, m, r) => H(rbox(w, h, d, r ?? Math.min(.006, Math.min(w, h, d) * .3)), m, x, y, z);
  const blade = (len, w0, w1, th) => geoOnce('blade' + [len, w0, w1, th], () => {
    const sh = new T.Shape(); sh.moveTo(-w0 / 2, 0); sh.lineTo(-w1 / 2, len * .62); sh.quadraticCurveTo(-w1 / 2, len * .94, w1 * .3, len); sh.lineTo(w1 / 2, len * .86); sh.lineTo(w0 / 2, 0); sh.closePath();
    const bs = Math.min(w0, w1) * .1;
    const g = new T.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: th * .25, bevelSize: bs, bevelOffset: -bs, bevelSegments: 1, curveSegments: 6 });
    g.translate(0, 0, -th / 2); g.rotateY(OBJ_PI / 2); g.computeVertexNormals(); return g;
  });
  const parts = {};
  switch (kind) {
    case 'papel': B(.21, .0015, .297, 0, .001, 0, M.oPaper, .0005); { const t = tex('papel', .19, .27, 22, '#9A968E', '#F6F4EE', true); t.position.y = .0025; inner.add(t); } break;
    case 'libro': B(.155, .032, .225, 0, .016, 0, M.oCover, .004); B(.146, .026, .212, .005, .016, 0, M.oPages, .002); break;
    case 'laptop': {
      B(.32, .018, .22, 0, .009, 0, M.oAlu, .006); B(.28, .002, .1, 0, .019, -.02, M.oPlastic, .001); B(.08, .002, .05, 0, .019, .07, M.oPlastic, .002);
      const lid = new T.Group(); lid.position.set(0, .018, -.108); lid.rotation.x = -.25; inner.add(lid);
      const l1 = new T.Mesh(rbox(.32, .21, .008, .006), M.oAlu); l1.position.set(0, .105, 0); lid.add(l1);
      const sc = tex('lap', .29, .18, 9, '#5B83AE', '#CFE0F0'); sc.rotation.x = Math.PI / 2; sc.position.set(0, .105, .0045); lid.add(sc);
      break;
    }
    case 'computadora': {
      B(.2, .012, .14, 0, .006, -.1, M.oPlastic, .005); B(.04, .2, .025, 0, .11, -.12, M.oPlastic, .008);
      const mon = new T.Group(); mon.position.set(0, .34, -.1); inner.add(mon);
      const fr = new T.Mesh(rbox(.56, .34, .025, .01), M.oPlastic); mon.add(fr);
      const sc = tex('pc', .52, .3, 12, '#4F6E8F', '#D8E6F2'); sc.rotation.x = Math.PI / 2; sc.position.z = .013; mon.add(sc);
      B(.44, .02, .14, 0, .01, .1, M.oPlastic, .006); B(.42, .004, .12, 0, .021, .1, toon('#45484E'), .002);
      S(.03, .27, .015, .11, M.oPlastic, 1, .5, 1.6);
      break;
    }
    case 'taza': {
      C(.042, .09, 0, .045, 0, M.oMug, false, false, .008); C(.036, .004, 0, .088, 0, toon('#4A2E1F'), false, false, .001);
      const hd = new T.Mesh(new T.TorusGeometry(.026, .008, 6, 14, Math.PI * 1.2), M.oMug); hd.position.set(.045, .048, 0); hd.rotation.z = -Math.PI * .6; inner.add(hd);
      break;
    }
    case 'botella': {
      const geo = geoOnce('botella', () => new T.LatheGeometry([[0, 0], [.035, 0], [.037, .01], [.037, .19], [.03, .22], [.014, .26], [.013, .3], [0, .3]].map(([x, y]) => new T.Vector2(x, y)), 20));
      put(geo, M.oGlassG, 0, 0, 0); C(.0145, .02, 0, .305, 0, toon('#C9A545'), false, false, .003);
      C(.0378, .08, 0, .1, 0, M.oPaper, false, false, .001);
      break;
    }
    case 'maleta': {
      B(.44, .58, .22, 0, .33, 0, M.oCase, .04); for (const sx of [-.12, .12]) B(.02, .06, .03, sx, .65, 0, M.oPlastic, .006); B(.28, .02, .03, 0, .68, 0, M.oPlastic, .008);
      for (const [x, z] of [[-.18, -.08], [.18, -.08], [-.18, .08], [.18, .08]]) C(.025, .02, x, .025, z, M.oPlastic, true, false, .006);
      for (const y of [.2, .46]) B(.445, .015, .225, 0, y, 0, toon('#33404F'), .005);
      break;
    }
    case 'paraguas': {
      C(.008, .9, 0, .45, 0, M.oPlastic, false, false, .002);
      const can = geoOnce('umb', () => { const g = new T.ConeGeometry(.52, .26, 8, 1, true); return g; });
      const cm = M.oUmb.clone(); cm.side = T.DoubleSide;
      const o = put(can, cm, 0, .92, 0); o.userData.noOutline = true;
      const hd = new T.Mesh(new T.TorusGeometry(.035, .009, 6, 12, Math.PI), M.oPlastic); hd.position.set(.035, .0, 0); hd.rotation.z = Math.PI; inner.add(hd);
      break;
    }
    case 'cuchillo': {
      HB(.022, .11, .03, 0, -.02, 0, M.oPlastic, .008); for (const y of [-.05, .0]) H(rcyl(.004, .024, .001, 8), M.oSteel, 0, y, 0).rotation.z = OBJ_PI / 2;
      H(rbox(.026, .008, .034, .003), M.oSteel, 0, .036, 0);
      H(blade(.2, .03, .026, .003), M.oSteel, 0, .04, 0);
      parts.lay = [OBJ_PI / 2, OBJ_PI / 2, 0, .011];
      break;
    }
    case 'machete': {
      HB(.026, .13, .034, 0, -.02, 0, M.oWood, .009); for (const y of [-.06, -.01]) H(rcyl(.005, .03, .001, 8), M.oSteel, 0, y, 0).rotation.z = OBJ_PI / 2;
      H(blade(.5, .042, .075, .004), M.oSteel, 0, .045, .004);
      parts.lay = [OBJ_PI / 2, OBJ_PI / 2, 0, .013];
      break;
    }
    case 'pistola': {
      const gr = HB(.03, .11, .052, 0, -.02, -.01, M.oGun, .01); gr.rotation.x = .25;
      HB(.032, .04, .2, 0, .055, .055, M.oGun, .008); HB(.03, .025, .17, 0, .025, .06, M.oGun, .006);
      H(rcyl(.006, .012, .002, 10), M.vBlack || M.oPlastic, 0, .055, .157).rotation.x = Math.PI / 2;
      const tg = new T.Mesh(new T.TorusGeometry(.018, .004, 6, 12, Math.PI), M.oGun); tg.position.set(0, .012, .04); tg.rotation.set(0, Math.PI / 2, Math.PI); hg.add(tg);
      HB(.005, .02, .006, 0, .018, .04, M.oGun, .002);
      parts.lay = [0, 0, OBJ_PI / 2, .017];
      break;
    }
    case 'ametralladora': {
      const gr = HB(.03, .1, .045, 0, -.02, -.01, M.oGun, .01); gr.rotation.x = .3;
      HB(.05, .075, .36, 0, .05, .08, M.oGun, .01); HB(.035, .02, .3, 0, .1, .08, M.oGun, .006);
      HB(.02, .04, .03, 0, .125, .2, M.oGun, .005); HB(.02, .035, .03, 0, .12, -.05, M.oGun, .005);
      H(rcyl(.012, .38, .003, 10), M.oGun, 0, .06, .45).rotation.x = Math.PI / 2;
      H(rcyl(.018, .2, .004, 10), M.oGun, 0, .055, .32).rotation.x = Math.PI / 2;
      const mag = HB(.03, .16, .06, 0, -.04, .14, M.oGun, .006); mag.rotation.x = -.25;
      const st = HB(.04, .085, .24, 0, .03, -.2, M.oWood, .012); st.rotation.x = .08;
      const tg = new T.Mesh(new T.TorusGeometry(.02, .004, 6, 12, Math.PI), M.oGun); tg.position.set(0, .012, .05); tg.rotation.set(0, Math.PI / 2, Math.PI); hg.add(tg);
      parts.lay = [0, 0, OBJ_PI / 2, .026];
      break;
    }
    case 'linterna': {
      H(rcyl(.016, .15, .004, 14), M.oPlastic, 0, -.03, 0); H(rcyl(.018, .05, .005, 16, .024), M.oPlastic, 0, .07, 0);
      const l = H(rcyl(.021, .004, .001, 16), M.oLight, 0, .096, 0); l.userData.noOutline = true;
      parts.lay = [OBJ_PI / 2, OBJ_PI / 2, 0, .024];
      break;
    }
    default: furnBuild(kind, inner, put, B, C, S);   // muebles (s3d-interiores.js)
  }
  if (hg.children.length) { inner.add(hg); parts.hg = hg; objLay(parts, false); }
  return parts;
}
/* en la mano: como se sostiene; si no: acostado sobre su apoyo */
function objLay(parts, held) {
  const hg = parts.hg, L = parts.lay; if (!hg || !L) return;
  if (held) { hg.rotation.set(0, 0, 0); hg.position.y = 0; }
  else { hg.rotation.set(L[0], L[1], L[2]); hg.position.y = L[3]; }
}
