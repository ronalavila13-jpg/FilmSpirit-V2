const C = require('../src/core.js');
const { DOMParser } = require('@xmldom/xmldom');
const fs = require('fs');
// cargar sample.js en el mismo contexto
const vm = require('vm');
const ctx = { ...C, console, uid: undefined };
const coreSrc = fs.readFileSync(__dirname + '/../src/core.js', 'utf8');
const sampleSrc = fs.readFileSync(__dirname + '/../src/sample.js', 'utf8');
vm.createContext(ctx);
vm.runInContext(coreSrc.replace(/if \(typeof module[\s\S]*$/, '') + '\n' + sampleSrc + '\n;this.buildSample=buildSample;this.SAMPLE=SAMPLE_FOUNTAIN;this.parseFountain=parseFountain;this.computeScenes=computeScenes;this.layoutScript=layoutScript;this.sceneMetrics=sceneMetrics;this.sceneElementMap=sceneElementMap;this.castNumbers=castNumbers;this.scheduleDays=scheduleDays;this.budgetTotals=budgetTotals;this.parseFDX=parseFDX;this.autoBreakdown=autoBreakdown;this.newProject=newProject;this.remapProject=remapProject;this.fmtEighths=fmtEighths;this.CAT=CAT;', ctx);
const P = ctx.buildSample();
const sc = ctx.computeScenes(P.paras);
const pages = ctx.layoutScript(P.paras);
const m = ctx.sceneMetrics(P.paras, pages, sc);
console.log('paras', P.paras.length, 'scenes', sc.scenes.length, 'pages', pages.length);
sc.scenes.forEach(s => console.log(s.key, s.ie, s.dn, '|', s.loc, '|', s.locBase, '|', s.tod, '|', ctx.fmtEighths(m.eighths[s.idx])));
const byCat = {};
for (const e of Object.values(P.elements)) (byCat[e.cat] = byCat[e.cat] || []).push(e.name);
console.log(JSON.stringify(byCat, null, 0));
console.log('tags', P.tags.length, 'shots', Object.keys(P.shots).length);
const days = ctx.scheduleDays(P, sc);
console.log('days', days.days.map(d => d.keys.join(',')), 'bank', days.bank);
console.log('budget', JSON.stringify(ctx.budgetTotals(P)));
console.log(P.paras.slice(0, 12).map(p => p.t + ': ' + p.x.slice(0, 50)).join('\n'));

// FDX con diálogo dual y etiquetas de Final Draft
const fdx = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
<Content>
<Paragraph Number="1" Type="Scene Heading"><SceneProperties Length="1" Page="1" Title=""/><Text>EXT. CAR WASH “THE FRIEND” - DÍA</Text></Paragraph>
<Paragraph Type="Action"><Text>BETO (40) cuenta un </Text><Text TagNumber="1">fajo</Text><Text> de billetes. FRUP-FRUP-FRUP. Leo mira la puerta. Un taxi entra.</Text></Paragraph>
<Paragraph Type="Character"><Text>BETO</Text></Paragraph>
<Paragraph Type="Parenthetical"><Text>(sonriendo)</Text></Paragraph>
<Paragraph Type="Dialogue"><Text>Dos mil lucrecias, tigre.</Text></Paragraph>
<Paragraph><DualDialogue>
<Paragraph Type="Character"><Text>LEO (CONT'D)</Text></Paragraph>
<Paragraph Type="Dialogue"><Text>Ya.</Text></Paragraph>
<Paragraph Type="Character"><Text>MINA (V.O.)</Text></Paragraph>
<Paragraph Type="Dialogue"><Text>Nada raro.</Text></Paragraph>
</DualDialogue></Paragraph>
<Paragraph Number="2" Type="Scene Heading"><Text>INT. CASA DE LA ABUELA - COCINA - NOCHE</Text></Paragraph>
<Paragraph Type="Action"><Text>La ABUELA (74) se saca el audífono. La sartén chisporrotea.</Text></Paragraph>
<Paragraph Type="Transition"><Text>CORTE A:</Text></Paragraph>
</Content>
<TagData><TagCategories><TagCategory Id="c1" Name="Props" Number="5"/></TagCategories>
<TagDefinitions><TagDefinition CatId="c1" Id="d1" Label="Fajo de billetes" Number="1"/></TagDefinitions>
<Tags><Tag Number="1"><DefId>d1</DefId></Tag></Tags></TagData>
</FinalDraft>`;
const r = ctx.parseFDX(fdx, DOMParser);
console.log('\nFDX paras:', r.paras.map(p => p.t + (p.n ? '#' + p.n : '') + ':' + p.x).join(' | '));
console.log('fdTags', JSON.stringify(r.fdTags));
const Q = ctx.newProject('t', r.paras);
const added = ctx.autoBreakdown(Q, { fdTags: r.fdTags });
console.log('added', added, Object.values(Q.elements).map(e => e.cat + ':' + e.name + (e.auto ? '*' : '')).join(', '));
const sc2 = ctx.computeScenes(Q.paras);
console.log(sc2.scenes.map(s => [s.key, s.ie, s.dn, s.loc, s.locBase].join(' / ')));
// remapeo
const r2 = ctx.parseFDX(fdx.replace('Ya.', 'Ya, ya.').replace('Number="2" ', 'Number="3" '), DOMParser);
const lost = ctx.remapProject(Q, r2.paras);
console.log('remap lost', lost, 'tags', Q.tags.length);
