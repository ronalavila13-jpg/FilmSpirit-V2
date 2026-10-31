/* Modelos 3D importados: reconocer el esqueleto de un personaje (personajes-3d.js), el piso y las medidas de un
   escenario (escenarios-3d.js) y el formato liviano (modelos.js). Sin navegador: lo que no dibuja.
   node test/modelos.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const J = a => JSON.parse(JSON.stringify(a));   // lo que viene del contexto vm, como arreglos de aquí
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

const c = { Math, console, clamp: (v, a, b) => Math.min(b, Math.max(a, v)), rad: d => d * Math.PI / 180 };
vm.createContext(c);
for (const f of ['modelos', 'personajes-3d', 'escenarios-3d']) vm.runInContext(fs.readFileSync(R + '/src/' + f + '.js', 'utf8'), c, { filename: f + '.js' });
const X = vm.runInContext('({ ch3Parse, ch3AutoMap, ch3Missing, CH3_MAIN, m3Compact, m3Key, set3dFloors, set3dBox, set3dGuessUnit, set3dFitBox, set3dFog, set3dOf, set3dForLoc, set3dRoofy })', c);

// un esqueleto a partir de [nombre, padre]
const skel = L => { const ix = new Map(L.map(([n], i) => [n, i])); return L.map(([n, p]) => ({ n, p: p == null ? -1 : ix.get(p) })); };
const nameOf = (bones, map, j) => map[j] == null ? null : bones[map[j]].n;
function humanoid(fmt) {
  const L = [[fmt('Hips', 'C'), null], [fmt('Spine', 'C'), fmt('Hips', 'C')], [fmt('Spine1', 'C'), fmt('Spine', 'C')], [fmt('Spine2', 'C'), fmt('Spine1', 'C')],
    [fmt('Neck', 'C'), fmt('Spine2', 'C')], [fmt('Head', 'C'), fmt('Neck', 'C')]];
  for (const s of ['L', 'R']) {
    L.push([fmt('Shoulder', s), fmt('Spine2', 'C')], [fmt('Arm', s), fmt('Shoulder', s)], [fmt('ForeArm', s), fmt('Arm', s)], [fmt('Hand', s), fmt('ForeArm', s)]);
    for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) { let p = fmt('Hand', s); for (let i = 1; i <= 3; i++) { const n = fmt('Hand' + f + i, s); L.push([n, p]); p = n; } }
    L.push([fmt('UpLeg', s), fmt('Hips', 'C')], [fmt('Leg', s), fmt('UpLeg', s)], [fmt('Foot', s), fmt('Leg', s)], [fmt('ToeBase', s), fmt('Foot', s)]);
  }
  return skel(L);
}

test('Tripo: nodos que no son huesos entre Spine02 y Head (NeckTwist); la cabeza queda en su lugar, colgando de Spine02', () => {
  const THREE = require('three'), c2 = { Math, console, THREE };
  vm.createContext(c2); vm.runInContext(fs.readFileSync(R + '/src/modelos.js', 'utf8'), c2, { filename: 'modelos.js' });
  const arm = new THREE.Object3D(), root = new THREE.Bone(), hip = new THREE.Object3D(), spine = new THREE.Bone(), n1 = new THREE.Object3D(), n2 = new THREE.Object3D(), head = new THREE.Bone();
  root.name = 'BoneRoot'; spine.name = 'Spine02'; head.name = 'Head';
  hip.position.set(0, .1, 0); spine.position.set(0, .5, 0); n1.position.set(0, .2, .05); n1.rotation.x = .3; n2.position.set(0, .1, 0); head.position.set(0, .08, 0);
  arm.add(root); root.add(hip); hip.add(spine); spine.add(n1); n1.add(n2); n2.add(head); arm.updateMatrixWorld(true);
  const S = vm.runInContext('m3Bones', c2)([root, spine, head]);
  const B = S.bones;
  assert.deepStrictEqual(B.map(b => b.p), [-1, 0, 1], 'Head cuelga de Spine02 y Spine02 de BoneRoot');
  // rehacer las posiciones con lo guardado: deben ser las del modelo
  const W = [];
  B.forEach((b, i) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(...b.t), new THREE.Quaternion(...b.q), new THREE.Vector3(...b.s)); W[i] = (b.p < 0 ? new THREE.Matrix4().fromArray(S.arm) : W[b.p].clone()).multiply(m); });
  const at = (i, o) => { const a = new THREE.Vector3().setFromMatrixPosition(W[i]), e = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld); return a.distanceTo(e); };
  assert.ok(at(1, spine) < 1e-5, 'Spine02 donde estaba (con Hip en medio)');
  assert.ok(at(2, head) < 1e-5, 'Head donde estaba (con los NeckTwist en medio)');
});

test('Mixamo: cada articulación del maniquí con su hueso', () => {
  const B = humanoid((n, s) => 'mixamorig:' + (s === 'C' ? '' : s === 'L' ? 'Left' : 'Right') + n), M = X.ch3AutoMap(B);
  assert.deepStrictEqual(J(X.ch3Missing(M)), []);
  assert.strictEqual(nameOf(B, M, 'pelvis'), 'mixamorig:Hips');
  assert.strictEqual(nameOf(B, M, 'thigh_l'), 'mixamorig:LeftUpLeg');
  assert.strictEqual(nameOf(B, M, 'calf_r'), 'mixamorig:RightLeg');
  assert.strictEqual(nameOf(B, M, 'upperarm_l'), 'mixamorig:LeftArm');
  assert.strictEqual(nameOf(B, M, 'lowerarm_r'), 'mixamorig:RightForeArm');
  assert.strictEqual(nameOf(B, M, 'clavicle_l'), 'mixamorig:LeftShoulder');
  assert.strictEqual(nameOf(B, M, 'ball_l'), 'mixamorig:LeftToeBase');
  assert.deepStrictEqual(['spine_01', 'spine_02', 'spine_03'].map(j => nameOf(B, M, j)), ['mixamorig:Spine', 'mixamorig:Spine1', 'mixamorig:Spine2']);
  // los dedos, en orden
  assert.deepStrictEqual([1, 2, 3].map(i => nameOf(B, M, `index_0${i}_l`)), [1, 2, 3].map(i => 'mixamorig:LeftHandIndex' + i));
  assert.strictEqual(nameOf(B, M, 'thumb_01_r'), 'mixamorig:RightHandThumb1');
  // ningún hueso en dos articulaciones
  const v = Object.values(M); assert.strictEqual(new Set(v).size, v.length);
});

test('VRM (VRoid): J_Bip_L_UpperArm y compañía', () => {
  const V = { Hips: 'Hips', Spine: 'Spine', Spine1: 'Chest', Spine2: 'UpperChest', Neck: 'Neck', Head: 'Head', Shoulder: 'Shoulder', Arm: 'UpperArm', ForeArm: 'LowerArm', Hand: 'Hand', UpLeg: 'UpperLeg', Leg: 'LowerLeg', Foot: 'Foot', ToeBase: 'ToeBase' };
  const B = humanoid((n, s) => `J_Bip_${s}_` + (V[n] || n.replace(/^Hand(\w+?)(\d)$/, (_, f, i) => f + ['', 'Proximal', 'Intermediate', 'Distal'][i])));
  const M = X.ch3AutoMap(B);
  assert.deepStrictEqual(J(X.ch3Missing(M)), []);
  assert.strictEqual(nameOf(B, M, 'thigh_l'), 'J_Bip_L_UpperLeg');
  assert.strictEqual(nameOf(B, M, 'calf_l'), 'J_Bip_L_LowerLeg');
  assert.strictEqual(nameOf(B, M, 'lowerarm_r'), 'J_Bip_R_LowerArm');
  assert.strictEqual(nameOf(B, M, 'spine_03'), 'J_Bip_C_UpperChest');
});

test('Blender (upper_arm.L, shin.R) y 3ds Max (Bip01 L Thigh)', () => {
  const N = { Hips: 'hips', Spine: 'spine', Spine1: 'spine.001', Spine2: 'chest', Neck: 'neck', Head: 'head', Shoulder: 'shoulder', Arm: 'upper_arm', ForeArm: 'forearm', Hand: 'hand', UpLeg: 'thigh', Leg: 'shin', Foot: 'foot', ToeBase: 'toe' };
  const B = humanoid((n, s) => (N[n] || n.toLowerCase()) + (s === 'C' ? '' : '.' + s));
  const M = X.ch3AutoMap(B);
  assert.deepStrictEqual(J(X.ch3Missing(M)), []);
  assert.strictEqual(nameOf(B, M, 'calf_r'), 'shin.R');
  assert.strictEqual(nameOf(B, M, 'upperarm_l'), 'upper_arm.L');
  assert.deepStrictEqual({ ...X.ch3Parse('Bip01 L Thigh') }, { side: 'l', core: 'thigh' });
  assert.deepStrictEqual({ ...X.ch3Parse('CC_Base_R_Hand') }, { side: 'r', core: 'hand' });
  assert.deepStrictEqual({ ...X.ch3Parse('mixamorig5:LeftForeArm') }, { side: 'l', core: 'forearm' });
});

test('un esqueleto que no es humano: faltan articulaciones (se eligen a mano)', () => {
  const B = skel([['root', null], ['tail1', 'root'], ['tail2', 'tail1'], ['jaw', 'root']]);
  const M = X.ch3AutoMap(B);
  assert.ok(X.ch3Missing(M).length >= 10);
});

/* ---------- escenarios ---------- */
// una plantilla de mentira: cuadrados horizontales (mirando arriba) a distintas alturas, y un muro
function tpl(quads, zup, k = 1) {
  const pos = [], idx = [];
  const put = (a, b, c, d) => { const n = pos.length / 3; pos.push(...a, ...b, ...c, ...d); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); };
  // con Y arriba: (x, y, z); con Z arriba: (x, -z, y), que al pararse vuelve a (x, y, z)
  const P = (x, y, z) => zup ? [x * k, -z * k, y * k] : [x * k, y * k, z * k];
  for (const [y, s] of quads) put(P(-s, y, s), P(s, y, s), P(s, y, -s), P(-s, y, -s));   // mira hacia arriba
  put(P(-5, 0, -5), P(5, 0, -5), P(5, 4, -5), P(-5, 4, -5));   // un muro (vertical)
  const mn = [0, 1, 2].map(i => Math.min(...pos.filter((_, k) => k % 3 === i))), mx = [0, 1, 2].map(i => Math.max(...pos.filter((_, k) => k % 3 === i)));
  const v3 = a => ({ getComponent: i => a[i] });
  return { H: { tris: idx.length / 3, mats: [{}] }, parts: [{ m: 0, geo: { attributes: { position: { array: Float32Array.from(pos) } }, index: { array: Uint32Array.from(idx) }, boundingBox: { min: v3(mn), max: v3(mx) } } }] };
}
test('el piso: el nivel más bajo con buena superficie (no un escalón suelto); los otros pisos, como niveles', () => {
  const t = tpl([[-1, .4], [0, 5], [3, 4.5], [6.2, 4.4]]);
  const F = X.set3dFloors(t, false);
  assert.ok(Math.abs(F.floor - 0) < .05, 'piso en 0: ' + F.floor);
  assert.deepStrictEqual(J(F.levels.map(y => Math.round(y * 10) / 10 + 0)), [0, 3, 6.2]);
  assert.strictEqual(F.y0, -1);
});
test('un modelo con Z arriba (acostado): se para y el piso sale igual', () => {
  const t = tpl([[0, 5], [3, 4.5]], true);
  const F = X.set3dFloors(t, true);
  assert.ok(Math.abs(F.floor) < .05, 'piso: ' + F.floor);
  const B = X.set3dBox(t, true);
  assert.deepStrictEqual([B[1], B[4]].map(Math.round), [0, 4], 'el alto va en Y');
});
/* una habitación de SketchUp: 4 × 4 m y 3 m de alto, con sus cuatro muros, el techo y el piso como venga (sin piso, con
   la cara al revés o normal). El techo puede mirar hacia arriba (por fuera) o hacia abajo (por dentro) */
