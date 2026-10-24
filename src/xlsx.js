/* ============================================================
   Libro de Excel (.xlsx) sin dependencias
   Celdas con colspan/rowspan (como una tabla HTML), estilos con relleno,
   fuente, alineación y bordes, anchos de columna, alto de fila, panel fijo
   y títulos de impresión. Se empaqueta en un ZIP sin compresión.
   ============================================================ */
const XL_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function xlCrc(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = XL_CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
/* ZIP «stored»: suficiente para un libro de unas decenas de kB */
function xlZip(files) {
  const enc = new TextEncoder(), parts = [], cen = [];
  const now = new Date();
  const dt = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
  const dd = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
  let off = 0;
  for (const [name, data] of files) {
    const nb = enc.encode(name), db = typeof data === 'string' ? enc.encode(data) : data, crc = xlCrc(db);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, db.length, true); h.setUint32(22, db.length, true);
    h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nb, db);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, db.length, true); c.setUint32(24, db.length, true);
    c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
    cen.push(new Uint8Array(c.buffer), nb);
    off += 30 + nb.length + db.length;
  }
  const cs = cen.reduce((a, b) => a + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
  const all = [...parts, ...cen, new Uint8Array(e.buffer)];
  const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
  let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}
const xlEsc = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const xlCol = c => { let s = ''; c++; while (c) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
const xlHex = h => 'FF' + String(h || '#000000').replace('#', '').toUpperCase().padStart(6, '0').slice(0, 6);
/* estilos: { fill:'#RRGGBB', bold, italic, size, color:'#RRGGBB', h:'left|center|right', v:'top|center', wrap, border:false,
   line:'#RRGGBB' (color del borde fino), font:'title'|'mono' } · las letras de la app: Archivo para el texto, Familjen
   Grotesk para los títulos y Courier Prime para lo que viene del guion (si no están instaladas, Excel usa las suyas) */
const XL_FONT = { '': 'Archivo', title: 'Familjen Grotesk', mono: 'Courier Prime' };
const XL_LINE = '#DDDBD7';
/* la escala de las pestañas para los Excel: la misma neutra de la app y de los PDF */
function xlTab() {
  const hex = tabHex(), deep = tabDeep();
  const c = xlRGB(hex), W = [255, 255, 255], SURF = [252, 252, 251];
  const mix = (a, b, t) => '#' + a.map((v, i) => Math.round(v * t + b[i] * (1 - t)).toString(16).padStart(2, '0')).join('').toUpperCase();
  const bar = mix(c, W, .84), L = xlRGB(bar).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
  const Y = .2126 * L[0] + .7152 * L[1] + .0722 * L[2];
  return { c: hex, deep, bar, ink: (Y + .05) / .0634 >= 1.05 / (Y + .05) ? '#222222' : '#FFFFFF', fill: mix(c, SURF, .22), fill2: mix(c, SURF, .45), line: mix(c, W, .32),
    stripD: lgCol('plan', 'd'), stripN: lgCol('plan', 'n'), black: lgCol('plan', 'brk'), ev: lgCol('plan', 'ev'), note: lgCol('call', 'note') };
}
/* la leyenda de colores arriba de la tabla, como en la app y en el PDF: «LEYENDA» y cada color con su nombre en una
   celda de ese color (combinando columnas hasta que el nombre cabe). items: [nombre, #color]; cols: anchos */
function xlLegend(items, cols) {
  if (!items || !items.length) return [];
  const out = [], first = () => [{ v: out.length ? '' : 'LEYENDA', s: { bold: true, size: 8, color: '#646464', border: false, wrap: false } }];
  let cells = first(), j = 1;
  for (const [name, c] of items) {
    const need = String(name).length * 1.1 + 3;
    const span = from => { let cs = 0, w = 0; while (from + cs < cols.length && (w < need || !cs)) { w += cols[from + cs]; cs++; } return { cs, w }; };
    let r = span(j);
    if (r.w < need && j > 1) { out.push({ cells, h: 18 }); cells = first(); j = 1; r = span(j); }
    const ink = typeof lgInk === 'function' ? lgInk(c) : '#222222';
    cells.push({ v: name, cs: r.cs, s: { fill: c, color: ink === '#FFFFFF' ? '#FFFFFF' : '#222222', size: 8.5, bold: true, h: 'center', line: '#FFFFFF', wrap: false } });
    j += r.cs;
    if (j >= cols.length) { out.push({ cells, h: 18 }); cells = first(); j = 1; }
  }
  if (cells.length > 1) out.push({ cells, h: 18 });
  return out;
}
const xlRGB = h => { h = String(h || '#000000').replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
function xlStyles() {
  const fonts = ['<font><sz val="10"/><color rgb="FF222222"/><name val="Archivo"/><family val="2"/></font>'];
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const bline = hex => { const c = xlHex(hex); return `<border><left style="thin"><color rgb="${c}"/></left><right style="thin"><color rgb="${c}"/></right><top style="thin"><color rgb="${c}"/></top><bottom style="thin"><color rgb="${c}"/></bottom><diagonal/></border>`; };
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>', bline(XL_LINE)];
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const memo = new Map();
  const idx = (arr, x) => { let i = arr.indexOf(x); if (i < 0) { arr.push(x); i = arr.length - 1; } return i; };
  return {
    get(s = {}) {
      const key = JSON.stringify(s);
      if (memo.has(key)) return memo.get(key);
      const f = idx(fonts, `<font>${s.bold ? '<b/>' : ''}${s.italic ? '<i/>' : ''}<sz val="${ea(s.size || 10)}"/><color rgb="${ea(xlHex(s.color || '#222222'))}"/><name val="${ea(XL_FONT[s.font || ''] || XL_FONT[''])}"/><family val="2"/></font>`);
      const fi = s.fill ? idx(fills, `<fill><patternFill patternType="solid"><fgColor rgb="${ea(xlHex(s.fill))}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
      const b = s.border === false ? 0 : s.line ? idx(borders, bline(s.line)) : 1;
      const al = `<alignment horizontal="${ea(s.h || 'left')}" vertical="${ea(s.v || 'center')}"${s.wrap === false ? '' : ' wrapText="1"'}/>`;
      const i = idx(xfs, `<xf numFmtId="0" fontId="${ea(f)}" fillId="${ea(fi)}" borderId="${ea(b)}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${al}</xf>`);
      memo.set(key, i);
      return i;
    },
    xml() {
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${ea(fonts.length)}">${fonts.join('')}</fonts><fills count="${ea(fills.length)}">${fills.join('')}</fills><borders count="${ea(borders.length)}">${borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${ea(xfs.length)}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    },
  };
}
/* hoja: { name, cols:[ancho en caracteres], rows:[{ cells:[{ v, s, cs, rs } | null], h? }], freeze: filas fijas, landscape, printRows:'4:4' }
   Las celdas se colocan como en una tabla HTML: saltan las posiciones ocupadas por un rowspan de arriba. */
function xlSheet(sh, st) {
  const occ = new Set(), out = new Map(), merges = [], need = new Map();
  const put = (r, c, xml) => { if (!out.has(r)) out.set(r, []); out.get(r).push([c, xml]); };
  const widths = sh.cols;
  const lines = (txt, w) => String(txt).split('\n').reduce((a, ln) => a + Math.max(1, Math.ceil(ln.length * 0.95 / Math.max(4, w - 1))), 0);
  sh.rows.forEach((row, r) => {
    let c = 0;
    for (const cell of row.cells) {
      while (occ.has(r + ',' + c)) c++;
      if (cell == null) { c++; continue; }
      const cs = cell.cs || 1, rs = cell.rs || 1, si = st.get(cell.s);
      for (let y = 0; y < rs; y++) for (let x = 0; x < cs; x++) {
        occ.add((r + y) + ',' + (c + x));
        if (x || y) put(r + y, c + x, `<c r="${ea(xlCol(c + x))}${ea(r + y + 1)}" s="${ea(si)}"/>`);
      }
      const ref = xlCol(c) + (r + 1);
      const v = cell.v;
      if (typeof v === 'number' && isFinite(v)) put(r, c, `<c r="${ea(ref)}" s="${ea(si)}"><v>${v}</v></c>`);
      else if (Array.isArray(cell.runs) && cell.runs.length) {
        // texto con tramos de formato en la misma celda (p. ej. el encabezado normal y la sinopsis en cursiva)
        const S0 = cell.s || {}, rp = R => `<rPr>${R.b || S0.bold ? '<b/>' : ''}${R.i || S0.italic ? '<i/>' : ''}<sz val="${ea(S0.size || 10)}"/><color rgb="${ea(xlHex(R.color || S0.color || '#222222'))}"/><rFont val="${ea(XL_FONT[S0.font || ''] || XL_FONT[''])}"/><family val="2"/></rPr>`;
        put(r, c, `<c r="${ea(ref)}" s="${ea(si)}" t="inlineStr"><is>${cell.runs.filter(R => R.t).map(R => `<r>${rp(R)}<t xml:space="preserve">${xlEsc(R.t)}</t></r>`).join('')}</is></c>`);
      }
      else if (v != null && v !== '') put(r, c, `<c r="${ea(ref)}" s="${ea(si)}" t="inlineStr"><is><t xml:space="preserve">${xlEsc(v)}</t></is></c>`);
      else put(r, c, `<c r="${ea(ref)}" s="${ea(si)}"/>`);
      if (cs > 1 || rs > 1) merges.push(`${ref}:${xlCol(c + cs - 1)}${r + rs}`);
      // alto estimado: el texto que no cabe en el ancho se reparte entre las filas que ocupa
      if (v != null && v !== '' && row.h == null) {
        const w = widths.slice(c, c + cs).reduce((a, b) => a + b, 0) || 10;
        const pt = (lines(v, w) * ((cell.s && cell.s.size) || 10) * 1.3 + 4) / rs;
        for (let y = 0; y < rs; y++) need.set(r + y, Math.max(need.get(r + y) || 0, pt));
      }
      c += cs;
    }
  });
  const rowsXml = sh.rows.map((row, r) => {
    const cells = (out.get(r) || []).sort((a, b) => a[0] - b[0]).map(x => x[1]).join('');
    const ht = row.h != null ? row.h : Math.max(16, Math.ceil(need.get(r) || 0));
    return `<row r="${ea(r + 1)}" ht="${ea(ht)}" customHeight="1">${cells}</row>`;
  }).join('');
  const last = xlCol(Math.max(0, widths.length - 1)) + Math.max(1, sh.rows.length);
  const fz = sh.freeze ? `<pane ySplit="${ea(sh.freeze)}" topLeftCell="A${ea(sh.freeze + 1)}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${ea(sh.freeze + 1)}" sqref="A${ea(sh.freeze + 1)}"/>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${ea(last)}"/><sheetViews><sheetView workbookViewId="0" zoomScale="100">${fz}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${widths.map((w, i) => `<col min="${ea(i + 1)}" max="${ea(i + 1)}" width="${ea(w)}" customWidth="1"/>`).join('')}</cols><sheetData>${rowsXml}</sheetData>${merges.length ? `<mergeCells count="${ea(merges.length)}">${merges.map(m => `<mergeCell ref="${ea(m)}"/>`).join('')}</mergeCells>` : ''}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${ea(sh.landscape ? 'landscape' : 'portrait')}" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}
function xlsxBook(sheets, meta = {}) {
  // en inglés (i18n.js): los textos del programa en las celdas y los nombres de las hojas
  if (typeof EN !== 'undefined' && EN && meta.title) meta = { ...meta, title: tr(meta.title) };
  if (typeof EN !== 'undefined' && EN) sheets = sheets.map(sh => ({ ...sh, name: tr(sh.name), rows: (sh.rows || []).map(r => r && r.cells ? { ...r, cells: r.cells.map(c => c && typeof c.v === 'string' ? { ...c, v: tr(c.v) } : c) } : r) }));
  const st = xlStyles();
  const names = sheets.map((s, i) => (String(s.name || 'Hoja ' + (i + 1)).replace(/[\[\]:*?/\\]/g, ' ').slice(0, 31).trim() || 'Hoja ' + (i + 1)));
  const files = sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, xlSheet(s, st)]);
  const defs = sheets.map((s, i) => s.printRows ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">'${names[i].replace(/'/g, "''")}'!$${s.printRows.replace(':', ':$')}</definedName>` : '').join('');
  const iso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  return xlZip([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${ea(i + 1)}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`],
    ['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xlEsc(meta.title || '')}</dc:title><dc:creator>FilmSpirit</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`],
    ['docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>FilmSpirit</Application></Properties>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${names.map((n, i) => `<sheet name="${ea(xlEsc(n))}" sheetId="${ea(i + 1)}" r:id="rId${ea(i + 1)}"/>`).join('')}</sheets>${defs ? `<definedNames>${defs}</definedNames>` : ''}</workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${ea(i + 1)}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${ea(i + 1)}.xml"/>`).join('')}<Relationship Id="rId${ea(sheets.length + 1)}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', st.xml()],
    ...files,
  ]);
}
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
