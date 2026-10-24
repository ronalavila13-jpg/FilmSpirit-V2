// Importar guiones en PDF: compara lo que se lee del PDF con el FDX del que salió
// node test/pdf.test.js <guion.fdx> <guion.pdf> [más.pdf ...]
const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const core = require('../src/core.js');
async function pdfPages(data) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data), verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent();
    pages.push({ w: vp.width, h: vp.height, items: tc.items.filter(it => 'str' in it).map(it => ({ s: it.str, x: it.transform[4], y: vp.height - it.transform[5], w: it.width, h: Math.hypot(it.transform[2], it.transform[3]) || it.height })) });
  }
  return pages;
}
const N = s => s.toUpperCase().replace(/\s+/g, ' ').trim();
(async () => {
  const [fdx, ...pdfs] = process.argv.slice(2);
  const ref = core.parseFDX(fs.readFileSync(fdx, 'utf8'), DOMParser).paras.filter(p => ['h', 'a', 'c', 'p', 'd', 'tr'].includes(p.t));
  let bad = 0;
  for (const f of pdfs) {
    const got = core.parsePDFScript(await pdfPages(fs.readFileSync(f)));
    let j = 0, ok = 0, typeErr = [], textErr = [];
    for (const r of ref) {
      let k = -1;
      for (let m = j; m < Math.min(got.paras.length, j + 4); m++) if (N(got.paras[m].x) === N(r.x)) { k = m; break; }
      if (k < 0) { textErr.push(r); continue; }
      if (got.paras[k].t === r.t) ok++; else typeErr.push([r.t, got.paras[k].t, r.x.slice(0, 50)]);
      j = k + 1;
    }
    const pct = ok / ref.length * 100;
    const nums = got.paras.filter(p => p.t === 'h' && p.n).length;
    console.log(`${f.split('/').pop()}: ${ok}/${ref.length} párrafos iguales (${pct.toFixed(1)} %) · ${got.paras.length} leídos · título «${got.title}» · encabezados numerados ${nums}`);
    for (const e of typeErr.slice(0, 6)) console.log('   tipo', e);
    for (const e of textErr.slice(0, 6)) console.log('   texto', e.t, JSON.stringify(e.x.slice(0, 70)));
    if (pct < 98) bad++;
  }
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