function caja(piso, techo = 'arriba') {
  const pos = [], idx = [];
  const quad = (a, b, c, d) => { const n = pos.length / 3; pos.push(...a, ...b, ...c, ...d); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); };
  const horiz = (y, dir) => { const q = [[-2, y, 2], [2, y, 2], [2, y, -2], [-2, y, -2]]; if (dir === 'abajo') q.reverse(); quad(...q); };
  for (const [a, b] of [[[-2, -2], [2, -2]], [[2, -2], [2, 2]], [[2, 2], [-2, 2]], [[-2, 2], [-2, -2]]]) quad([a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], 3, b[1]], [a[0], 3, a[1]]);
  horiz(3, techo);
  if (piso !== 'sin') horiz(0, piso);
  const v3 = a => ({ getComponent: i => a[i] });
  return { H: { tris: idx.length / 3, mats: [{}] }, parts: [{ m: 0, geo: { attributes: { position: { array: Float32Array.from(pos) } }, index: { array: Uint32Array.from(idx) }, boundingBox: { min: v3([-2, 0, -2]), max: v3([2, 3, 2]) } } }] };
}
test('el piso de un modelo de SketchUp: con la cara al revés también cuenta', () => {
  const F = X.set3dFloors(caja('abajo'), false);
  assert.ok(Math.abs(F.floor) < .05, 'piso al revés en 0: ' + F.floor);
  assert.ok(!F.roof);
  for (const t of ['arriba', 'abajo']) assert.ok(Math.abs(X.set3dFloors(caja('abajo', t), false).floor) < .05, 'techo ' + t);
});
test('el piso normal sigue igual', () => {
  const F = X.set3dFloors(caja('arriba'), false);
  assert.ok(Math.abs(F.floor) < .05, 'piso en 0: ' + F.floor);
  assert.ok(!F.roof);
  assert.deepStrictEqual(J(F.levels.map(y => Math.round(y))), [0, 3], 'el techo queda como otro nivel');
});
test('sin piso: la única superficie grande es el techo y el piso va en la base del modelo (no en el techo)', () => {
  for (const t of ['arriba', 'abajo']) {
    const F = X.set3dFloors(caja('sin', t), false);
    assert.ok(Math.abs(F.floor) < .05, `techo ${t}: piso en ${F.floor}`);
    assert.strictEqual(F.roof, true);
    assert.strictEqual(F.levels.length, 2, 'la base y el techo, para elegir');
  }
});
test('el aviso del editor: el piso quedó en el techo (casi todo el modelo debajo de las figuras)', () => {
  assert.strictEqual(X.set3dRoofy({ id: 'x', dn: 3, h: .1 }), true);
  assert.strictEqual(X.set3dRoofy({ id: 'x', dn: 0, h: 3 }), false, 'el piso de siempre');
  assert.strictEqual(X.set3dRoofy({ id: 'x', dn: .4, h: 2.8 }), false, 'un sótano o un desnivel');
  assert.strictEqual(X.set3dRoofy(null), false);
});
test('las medidas del archivo, por el tamaño (metros, centímetros, milímetros o pulgadas)', () => {
  // una habitación de 10 × 10 m y 4 m de alto, escrita en cada medida
  const room = k => tpl([[0, 5]], false, k);
  assert.strictEqual(X.set3dGuessUnit(room(1), false, 'gltf'), 'm');
  assert.strictEqual(X.set3dGuessUnit(room(100), false, 'gltf'), 'cm');
  assert.strictEqual(X.set3dGuessUnit(room(1000), false, 'gltf'), 'mm');
  assert.strictEqual(X.set3dGuessUnit(room(1 / .0254), false, 'fbx'), 'in', 'SketchUp en pulgadas');
  assert.strictEqual(X.set3dGuessUnit(room(100), false, 'fbx'), 'cm', 'un FBX: centímetros primero');
  // un baño de 2 × 2 m en centímetros (antes salía en metros: 200 m)
  assert.strictEqual(X.set3dGuessUnit(tpl([[0, 1]], false, 100), false, 'gltf'), 'cm');
  // plano (un terreno sin alto): por su lado
  const flat = s => ({ parts: [{ geo: { boundingBox: { min: { getComponent: i => i === 1 ? 0 : -s } , max: { getComponent: i => i === 1 ? .2 : s } } } }] });
  assert.strictEqual(X.set3dGuessUnit(flat(40), false), 'm');
  assert.strictEqual(X.set3dGuessUnit(flat(4000), false), 'cm');
});
test('la planta encuadra la acción aunque el escenario sea una ciudad; la niebla, según su tamaño', () => {
  assert.deepStrictEqual(J(X.set3dFitBox({ b: [-200, -5, 300, 40] })), [-14, -5, 14, 14]);
  assert.deepStrictEqual(J(X.set3dFitBox({ b: [-3, -2, 4, 5] })), [-3, -2, 4, 5]);
  const [n1, f1] = X.set3dFog({ b: [-5, -5, 5, 5] }), [n2, f2] = X.set3dFog({ b: [-150, -150, 150, 150] });
  assert.ok(n1 >= 30 && f1 >= 90 && n2 > n1 && f2 > f1);
});
test('el escenario de un plano y el de la locación', () => {
  c.P = { sets3d: { e1: { id: 'e1', n: 'Casa' } }, locSet3d: { CASA: 'e1', OTRA: 'e9' } };
  assert.strictEqual(X.set3dOf({ set: 'modelo', set3d: 'e1' }).n, 'Casa');
  assert.strictEqual(X.set3dOf({ set: 'modelo', set3d: 'e2' }), null, 'uno que ya no existe');
  assert.strictEqual(X.set3dOf({ set: 'int', set3d: 'e1' }), null);
  assert.strictEqual(X.set3dForLoc('CASA'), 'e1');
  assert.strictEqual(X.set3dForLoc('OTRA'), null, 'la locación apunta a uno borrado');
  assert.strictEqual(X.m3Key('s', 'e1'), 'm3~s~e1');
});

