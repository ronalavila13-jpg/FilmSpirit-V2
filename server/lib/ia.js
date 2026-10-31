/* ============================================================
   Imágenes con IA (Studio): todo lo de Google en un solo lugar.
   La key es de cada persona (Google le cobra a ella): se guarda cifrada (AES-256-GCM) en users.ia_key y nunca
   vuelve al navegador ni a los registros. El secreto de cifrado es IA_KEY_SECRET (del entorno) o, si no está,
   DATA_DIR/ia-secreto.key, que se crea la primera vez: hay que respaldarlo junto con la base de datos.
   ============================================================ */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { fail } = require('./util');

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
// los ID de modelo de Google cambian seguido: confirmarlos en https://ai.google.dev/gemini-api/docs/image-generation
const IA_MODELS = [
  { id: 'gemini-nano-banana-2.1', name: 'Nano Banana 2.1 (recomendado)' },
  { id: 'gemini-3.1-flash-lite-image', name: 'Flash Lite Image (económico, 1K)' },
  { id: 'gemini-3-pro-image', name: 'Nano Banana Pro (calidad máxima)' },
];
const IA_DEFAULT = IA_MODELS[0].id;
const ASPECTS = ['1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
const MSG = {
  ia_key: 'Google no aceptó tu key. Revísala en los ajustes de IA.',
  ia_quota: 'Tu cuenta de Google se quedó sin cuota o sin saldo para generar imágenes. Revísalo en Google AI Studio.',
  ia_blocked: 'Google no devolvió una imagen (puede haberla bloqueado por seguridad). Cambia las indicaciones e inténtalo otra vez.',
  ia_timeout: 'Google tardó demasiado en responder. Inténtalo otra vez.',
};

function makeIa(dataDir, env = process.env) {
  let secret = null;
  function getSecret() {
    if (secret) return secret;
    const e = String(env.IA_KEY_SECRET || '').trim();
    if (e) secret = crypto.createHash('sha256').update(e).digest();
    else {
      const f = path.join(dataDir, 'ia-secreto.key');
      if (!fs.existsSync(f)) { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(f, crypto.randomBytes(32).toString('base64'), { mode: 0o600, flag: 'wx' }); }
      secret = Buffer.from(fs.readFileSync(f, 'utf8').trim(), 'base64');
    }
    return secret;
  }
  const seal = key => {
    const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', getSecret(), iv);
    const d = Buffer.concat([c.update(String(key), 'utf8'), c.final()]);
    return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), d.toString('base64')].join(':');
  };
  const unseal = s => {
    const [v, iv, tag, d] = String(s || '').split(':');
    if (v !== 'v1' || !d) return null;
    try {
      const c = crypto.createDecipheriv('aes-256-gcm', getSecret(), Buffer.from(iv, 'base64'));
      c.setAuthTag(Buffer.from(tag, 'base64'));
      return Buffer.concat([c.update(Buffer.from(d, 'base64')), c.final()]).toString('utf8');
    } catch (e) { return null; }   // secreto distinto o dato dañado: se trata como «sin key»
  };

  async function google(method, p, key, body, ms) {
    let r;
    try {
      r = await fetch(BASE + p, { method, signal: AbortSignal.timeout(ms), headers: { 'x-goog-api-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    } catch (e) { fail(504, MSG.ia_timeout, 'ia_timeout'); }
    const txt = await r.text();
    let j = null; try { j = JSON.parse(txt); } catch (e) { }
    if (!r.ok) {
      const st = j && j.error && j.error.status || '', m = String(j && j.error && j.error.message || '');
      if (r.status === 401 || r.status === 403 || /API key|API_KEY/i.test(m) && r.status === 400) fail(400, MSG.ia_key, 'ia_key');
      if (r.status === 429 || st === 'RESOURCE_EXHAUSTED' || /billing|quota/i.test(m)) fail(402, MSG.ia_quota, 'ia_quota');
      if (r.status === 400 && /safety|blocked|policy/i.test(m)) fail(422, MSG.ia_blocked, 'ia_blocked');
      fail(502, 'Google respondió con un error (' + r.status + '). Inténtalo otra vez.', 'ia_failed');
    }
    return j;
  }

  /* comprueba que la key sirva: Google la rechaza al listar modelos si no es válida */
  // devuelve los modelos de IA_MODELS que Google lista para esta key (si no lista ninguno, todos: los de imagen pueden no aparecer)
  async function iaModels(key) {
    const j = await google('GET', '/models?pageSize=1000', key, null, 15000), have = new Set(((j && j.models) || []).map(m => String(m.name || '').replace('models/', '')));
    const ok = IA_MODELS.filter(m => have.has(m.id));
    return ok.length ? ok : IA_MODELS;
  }

  async function iaImage(key, model, { prompt, refs, aspect }) {
    const input = [{ type: 'text', text: prompt }];
    for (const d of refs || []) { const m = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(d); if (m) input.push({ type: 'image', mime_type: m[1], data: m[2] }); }
    const j = await google('POST', '/interactions', key, {
      model: IA_MODELS.some(x => x.id === model) ? model : IA_DEFAULT, input,
      response_format: { type: 'image', aspect_ratio: ASPECTS.includes(aspect) ? aspect : '16:9', image_size: '1K' },
    }, 100000);
    for (const s of (j && j.steps) || []) for (const c of s.content || []) if (c && c.type === 'image' && c.data) return `data:${c.mime_type || c.mimeType || 'image/png'};base64,${c.data}`;
    // solo la forma de la respuesta (nunca los datos ni la key), para diagnosticar si Google cambió el formato
    console.warn('[ia] Google no devolvió una imagen; respuesta:', JSON.stringify({ keys: Object.keys(j || {}), steps: ((j && j.steps) || []).map(s => ({ type: s.type, content: (s.content || []).map(c => c && c.type) })) }).slice(0, 400));
    fail(422, MSG.ia_blocked, 'ia_blocked');
  }

  return { seal, unseal, iaModels, iaImage, ASPECTS };
}

module.exports = { makeIa, IA_MODELS, IA_DEFAULT, ASPECTS };
