/* Arma src/glb-lib.js: los lectores de modelos 3D de three.js (GLTFLoader para .glb/.gltf/.vrm, FBXLoader para .fbx de
   Mixamo; para los escenarios de SketchUp, ColladaLoader para .dae, OBJLoader con MTLLoader para .obj y unzipSync de
   fflate para abrir un .kmz o un .zip; modelos.js los abre con su propio administrador de carga, por eso no va el
   KMZLoader) y el reductor de triángulos de meshoptimizer, para el THREE global de la app (no hay módulos ES).
   Todo queda dentro de glbLib(): no corre nada hasta que se importa un modelo.
     node tools/glb-lib.mjs          (necesita esbuild, three 0.159.0 y meshoptimizer 1.1.1 en node_modules) */
import { build } from 'esbuild';
import { writeFileSync, readFileSync } from 'node:fs';
const entry = `
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { unzipSync } from 'three/examples/jsm/libs/fflate.module.js';
import { MeshoptSimplifier, MeshoptDecoder } from 'meshoptimizer';
export { GLTFLoader, FBXLoader, ColladaLoader, OBJLoader, MTLLoader, unzipSync, MeshoptSimplifier, MeshoptDecoder };
`;
// 'three' es el THREE global (three.min.js va antes que la app)
const globalThree = { name: 'three-global', setup(b) {
  b.onResolve({ filter: /^three$/ }, () => ({ path: 'three', namespace: 'three-global' }));
  b.onLoad({ filter: /.*/, namespace: 'three-global' }, () => ({ contents: 'module.exports = THREE;', loader: 'js' }));
} };
const r = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'js' }, bundle: true, minify: true, format: 'iife', globalName: '__GLB', write: false, plugins: [globalThree], target: ['es2020'], legalComments: 'none' });
let js = r.outputFiles[0].text.trim();
if (/<\/script/i.test(js)) js = js.replace(/<\/script/gi, '<\\/script');
const ver = n => JSON.parse(readFileSync(`node_modules/${n}/package.json`, 'utf8')).version;
writeFileSync('src/glb-lib.js', `/* Lectores de modelos 3D (three.js ${'0.159.0'} GLTFLoader, FBXLoader, ColladaLoader, TGALoader, OBJLoader y MTLLoader, MIT,
   con fflate 0.6.9, MIT; meshoptimizer ${ver('meshoptimizer')}, MIT).
   Lo arma tools/glb-lib.mjs (no editar a mano). Se activa solo al importar o mostrar un modelo: glbLib() */
function glbLib() {
  if (glbLib.v) return glbLib.v;
  ${js}
  return (glbLib.v = __GLB);
}
`);
console.log('src/glb-lib.js', Math.round(js.length / 1024), 'KB');