/* ---------- formato ---------- */
test('al reducir triángulos, solo quedan los vértices que se usan (y en orden)', () => {
  const P = { pos: Float32Array.from([0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3]), nrm: Float32Array.from([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), uv: null, col: null, si: null, sw: null, idx: Uint32Array.from([3, 1, 3]) };
  X.m3Compact(P);
  assert.deepStrictEqual([...P.idx], [0, 1, 0]);
  assert.deepStrictEqual([...P.pos], [3, 3, 3, 1, 1, 1]);
  assert.strictEqual(P.nrm.length, 6);
});
test('va en la compilación, y el servidor y el escritorio dejan correr WebAssembly (meshoptimizer)', () => {
  const b = fs.readFileSync(R + '/build.sh', 'utf8');
  assert.ok(/glb-lib modelos personajes-3d escenarios-3d/.test(b));
  assert.ok(/script-src 'self' 'wasm-unsafe-eval'/.test(b), 'escritorio');
  assert.ok(/'wasm-unsafe-eval'/.test(fs.readFileSync(R + '/server/server.js', 'utf8')), 'servidor');
  for (const f of ['server/make.js', 'desktop/make.js']) assert.ok(/meshoptimizer.*MIT/.test(fs.readFileSync(R + '/' + f, 'utf8')), 'licencias en ' + f);
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
