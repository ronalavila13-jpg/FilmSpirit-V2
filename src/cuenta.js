/* ============================================================
   CUENTA (web con cuentas) · el botón de la cuenta, los planes y los pagos, la sesión vencida y las invitaciones
   (antes en share-api.js; va justo después en el armado del servidor)
   ============================================================ */
/* ---------- cuenta: botón de la barra, plan y salida ---------- */
const PLAN_NAMES = { ...PLAN_NAME, free: EN ? 'Script' : PLAN_NAME.free };   // los de areas.js (en inglés, el gratuito es «Script», como en la portada)
const PLAN_LIMIT_CODES = new Set(['limit_projects', 'limit_scripts', 'need_plan']);
function accountButton() {
  const me = APITEAM.me; if (!me) return;
  let b = $('#acctBtn');
  if (!b) {
    b = document.createElement('button'); b.type = 'button'; b.id = 'acctBtn'; b.className = 'acct-btn';
    // en el teléfono, la cuenta es también el menú de la barra (proyectos, ayuda, idioma)
    b.onclick = e => (typeof PHONE === 'function' && PHONE() ? phoneMenu : accountMenu)(e.currentTarget);
    $('.topbar').appendChild(b);
    document.body.classList.add('has-acct');
  }
  const ini = (me.name || me.email || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  b.innerHTML = `${me.picture ? `<img src="${esc(me.picture)}" alt="" referrerpolicy="no-referrer">` : `<span>${esc(ini)}</span>`}${me.plan !== 'free' ? `<i class="acct-pro${ea(me.plan === 'studio' ? ' st' : '')}">${esc((PLAN_NAMES[me.plan] || 'Pro').toUpperCase())}</i>` : ''}`;
  b.title = `${me.name} · ${me.email} · FilmSpirit ${PLAN_NAMES[me.plan] || PLAN_NAMES.free}`;
  b.setAttribute('aria-label', 'Tu cuenta: ' + me.name);
  const img = $('img', b); if (img) img.onerror = () => { img.replaceWith(Object.assign(document.createElement('span'), { textContent: ini })); };
}

/* ---------- avisos de pago: en el idioma de la app (es, en) o, si el navegador está en uno que la app no tiene (pt, fr,
   it), en ese ---------- */
const PAY_LANG = (() => { const app = EN ? 'en' : 'es'; try { const l = (navigator.languages && navigator.languages[0] || navigator.language || '').slice(0, 2).toLowerCase(); return ['pt', 'fr', 'it'].includes(l) ? l : app; } catch (e) { return app; } })();
/* filas de la tabla: rows (las de arriba) y more (todo lo que incluye cada plan) */
const PAY_TX = {
  es: {
    all: 'Todo lo que incluye cada plan', title: 'Planes de FilmSpirit', you: 'Tu plan',
    rows: ['Guiones', 'Coescritura', 'Proyectos de producción activos', 'Personas por proyecto de producción', 'Espacio'],
    more: ['Editor de guion e importación (Final Draft, Fountain, PDF)', 'PDF del guion sin marca de agua', 'Desglose, casting, scouting, plan de rodaje, calendario, hoja de llamado y presupuesto', 'Storyboard 2D y 3D y animatic', 'Fotos y exportaciones sin marca de agua', 'Equipo con permisos por área', 'Mapas en Scouting y escenarios 3D importados', 'Proyectos archivados'],
    unl: 'Sin límite', people: '{n} personas', solo: 'Solo tú', text: 'Solo texto', free: 'Gratis',
    yes: 'Sí', from: 'Pagas desde', pe: 'Perú · soles · Mercado Pago', intl: 'Otro país · dólares · tarjeta', plan: 'Plan', month: 'Mensual', year: 'Anual', perM: 'al mes', perY: 'al año', code: 'Código de descuento', opt: 'Opcional', apply: 'Aplicar', mpMail: 'Correo de tu cuenta de Mercado Pago', mail: 'Tu correo (para el recibo)',
    today: '<b>Se cobra hoy.</b>',
    pay: 'Pagas {amount} {per}', firstYear: 'el primer año', during: 'durante {n} meses', then: 'luego {base}', off: '{pct}% de descuento', atCk: 'El código {code} se aplica en la página de pago.', tax: 'Los impuestos de tu país se calculan en la página de pago.', cancel: 'Se renueva sola en cada periodo hasta que la canceles; cancelas cuando quieras desde tu cuenta.', legal: 'Al continuar aceptas los <a href="/terminos" target="_blank" rel="noopener">Términos</a> y la política de <a href="/reembolsos" target="_blank" rel="noopener">cancelaciones y reembolsos</a>.',
    later: 'Ahora no', goMP: 'Continuar a Mercado Pago', goLS: 'Continuar al pago', opening: 'Abriendo la página de pago…', close: 'Cerrar', seePlans: 'Ver la página de planes',
    hasSub: 'Ya tienes FilmSpirit {plan}. Ves o cancelas tu suscripción en el botón de tu cuenta.', soon: 'Los pagos {where} se habilitan muy pronto.', wherePE: 'con Mercado Pago', whereIntl: 'internacionales',
    confirming: 'Confirmando tu suscripción…', welcome: '¡Ya tienes FilmSpirit {plan}!', thanks: 'Gracias por suscribirte. Ya puedes trabajar con {projects} proyectos de producción activos, en equipo con hasta {members} personas por proyecto, y exportar sin marca de agua.', thanksSolo: 'Gracias por suscribirte. Ya puedes llevar tus guiones a producción ({projects} proyectos activos) y exportar sin marca de agua.', start: 'Empezar',
    pending: 'El medio de pago aún no confirma tu suscripción. Si la completaste, se activará en unos minutos.',
    upPro: 'Pasa a Pro: {projects} proyectos de producción y equipos de hasta {members} personas con permisos por área.', upStudio: 'Pasa a Studio: {projects} proyectos de producción, hasta {members} personas por proyecto y, solo en Studio, los mapas en Scouting y los escenarios 3D importados.', choose: 'Elegir',
    sample: 'Ningún plan tiene prueba gratis: para ver la producción, explora el proyecto de ejemplo.', explore: 'Explorar con un proyecto de ejemplo', yearly: 'El plan anual cuesta 10 meses.', down: 'Si bajas de plan, los proyectos que pasen el límite quedan en solo lectura: no se borra nada.',
    founderPE: '<b>Precio de fundador:</b> Pro a {m} al mes ({y} al año) si te suscribes antes del {date}, y lo mantienes mientras sigas suscrito.', founderIntl: '<b>Precio de fundador:</b> {pct} % menos en cada cobro de Pro (código {code}) si te suscribes antes del {date}.', founderTag: 'fundador',
  },
  en: {
    all: 'Everything each plan includes', title: 'FilmSpirit plans', you: 'Your plan',
    rows: ['Scripts', 'Co-writing', 'Active production projects', 'People per production project', 'Storage'],
    more: ['Script editor and import (Final Draft, Fountain, PDF)', 'Script PDF without watermark', 'Breakdown, casting, location scouting, shooting schedule, calendar, call sheet and budget', '2D/3D storyboard and animatic', 'Photos and exports without watermark', 'Team with per-department permissions', 'Maps in Location scouting and imported 3D sets', 'Archived projects'],
    unl: 'Unlimited', people: '{n} people', solo: 'Just you', text: 'Text only', free: 'Free',
    yes: 'Yes', from: 'Paying from', pe: 'Peru · soles · Mercado Pago', intl: 'Another country · US dollars · card', plan: 'Plan', month: 'Monthly', year: 'Yearly', perM: 'per month', perY: 'per year', code: 'Discount code', opt: 'Optional', apply: 'Apply', mpMail: 'Email of your Mercado Pago account', mail: 'Your email (for the receipt)',
    today: '<b>You are charged today.</b>',
    pay: 'You pay {amount} {per}', firstYear: 'the first year', during: 'for {n} months', then: 'then {base}', off: '{pct}% off', atCk: 'Code {code} is applied on the payment page.', tax: 'Your local taxes are calculated on the payment page.', cancel: 'It renews automatically every period until you cancel; cancel anytime from your account.', legal: 'By continuing you accept the <a href="/terminos" target="_blank" rel="noopener">Terms</a> and the <a href="/reembolsos" target="_blank" rel="noopener">cancellation and refund policy</a> (in Spanish).',
    later: 'Not now', goMP: 'Continue to Mercado Pago', goLS: 'Continue to payment', opening: 'Opening the payment page…', close: 'Close', seePlans: 'See the plans page',
    hasSub: 'You already have FilmSpirit {plan}. Manage or cancel it from your account button.', soon: 'Payments {where} open very soon.', wherePE: 'with Mercado Pago', whereIntl: 'from abroad',
    confirming: 'Confirming your subscription…', welcome: 'You now have FilmSpirit {plan}!', thanks: 'Thanks for subscribing. You can now run {projects} active production projects with teams of up to {members} people each, and export without watermark.', thanksSolo: 'Thanks for subscribing. You can now take your scripts into production ({projects} active projects) and export without watermark.', start: 'Get started',
    pending: 'The payment provider has not confirmed your subscription yet. If you completed it, it will activate in a few minutes.',
    upPro: 'Move to Pro: {projects} production projects and teams of up to {members} people with permissions.', upStudio: 'Move to Studio: {projects} production projects, up to {members} people per project and, only in Studio, maps in Location scouting and imported 3D sets.', choose: 'Choose',
    sample: 'No plan has a free trial: to see production, explore the sample project.', explore: 'Explore with a sample project', yearly: 'The yearly plan costs 10 months.', down: 'If you downgrade, projects over the limit become read-only: nothing is deleted.',
    founderPE: '<b>Founder price:</b> Pro at {m} per month ({y} per year) if you subscribe before {date}, for as long as you stay subscribed.', founderIntl: '<b>Founder price:</b> {pct}% off every Pro charge (code {code}) if you subscribe before {date}.', founderTag: 'founder',
  },
  pt: {
    all: 'Tudo o que cada plano inclui', title: 'Planos do FilmSpirit', you: 'Seu plano',
    rows: ['Roteiros', 'Coescrita', 'Projetos de produção ativos', 'Pessoas por projeto de produção', 'Espaço'],
    more: ['Editor de roteiro e importação (Final Draft, Fountain, PDF)', 'PDF do roteiro sem marca-d\'água', 'Decupagem, casting, locações, plano de filmagem, calendário, ordem do dia e orçamento', 'Storyboard 2D/3D e animatic', 'Fotos e exportações sem marca-d\'água', 'Equipe com permissões por área', 'Mapas nas locações e cenários 3D importados', 'Projetos arquivados'],
    unl: 'Sem limite', people: '{n} pessoas', solo: 'Só você', text: 'Só texto', free: 'Grátis',
    yes: 'Sim', from: 'Você paga de', pe: 'Peru · soles · Mercado Pago', intl: 'Outro país · dólares · cartão', plan: 'Plano', month: 'Mensal', year: 'Anual', perM: 'por mês', perY: 'por ano', code: 'Código de desconto', opt: 'Opcional', apply: 'Aplicar', mpMail: 'E-mail da sua conta do Mercado Pago', mail: 'Seu e-mail (para o recibo)',
    today: '<b>Cobrado hoje.</b>',
    pay: 'Você paga {amount} {per}', firstYear: 'no primeiro ano', during: 'durante {n} meses', then: 'depois {base}', off: '{pct}% de desconto', atCk: 'O código {code} é aplicado na página de pagamento.', tax: 'Os impostos do seu país são calculados na página de pagamento.', cancel: 'Renova automaticamente a cada período até você cancelar; cancele quando quiser pela sua conta.', legal: 'Ao continuar você aceita os <a href="/terminos" target="_blank" rel="noopener">Termos</a> e a política de <a href="/reembolsos" target="_blank" rel="noopener">cancelamentos e reembolsos</a> (em espanhol).',
    later: 'Agora não', goMP: 'Continuar para o Mercado Pago', goLS: 'Continuar para o pagamento', opening: 'Abrindo a página de pagamento…', close: 'Fechar', seePlans: 'Ver a página de planos',
    hasSub: 'Você já tem o FilmSpirit {plan}. Gerencie ou cancele no botão da sua conta.', soon: 'Os pagamentos {where} abrem em breve.', wherePE: 'com Mercado Pago', whereIntl: 'internacionais',
    confirming: 'Confirmando sua assinatura…', welcome: 'Agora você tem o FilmSpirit {plan}!', thanks: 'Obrigado por assinar. Agora você pode ter {projects} projetos de produção ativos, com equipes de até {members} pessoas por projeto, e exportar sem marca-d\'água.', thanksSolo: 'Obrigado por assinar. Agora você pode levar seus roteiros para a produção ({projects} projetos ativos) e exportar sem marca-d\'água.', start: 'Começar',
    pending: 'O meio de pagamento ainda não confirmou sua assinatura. Se você a concluiu, ela será ativada em alguns minutos.',
    upPro: 'Passe para o Pro: {projects} projetos de produção e equipes de até {members} pessoas com permissões.', upStudio: 'Passe para o Studio: {projects} projetos de produção, até {members} pessoas por projeto e, só no Studio, os mapas nas locações e os cenários 3D importados.', choose: 'Escolher',
    sample: 'Nenhum plano tem teste grátis: para ver a produção, explore o projeto de exemplo.', explore: 'Explorar com um projeto de exemplo', yearly: 'O plano anual custa 10 meses.', down: 'Se você mudar para um plano menor, os projetos acima do limite ficam só para leitura: nada é apagado.',
    founderPE: '<b>Preço de fundador:</b> Pro por {m} por mês ({y} por ano) se você assinar antes de {date}, enquanto continuar assinando.', founderIntl: '<b>Preço de fundador:</b> {pct}% a menos em cada cobrança do Pro (código {code}) se você assinar antes de {date}.', founderTag: 'fundador',
  },
  fr: {
    all: 'Tout ce que comprend chaque offre', title: 'Offres FilmSpirit', you: 'Votre offre',
    rows: ['Scénarios', 'Coécriture', 'Projets de production actifs', 'Personnes par projet de production', 'Espace'],
    more: ['Éditeur de scénario et import (Final Draft, Fountain, PDF)', 'PDF du scénario sans filigrane', 'Dépouillement, casting, repérages, plan de travail, calendrier, feuille de service et budget', 'Storyboard 2D/3D et animatique', 'Photos et exports sans filigrane', 'Équipe avec permissions par poste', 'Cartes des repérages et décors 3D importés', 'Projets archivés'],
    unl: 'Illimités', people: '{n} personnes', solo: 'Vous seul', text: 'Texte seul', free: 'Gratuit',
    yes: 'Oui', from: 'Vous payez depuis', pe: 'Pérou · soles · Mercado Pago', intl: 'Autre pays · dollars · carte', plan: 'Offre', month: 'Mensuel', year: 'Annuel', perM: 'par mois', perY: 'par an', code: 'Code de réduction', opt: 'Facultatif', apply: 'Appliquer', mpMail: 'E-mail de votre compte Mercado Pago', mail: 'Votre e-mail (pour le reçu)',
    today: '<b>Prélevé aujourd\'hui.</b>',
    pay: 'Vous payez {amount} {per}', firstYear: 'la première année', during: 'pendant {n} mois', then: 'puis {base}', off: '{pct} % de réduction', atCk: 'Le code {code} s\'applique sur la page de paiement.', tax: 'Les taxes de votre pays sont calculées sur la page de paiement.', cancel: 'Renouvellement automatique à chaque période jusqu\'à résiliation ; résiliable à tout moment depuis votre compte.', legal: 'En continuant, vous acceptez les <a href="/terminos" target="_blank" rel="noopener">Conditions</a> et la politique d\'<a href="/reembolsos" target="_blank" rel="noopener">annulation et de remboursement</a> (en espagnol).',
    later: 'Plus tard', goMP: 'Continuer vers Mercado Pago', goLS: 'Continuer vers le paiement', opening: 'Ouverture de la page de paiement…', close: 'Fermer', seePlans: 'Voir la page des offres',
    hasSub: 'Vous avez déjà FilmSpirit {plan}. Gérez-le ou résiliez-le depuis le bouton de votre compte.', soon: 'Les paiements {where} ouvrent très bientôt.', wherePE: 'avec Mercado Pago', whereIntl: 'internationaux',
    confirming: 'Confirmation de votre abonnement…', welcome: 'Vous avez maintenant FilmSpirit {plan} !', thanks: 'Merci pour votre abonnement. Vous pouvez gérer {projects} projets de production actifs, avec des équipes jusqu\'à {members} personnes par projet, et exporter sans filigrane.', thanksSolo: 'Merci pour votre abonnement. Vous pouvez passer vos scénarios en production ({projects} projets actifs) et exporter sans filigrane.', start: 'Commencer',
    pending: 'Le moyen de paiement n\'a pas encore confirmé votre abonnement. Si vous l\'avez finalisé, il s\'activera dans quelques minutes.',
    upPro: 'Passez à Pro : {projects} projets de production et des équipes jusqu\'à {members} personnes avec permissions.', upStudio: 'Passez à Studio : {projects} projets de production, jusqu\'à {members} personnes par projet et, uniquement dans Studio, les cartes des repérages et les décors 3D importés.', choose: 'Choisir',
    sample: 'Aucune offre n\'a d\'essai gratuit : pour voir la production, explorez le projet d\'exemple.', explore: 'Explorer avec un projet d\'exemple', yearly: 'L\'offre annuelle coûte 10 mois.', down: 'Si vous changez pour une offre inférieure, les projets au-delà de la limite passent en lecture seule : rien n\'est supprimé.',
    founderPE: '<b>Prix fondateur :</b> Pro à {m} par mois ({y} par an) si vous vous abonnez avant le {date}, tant que vous restez abonné.', founderIntl: '<b>Prix fondateur :</b> {pct} % de moins sur chaque prélèvement Pro (code {code}) si vous vous abonnez avant le {date}.', founderTag: 'fondateur',
  },
  it: {
    all: 'Tutto ciò che include ogni piano', title: 'Piani di FilmSpirit', you: 'Il tuo piano',
    rows: ['Sceneggiature', 'Co-scrittura', 'Progetti di produzione attivi', 'Persone per progetto di produzione', 'Spazio'],
    more: ['Editor di sceneggiatura e importazione (Final Draft, Fountain, PDF)', 'PDF della sceneggiatura senza filigrana', 'Spoglio, casting, sopralluoghi, piano di lavorazione, calendario, ordine del giorno e budget', 'Storyboard 2D/3D e animatic', 'Foto ed esportazioni senza filigrana', 'Troupe con permessi per reparto', 'Mappe dei sopralluoghi e scenografie 3D importate', 'Progetti archiviati'],
    unl: 'Senza limiti', people: '{n} persone', solo: 'Solo tu', text: 'Solo testo', free: 'Gratis',
    yes: 'Sì', from: 'Paghi da', pe: 'Perù · soles · Mercado Pago', intl: 'Altro paese · dollari · carta', plan: 'Piano', month: 'Mensile', year: 'Annuale', perM: 'al mese', perY: 'all\'anno', code: 'Codice sconto', opt: 'Facoltativo', apply: 'Applica', mpMail: 'Email del tuo account Mercado Pago', mail: 'La tua email (per la ricevuta)',
    today: '<b>Addebito oggi.</b>',
    pay: 'Paghi {amount} {per}', firstYear: 'il primo anno', during: 'per {n} mesi', then: 'poi {base}', off: '{pct}% di sconto', atCk: 'Il codice {code} si applica nella pagina di pagamento.', tax: 'Le tasse del tuo paese vengono calcolate nella pagina di pagamento.', cancel: 'Si rinnova automaticamente a ogni periodo finché non disdici; disdici quando vuoi dal tuo account.', legal: 'Continuando accetti i <a href="/terminos" target="_blank" rel="noopener">Termini</a> e la politica di <a href="/reembolsos" target="_blank" rel="noopener">disdetta e rimborsi</a> (in spagnolo).',
    later: 'Non ora', goMP: 'Continua su Mercado Pago', goLS: 'Continua al pagamento', opening: 'Apertura della pagina di pagamento…', close: 'Chiudi', seePlans: 'Vedi la pagina dei piani',
    hasSub: 'Hai già FilmSpirit {plan}. Gestiscilo o disdicilo dal pulsante del tuo account.', soon: 'I pagamenti {where} aprono molto presto.', wherePE: 'con Mercado Pago', whereIntl: 'internazionali',
    confirming: 'Conferma dell\'abbonamento…', welcome: 'Ora hai FilmSpirit {plan}!', thanks: 'Grazie per l\'abbonamento. Ora puoi gestire {projects} progetti di produzione attivi, con troupe fino a {members} persone per progetto, ed esportare senza filigrana.', thanksSolo: 'Grazie per l\'abbonamento. Ora puoi portare le tue sceneggiature in produzione ({projects} progetti attivi) ed esportare senza filigrana.', start: 'Inizia',
    pending: 'Il metodo di pagamento non ha ancora confermato l\'abbonamento. Se lo hai completato, si attiverà tra pochi minuti.',
    upPro: 'Passa a Pro: {projects} progetti di produzione e troupe fino a {members} persone con permessi.', upStudio: 'Passa a Studio: {projects} progetti di produzione, fino a {members} persone per progetto e, solo in Studio, le mappe dei sopralluoghi e le scenografie 3D importate.', choose: 'Scegli',
    sample: 'Nessun piano ha una prova gratuita: per vedere la produzione, esplora il progetto di esempio.', explore: 'Esplora con un progetto di esempio', yearly: 'Il piano annuale costa 10 mesi.', down: 'Se passi a un piano inferiore, i progetti oltre il limite restano in sola lettura: non si cancella nulla.',
    founderPE: '<b>Prezzo fondatore:</b> Pro a {m} al mese ({y} all\'anno) se ti abboni prima del {date}, finché resti abbonato.', founderIntl: '<b>Prezzo fondatore:</b> {pct}% in meno su ogni addebito di Pro (codice {code}) se ti abboni prima del {date}.', founderTag: 'fondatore',
  },
};
const T$ = (k, v = {}) => { const x = (PAY_TX[PAY_LANG] || PAY_TX.es)[k] ?? PAY_TX.es[k] ?? k; return typeof x === 'string' ? x.replace(/\{(\w+)\}/g, (m, y) => v[y] ?? m) : x; };
const LOCALE = { es: 'es-PE', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', it: 'it-IT' }[PAY_LANG];

/* ---------- suscripción (datos del servidor) ---------- */
let BILL = null;
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })();
async function billInfo(force) {
  if (BILL && !force) return BILL;
  try { BILL = (await apiFetch('GET', '/api/billing?tz=' + encodeURIComponent(TZ))).json; } catch (e) { BILL = null; }
  return BILL;
}
const fdate = t => t ? new Date(t).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const payMoney = (n, cur) => (cur === 'USD' ? 'US$ ' : 'S/ ') + (Number.isInteger(+n) ? +n : (+n).toFixed(2).replace('.', PAY_LANG === 'en' ? '.' : ','));
const soles = n => payMoney(n, 'PEN');
/* región de pago: la elegida a mano o la que detectó el servidor (zona horaria, país) */
const payRegion = B => { const r = ls.get('payRegion', ''); return r === 'pe' || r === 'intl' ? r : (B && B.region) || (TZ === 'America/Lima' ? 'pe' : 'intl'); };
/* qué plan ofrecer a continuación: Guion → Pro, Indie → Pro, Pro → Studio (lote AD: sin prueba gratis) */
const nextPlan = plan => plan === 'pro' || plan === 'studio' ? 'studio' : 'pro';
async function accountMenu(anchor) {
  const me = APITEAM.me, B = await billInfo(true);
  const sub = B && B.sub;
  const pn = PLAN_NAMES[me.plan] || PLAN_NAMES.free, L = me.limits || {};
  const st = sub ? (sub.status === 'paused' ? `Cobro en pausa por días de regalo hasta el ${fdate(sub.resume)}`
    : sub.status === 'cancelled' ? `Suscripción cancelada · ${pn} hasta el ${fdate(me.proUntil)}`
      : `${PLAN_NAMES[sub.plan] || 'Pro'} ${sub.cycle === 'year' ? 'anual' : 'mensual'} · ${payMoney(sub.amount, sub.currency)} · próximo cobro el ${fdate(sub.next)}`)
    : me.plan !== 'free' ? (me.proUntil && me.proUntil < 4e12 ? `${pn} de regalo hasta el ${fdate(me.proUntil)}` : `${pn} activo`)
      : `Plan gratuito · guiones y coescritura con hasta ${L.writers || 4} personas`;
  const arch = me.archived ? ` · ${me.archived} archivado${me.archived === 1 ? '' : 's'}` : '';
  const used = me.plan === 'free' ? `${me.scripts || 0} de ${L.scripts} guiones activos${arch}`
    : `${me.own} de ${L.projects} ${L.projects === 1 ? 'proyecto de producción' : 'proyectos de producción'} · ${me.scripts || 0} ${me.scripts === 1 ? 'guion' : 'guiones'}${arch}`;
  // (lote AD) Studio siempre a la venta; a una cuenta gratis, los planes y el proyecto de ejemplo (no hay prueba gratis)
  const planBtn = me.plan === 'studio' && sub && sub.status !== 'cancelled' ? ''
    : sub && sub.status === 'cancelled' ? 'Elegir un plan'
      : me.plan === 'free' ? 'Ver planes de suscripción' : me.plan === 'indie' ? 'Pasar a Pro' : me.plan === 'pro' ? 'Pasar a Studio' : 'Elegir un plan';
  popover(anchor, `<h5>${esc(me.name)}</h5><p class="hint" style="margin:0 0 8px;word-break:break-all">${esc(me.email)}</p>
    <div class="acct-plan ${ea(me.plan)}"><b>FilmSpirit ${pn}</b><span class="hint">${esc(st)}</span><span class="hint">${esc(used)}</span></div>
    <div class="menu">${planBtn ? `<button data-a="plan">${esc(planBtn)}</button>` : ''}${me.plan === 'free' && !sub ? '<button data-a="sample">Explorar con un proyecto de ejemplo</button>' : ''}
      ${sub && sub.portal ? '<button data-a="portal">Recibos y medio de pago</button>' : ''}
      ${sub && sub.status === 'authorized' ? '<button data-a="cancel">Cancelar la suscripción…</button>' : ''}
      ${me.admin ? '<button data-a="admin">Panel de administración</button>' : ''}
      <button data-a="ia">Inteligencia artificial (Studio)…</button><button data-a="plans">Planes y precios</button><hr><button data-a="out">Cerrar sesión</button>
      <button data-a="outall">Cerrar sesión en todos los equipos</button><button data-a="del" class="danger">Eliminar mi cuenta…</button></div>`,
    p => p.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      closePop();
      const a = b.dataset.a;
      const PL = me.plans || PLAN_DEFAULTS;
      if (a === 'plan') licenseDialog(me.plan === 'indie' ? T$('upPro', PL.pro) : me.plan === 'pro' ? T$('upStudio', PL.studio) : '', nextPlan(me.plan));
      if (a === 'sample') sampleExplore();
      if (a === 'ia') iaSettings();
      if (a === 'portal') {
        if (sub.portal !== 'paddle') { window.open(sub.portal, '_blank', 'noopener'); return; }
        // Paddle: un enlace de un solo uso al portal del cliente (se abre la pestaña antes, para que el navegador no la bloquee)
        const w = window.open('about:blank', '_blank');
        try { const r = (await apiFetch('POST', '/api/billing/portal', {})).json; if (w) { w.opener = null; w.location.href = r.url; } else location.href = r.url; }
        catch (er) { if (w) w.close(); toast(er.message, 6000); }
      }
      if (a === 'admin') window.open('/admin', '_blank', 'noopener');
      if (a === 'plans') window.open('/#planes', '_blank', 'noopener');
      if (a === 'cancel') confirmBox('Cancelar la suscripción', `No se te cobrará más. Sigues con ${pn} hasta el ${esc(fdate(sub.next))}; después tu cuenta pasa al plan Guion (gratis) y no pierdes ningún proyecto: los de producción quedan en solo lectura.`, 'Cancelar suscripción', async () => {
        try { await apiFetch('POST', '/api/billing/cancel', {}); await APITEAM.refreshMe(); toast(`Suscripción cancelada. ${pn} sigue activo hasta el fin del periodo pagado.`, 6000); }
        catch (er) { toast(er.message, 6000); }
      });
      if (a === 'out' || a === 'outall') {
        if (dirty.size) await flushSave();
        const out = async () => {
          try { await apiFetch('POST', a === 'outall' ? '/api/auth/logout-all' : '/api/auth/logout', {}); } catch (er) { }
          await clearLocalData();
          location.href = '/';
        };
        // cambios hechos sin conexión que todavía no llegaron al servidor: al salir se borran de este navegador
        let pend = [];
        try { pend = await OFFLINE.pending(); } catch (er) { }
        if (pend.length) return confirmBox('Cambios sin enviar', `${pend.length === 1 ? 'Un proyecto tiene' : pend.length + ' proyectos tienen'} cambios hechos sin conexión que todavía no llegaron a tu cuenta: ${pend.slice(0, 3).map(r => '«' + esc(r.title || 'Sin título') + '»').join(', ')}. Si sales ahora, se pierden. Conéctate a internet y espera a que se guarden antes de salir.`, 'Salir igual', out);
        await out();
      }
      if (a === 'del') deleteAccountDialog();
    }));
}
/* eliminar la cuenta: se confirma escribiendo el correo */
async function deleteAccountDialog() {
  const me = APITEAM.me;
  let list = []; try { list = await Store.list(); } catch (e) { }
  const mine = list.filter(x => x.mine), team = mine.filter(x => x.shared).length;
  const B = await billInfo(true), sub = B && B.sub && B.sub.status !== 'cancelled' ? B.sub : null;
  const m = modal({
    title: 'Eliminar mi cuenta',
    body: `<p style="margin:0">Se eliminan tu cuenta y ${mine.length ? `<b>${mine.length === 1 ? 'tu proyecto' : `tus ${mine.length} proyectos`}</b>${team ? ` (${team === 1 ? 'uno es' : team + ' son'} de equipo: también ${team === 1 ? 'desaparece' : 'desaparecen'} para quienes ${team === 1 ? 'lo' : 'los'} usan)` : ''}` : 'todo lo que guardaste'}, con sus imágenes e historial. Sales de los proyectos de otras personas. No se puede deshacer.</p>
      ${sub ? `<p style="margin:0">Tu suscripción a FilmSpirit ${esc(PLAN_NAMES[sub.plan] || 'Pro')} se cancela ahora: no se te cobrará más.</p>` : ''}
      <p class="hint" style="margin:0">Antes, descarga lo que quieras conservar: Proyectos › ⋯ › Descargar ZIP o guardar .${esc(typeof PROJ_EXT !== 'undefined' ? PROJ_EXT : 'fsp')}. Los comprobantes de pago se conservan el tiempo que exige la ley.</p>
      <label class="fld"><span>Escribe <b>${esc(me.email)}</b> para confirmar</span><input type="email" id="delMail" autocomplete="off" spellcheck="false"></label>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn danger" id="delGo" disabled>Eliminar mi cuenta</button>',
  });
  const inp = $('#delMail', m), go = $('#delGo', m);
  inp.addEventListener('input', () => { go.disabled = inp.value.trim().toLowerCase() !== String(me.email).toLowerCase(); });
  go.onclick = async () => {
    go.disabled = true; go.textContent = 'Eliminando…';
    try {
      await apiFetch('POST', '/api/me/delete', { confirm: inp.value.trim() });
      dirty.clear();
      await clearLocalData();
      location.href = '/?cuenta=eliminada';
    } catch (e) { go.disabled = false; go.textContent = 'Eliminar mi cuenta'; toast(e.message, 7000); }
  };
}
/* planes y suscripción: Mercado Pago en el Perú (soles); fuera, Paddle (o Lemon Squeezy), en dólares */
async function licenseDialog(lead, want) {
  if (APITEAM.anon) return anonAsk('plan', () => licenseDialog(lead, want), lead);   // sin cuenta: primero la cuenta (lote AD)
  if (typeof OFFLINE !== 'undefined' && OFFLINE.on) { toast('Sin conexión: los planes se ven cuando vuelva internet.', 4000); return; }
  const me = APITEAM.me || { plan: 'free', limits: {} };
  const B = await billInfo(true);
  const PL = (B && B.plans) || me.plans || PLAN_DEFAULTS;
  const y = `<span class="pl-y">${T$('yes')}</span>`, n = '<span class="pl-n">—</span>';
  const KEYS = PLAN_KEYS;
  const gb = mb => mb >= 1000 ? Math.round(mb / 1000) + ' GB' : mb + ' MB';
  const R = T$('rows'), M = T$('more');
  const rows = [
    KEYS.map(k => PL[k].scripts == null ? T$('unl') : PL[k].scripts),
    KEYS.map(k => T$('people', { n: PL[k].writers || 4 })),
    KEYS.map(k => PL[k].projects ? PL[k].projects : n),
    KEYS.map(k => !PL[k].projects ? n : PL[k].members <= 1 ? T$('solo') : PL[k].members),
    KEYS.map(k => k === 'free' ? T$('text') : gb(PL[k].storageMB)),
  ];
  // (lote AD) lo exclusivo de Studio: los mapas en Scouting y los escenarios 3D importados (ya no «pronto»)
  const more = [[y, y, y, y], [y, y, y, y], [n, y, y, y], [n, y, y, y], [n, y, y, y], [n, n, y, y], [n, n, n, y], KEYS.map(k => PL[k].projects ? PL[k].archived : n)];
  const sub = B && B.sub && B.sub.status !== 'cancelled' ? B.sub : null;
  const subTier = sub ? PLAN_TIER[sub.plan || 'pro'] : 0;
  // con suscripción activa, solo planes mayores; sin ella, desde el plan actual (un plan de regalo o cancelado se puede contratar)
  const sell = ['indie', 'pro', 'studio'].filter(k => sub ? PLAN_TIER[k] > subTier : PLAN_TIER[k] >= (PLAN_TIER[me.plan] || 0));
  let plan = sell.includes(want) ? want : sell.includes('pro') ? 'pro' : sell[0] || 'studio', cycle = 'month', region = payRegion(B), q = null;
  const provOn = r => !!(B && B.providers && (r === 'pe' ? B.providers.mp : B.providers.ls));
  const canBuy = () => B && provOn(region) && PLAN_TIER[plan] > subTier;
  const cur = () => region === 'pe' ? 'PEN' : 'USD';
  const F = B && B.founder;
  const listOf = (pl, cy) => B ? B.prices[cur()][pl][cy] : 0;
  const founderOf = (pl, cy) => !F || pl !== 'pro' ? null : region === 'pe' ? (F.PEN && F.PEN[cy]) || null : B.intl === 'paddle' ? Math.round(listOf(pl, cy) * (100 - F.pct)) / 100 : null;
  const priceOf = (pl, cy) => { if (!B) return ''; const f = founderOf(pl, cy), l = listOf(pl, cy); return f != null && f < l ? `<s>${esc(payMoney(l, cur()))}</s> ${esc(payMoney(f, cur()))}` : esc(payMoney(l, cur())); };
  const notes = () => [
    F ? (region === 'pe' ? T$('founderPE', { m: payMoney(F.PEN.month, 'PEN'), y: payMoney(F.PEN.year, 'PEN'), date: fdate(F.until) }) : B.intl === 'paddle' ? T$('founderIntl', { pct: F.pct, code: esc(F.code), date: fdate(F.until) }) : '') : '',
    // sin prueba gratis: para ver la producción, el proyecto de ejemplo (a una cuenta gratis, con su botón)
    esc(T$('sample')) + (me.plan === 'free' ? ` <button type="button" class="linkbtn pl-sample" id="plSample">${esc(T$('explore'))}</button>` : ''), esc(T$('yearly')), esc(T$('down')),
  ].filter(Boolean).map(x => `<li>${x}</li>`).join('');
  const m = modal({
    title: T$('title'), wide: true,
    body: `<div class="pl-logo">${logoSVG(me.plan === 'free' ? 'pro' : me.plan, 'big')}</div>${lead ? `<p style="margin:0"><b>${esc(lead)}</b></p>` : ''}
      <div class="team-wrap plan-wrap"><table class="plan-t pl4"><thead><tr><th></th>${KEYS.map(k => `<th${k === me.plan ? ' class="pl-you" title="' + ea(T$('you')) + '"' : ''}>${esc(PLAN_NAMES[k])}</th>`).join('')}</tr></thead><tbody>
      ${R.map((r, i) => `<tr><td>${esc(r)}</td>${rows[i].map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
      <tr class="pl-price"><td></td><td>${esc(T$('free'))}</td><td id="plPindie"></td><td id="plPpro"></td><td id="plPstudio"></td></tr>
      </tbody></table>
      <details class="pl-more"><summary>${esc(T$('all'))}</summary><table class="plan-t pl4"><tbody>${M.map((r, i) => `<tr><td>${esc(r)}</td>${more[i].map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></details></div>
      <ul class="pl-notes">${notes()}</ul>
      ${!sell.length ? `<p class="hint" style="margin:0">${esc(T$('hasSub', { plan: PLAN_NAMES[sub.plan] || 'Studio' }))}</p>` : `<div class="buy">
        <div class="buy-region"><span class="hint">${T$('from')}</span><div class="seg" role="radiogroup" aria-label="${esc(T$('from'))}">
          <button type="button" data-rg="pe" role="radio">${esc(T$('pe'))}</button><button type="button" data-rg="intl" role="radio">${esc(T$('intl'))}</button></div></div>
        <div class="buy-cycle buy-plan pl${sell.length}" role="radiogroup" aria-label="${esc(T$('plan'))}">
          ${sell.map(k => `<button type="button" data-pl="${k}" role="radio"><b>${esc(PLAN_NAMES[k])}</b><span id="bp_${k}"></span></button>`).join('')}
        </div>
        <div class="buy-pay">
        <div class="buy-cycle" role="radiogroup" aria-label="${esc(T$('month'))} / ${esc(T$('year'))}">
          <button type="button" data-cy="month" role="radio"><b>${T$('month')}</b><span id="bcM"></span></button>
          <button type="button" data-cy="year" role="radio"><b>${T$('year')}</b><span id="bcY"></span></button>
        </div>
        <div class="buy-row"><label class="fld"><span>${T$('code')}</span><input type="text" id="byCode" value="${esc((B && B.promo) || '')}" placeholder="${esc(T$('opt'))}" autocomplete="off" autocapitalize="characters" spellcheck="false"></label><button class="btn" type="button" id="byApply">${T$('apply')}</button></div>
        <label class="fld"><span id="byMailL"></span><input type="email" id="byMail" value="${esc(me.email || '')}" autocomplete="email"></label>
        <p class="buy-sum" id="bySum"></p>
        </div>
      </div>`}`,
    foot: `<button class="btn" data-close>${T$('later')}</button><button class="btn" id="plGo">${T$('seePlans')}</button><button class="btn primary" id="byGo">${T$('goMP')}</button>`,
  });
  $('#plGo', m).onclick = () => window.open('/#planes', '_blank', 'noopener');
  const smp = $('#plSample', m); if (smp) smp.onclick = () => sampleExplore();
  const sum = $('#bySum', m), go = $('#byGo', m);
  const paintPrices = () => ['indie', 'pro', 'studio'].forEach(k => { const c = $('#plP' + k, m); if (c) c.innerHTML = priceOf(k, 'month'); });
  if (!$('.buy', m)) { go.hidden = true; paintPrices(); return; }
  const paint = () => {
    $$('[data-rg]', m).forEach(x => { x.setAttribute('aria-pressed', x.dataset.rg === region); x.setAttribute('aria-checked', x.dataset.rg === region); });
    $$('[data-pl]', m).forEach(x => { x.classList.toggle('on', x.dataset.pl === plan); x.setAttribute('aria-checked', x.dataset.pl === plan); });
    $$('[data-cy]', m).forEach(x => { x.classList.toggle('on', x.dataset.cy === cycle); x.setAttribute('aria-checked', x.dataset.cy === cycle); });
    const per = cycle === 'year' ? T$('perY') : T$('perM');
    for (const k of sell) { const s = $('#bp_' + k, m); if (s) s.innerHTML = priceOf(k, cycle) + ' ' + esc(per); }
    paintPrices();
    $('#bcM', m).innerHTML = priceOf(plan, 'month') + ' ' + esc(T$('perM')); $('#bcY', m).innerHTML = priceOf(plan, 'year') + ' ' + esc(T$('perY'));
    $('#byMailL', m).textContent = region === 'pe' ? T$('mpMail') : T$('mail');
    // con Paddle se paga siempre con el correo de la cuenta (el servidor no acepta otro): el campo no hace falta
    $('#byMail', m).closest('.fld').hidden = region === 'intl' && !!B && B.intl === 'paddle';
    go.textContent = region === 'pe' ? T$('goMP') : T$('goLS');
    go.disabled = !canBuy();
    if (!provOn(region)) sum.innerHTML = esc(T$('soon', { where: region === 'pe' ? T$('wherePE') : T$('whereIntl') }));
  };
  const show = () => {
    if (!q || !provOn(region)) return paint();
    const per = cycle === 'year' ? T$('perY') : T$('perM'), c = q.currency;
    const parts = [T$('today')];   // sin prueba gratis: se cobra al suscribirse
    let pay = T$('pay', { amount: payMoney(q.amount, c), per: q.pct && q.cycles && cycle === 'year' ? T$('firstYear') : per });
    if (q.founder && q.amount < q.list) pay += ` (${esc(T$('founderTag'))}${q.pct ? ' · ' + T$('off', { pct: q.pct }) : ''})`;
    else if (q.pct) pay += ` (${T$('off', { pct: q.pct })}${q.label ? ' · ' + esc(q.label) : ''})${q.cycles && cycle === 'month' ? ' ' + T$('during', { n: q.cycles }) : ''}${q.cycles ? ', ' + T$('then', { base: payMoney(q.base, c) }) : ''}`;
    parts.push(pay + '.');
    if (q.atCheckout && q.code) parts.push(esc(T$('atCk', { code: q.code })));
    if (region === 'intl') parts.push(esc(T$('tax')));
    parts.push(esc(T$('cancel')), T$('legal'));   // legal: texto propio con enlaces, sin datos de quien compra
    sum.innerHTML = parts.join(' ');
    paint();
  };
  const quote = async () => {
    if (!provOn(region)) { q = null; return paint(); }
    const code = $('#byCode', m).value.trim();
    try { q = (await apiFetch('POST', '/api/billing/quote', { plan, cycle, code, region })).json; show(); return true; }
    catch (e) {
      if (code) { toast(e.message, 5000); $('#byCode', m).value = ''; }
      try { q = (await apiFetch('POST', '/api/billing/quote', { plan, cycle, region })).json; show(); } catch (e2) { q = null; paint(); }
      return false;
    }
  };
  m.addEventListener('click', e => {
    const rg = e.target.closest('[data-rg]'); if (rg) { region = rg.dataset.rg; ls.set('payRegion', region); quote(); return; }
    const pl = e.target.closest('[data-pl]'); if (pl) { plan = pl.dataset.pl; quote(); return; }
    const cy = e.target.closest('[data-cy]'); if (cy) { cycle = cy.dataset.cy; quote(); }
  });
  $('#byApply', m).onclick = () => quote().then(ok => { if (ok && $('#byCode', m).value.trim()) toast('✓'); });
  $('#byCode', m).addEventListener('keydown', e => { if (e.key === 'Enter') $('#byApply', m).click(); });
  paint(); quote();
  go.onclick = async () => {
    go.disabled = true; go.textContent = T$('opening');
    try {
      if (dirty.size) await flushSave();
      const r = (await apiFetch('POST', '/api/billing/checkout', { plan, cycle, region, code: q && q.code || '', email: $('#byMail', m).value.trim() })).json;
      // 409 (ya tiene ese plan) llega como respuesta, no como error
      if (!r || !r.url) throw new Error((r && r.error) || 'No se pudo abrir el pago.');
      location.href = r.url;
    } catch (e) { go.disabled = false; paint(); toast(e.message, 6000); }
  };
}
/* volver del pago: se confirma la suscripción con el servidor */
// se lee al cargar: abrir el proyecto reescribe la dirección
const PAGO_SID = (() => { try { return new URLSearchParams(location.search).get('pago'); } catch (e) { return null; } })();
async function apiPaymentReturn() {
  const sid = PAGO_SID;
  if (!sid || !/^[\w-]{4,40}$/.test(sid)) return;
  try { const u = new URL(location.href); u.searchParams.delete('pago'); u.searchParams.delete('preapproval_id'); history.replaceState(null, '', u.pathname + u.search); } catch (e) { }
  toast(T$('confirming'), 4000);
  for (let i = 0; i < 12; i++) {
    try {
      const me = (await apiFetch('POST', '/api/billing/sync', { sid })).json;
      if (me.plan !== 'free') {
        APITEAM.setMe(me); BILL = null;
        if (APITEAM.pid) APITEAM.check(APITEAM.pid);
        const pn = PLAN_NAMES[me.plan];
        // al cerrar: si venía de «Llevar a producción», se hace ahora
        modal({ title: T$('welcome', { plan: pn }), body: `<div class="pl-logo">${logoSVG(me.plan, 'big')}</div><p style="margin:0">${esc(T$(me.limits.members > 1 ? 'thanks' : 'thanksSolo', { projects: me.limits.projects, members: me.limits.members }))}</p>`, foot: `<button class="btn primary" data-close>${T$('start')}</button>`, onClose: () => { if (typeof produceAfterPay === 'function') setTimeout(produceAfterPay, 0); } });
        return;
      }
    } catch (e) { }
    await new Promise(r => setTimeout(r, 3000));
  }
  toast(T$('pending'), 8000);
}
/* llegó al límite del plan: el mensaje depende de si es un guion o un proyecto de producción */
function freeLimitNotice(kind, msg) {
  const me = APITEAM.me || { plan: 'free', limits: PLAN_DEFAULTS.free };
  const L = me.limits, k = kind || (me.plan === 'free' ? 'guion' : 'prod');
  const text = msg || (k === 'guion' ? `El plan Guion permite ${L.scripts} guiones activos. Archiva uno que terminaste o pasa a Indie, Pro o Studio (guiones sin límite).`
    : me.plan === 'free' ? 'Los proyectos de producción (desglose, storyboard, plan de rodaje, calendario, hoja de llamado y presupuesto) son de Indie, Pro y Studio. Para conocerlos sin pagar, explora el proyecto de ejemplo.'
      : me.plan === 'indie' ? `Tu plan Indie permite ${L.projects} proyectos de producción activos. Archiva uno que ya no uses o pasa a Pro (${(me.plans && me.plans.pro.projects) || 7}).`
        : me.plan === 'pro' ? `Tu plan Pro permite ${L.projects} proyectos de producción activos. Archiva uno que ya no uses o pasa a Studio (${(me.plans && me.plans.studio.projects) || 20}).`
          : `Tu plan permite ${L.projects} proyectos de producción activos a la vez. Archiva uno que ya no uses.`);
  if (me.plan === 'studio') { modal({ title: 'Proyectos activos', body: `<p style="margin:0">${esc(text)}</p>`, foot: '<button class="btn primary" data-close>Entendido</button>' }); return; }
  licenseDialog(text, k === 'guion' && me.plan === 'free' ? 'indie' : nextPlan(me.plan));
}
function planNotice(msg, pro) { if (pro) licenseDialog(msg, nextPlan((APITEAM.me || {}).plan)); else toast(msg, 6000); }

/* ---------- la sesión venció: se vuelve a entrar sin perder lo que no se guardó ---------- */
let REAUTH = false;
async function loadGIS() {
  if (window.google && google.accounts && google.accounts.id) return google.accounts.id;
  await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  return google.accounts.id;
}
async function reauthDialog() {
  if (REAUTH) return;
  REAUTH = true;
  const m = modal({
    title: 'Vuelve a entrar',
    body: `<p style="margin:0">Tu sesión terminó. Entra otra vez con tu cuenta de Google para seguir guardando: lo que no se guardó sigue aquí.</p><div id="gisBox" class="gis-box"><span class="hint">Cargando el botón de Google…</span></div><p class="hint" id="gisErr" style="margin:0;color:var(--bad)" hidden></p>`,
    onClose: () => { REAUTH = false; },
  });
  try {
    const cfg = await fetch('/api/config').then(r => r.json());
    const id = await loadGIS();
    id.initialize({
      client_id: cfg.googleClientId, ux_mode: 'popup', auto_select: true, use_fedcm_for_prompt: true,
      callback: async resp => {
        const r = await fetch('/api/auth/google', { method: 'POST', credentials: 'same-origin', headers: { 'X-FS': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: resp.credential }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { const er = $('#gisErr', m); if (er) { er.textContent = j.error || 'No se pudo entrar.'; er.hidden = false; } return; }
        if (APITEAM.me && j.me.id !== APITEAM.me.id) { await clearLocalData(); location.href = '/app/'; return; }   // otra cuenta: se empieza de nuevo, sin los datos de la anterior
        closeModal(); toast('Listo, seguimos guardando.');
        APITEAM.setMe(j.me);
        if (APITEAM.pid && !APITEAM.es) APITEAM.check(APITEAM.pid);
        saveErr = ''; saveSoon();
      },
    });
    const box = $('#gisBox', m); if (!box) return;
    box.innerHTML = '';
    // el iframe de Google es claro: con color-scheme light no le queda un recuadro blanco en modo oscuro
    box.style.colorScheme = 'light';
    const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    id.renderButton(box, { theme: dark ? 'filled_black' : 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: 'es' });
  } catch (e) {
    const box = $('#gisBox', m); if (box) box.innerHTML = '<a class="btn primary" href="/entrar?next=/app/" target="_blank" rel="noopener">Entrar en otra pestaña</a>';
  }
}

/* ---------- (lote AD) sin cuenta: el ejemplo desde la portada (/app/?ejemplo=1, share-api.js · SAMPLE_ASK) ----------
   Se explora el ejemplo sin entrar; guardar, crear, importar, compartir o ver los planes piden una cuenta. Se entra con
   Google aquí mismo, como cuando vence la sesión (reauthDialog): el ejemplo sigue en pantalla con lo que cambiaste y lo
   que se pidió (guardar el ejemplo, crear un proyecto, ver los planes) sigue al entrar, con el límite del plan de la
   cuenta. Si el botón de Google no carga, se entra en la página de siempre (/entrar) */
const ANON_WHY = {
  save: 'Para guardar tus cambios en el ejemplo necesitas una cuenta.', new: 'Para crear un proyecto necesitas una cuenta.',
  import: 'Para importar tu guion necesitas una cuenta.', share: 'Para compartir un proyecto con tu equipo necesitas una cuenta.',
};
let ANON_GO = null;   // lo que se pidió hacer antes de entrar: se hace al entrar
function anonButton() {
  if ($('#anonBtn')) return;
  const b = document.createElement('button'); b.type = 'button'; b.id = 'anonBtn'; b.className = 'btn tb-btn anon-btn';
  b.title = 'Para guardar tus cambios y crear tus proyectos'; b.setAttribute('aria-label', 'Crear cuenta gratis');
  b.innerHTML = '<span class="hide-sm">Crear cuenta gratis</span><span class="only-sm">Crear cuenta</span>';
  b.onclick = () => anonAsk('');
  $('.topbar').appendChild(b);
  document.body.classList.add('anon');
}
async function anonAsk(what, then, lead) {
  if (!APITEAM.anon) { if (then) then(); return; }
  ANON_GO = then || null;
  if ($('#modal.anon-m')) return;
  const why = lead || ANON_WHY[what] || 'Con una cuenta guardas tus guiones y proyectos, y trabajas con tu equipo.';
  const m = modal({
    title: 'Crea tu cuenta gratis',
    body: `<p style="margin:0"><span>${esc(why)}</span> <span>${what === 'save' ? 'Es gratis: entras con tu cuenta de Google y el ejemplo, con tus cambios, se guarda como un proyecto tuyo.' : 'Es gratis: entras con tu cuenta de Google, y lo que cambiaste en el ejemplo sigue aquí.'}</span></p>
      <div id="anonGis" class="gis-box"><span class="hint">Cargando el botón de Google…</span></div><p class="hint" id="anonErr" style="margin:0;color:var(--bad)" hidden></p>
      <p class="hint" style="margin:0">El plan Guion es gratis: hasta 5 guiones, con coescritura. <a href="/#planes" target="_blank" rel="noopener">Ver los planes</a></p>`,
    foot: '<button class="btn" data-close>Seguir explorando</button>',
    onClose: () => { ANON_GO = null; },
  });
  m.classList.add('anon-m');
  const err = t => { const e = $('#anonErr', m); if (e) { e.textContent = t; e.hidden = !t; } };
  try {
    const cfg = await fetch('/api/config').then(r => r.json());   // público: el id de cliente de Google
    const id = await loadGIS();
    id.initialize({
      client_id: cfg.googleClientId, ux_mode: 'popup', use_fedcm_for_prompt: true, context: 'signup',
      callback: async resp => {
        let ref = ''; try { ref = localStorage.getItem('fs_ref') || ''; } catch (e) { }
        let r, j = {};
        try {
          r = await fetch('/api/auth/google', { method: 'POST', credentials: 'same-origin', headers: { 'X-FS': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: resp.credential, ref, tz: TZ }) });
          j = await r.json().catch(() => ({}));
        } catch (e) { err('Sin conexión con el servidor. Revisa tu internet.'); return; }
        if (!r.ok || !j.me) { err(j.error || 'No se pudo entrar.'); return; }
        await anonIn(j);
      },
    });
    const box = $('#anonGis', m); if (!box) return;
    box.innerHTML = ''; box.style.colorScheme = 'light';
    const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    id.renderButton(box, { theme: dark ? 'filled_black' : 'outline', size: 'large', text: 'signup_with', shape: 'pill', locale: EN ? 'en' : 'es' });
  } catch (e) {
    const box = $('#anonGis', m); if (box) box.innerHTML = '<a class="btn primary" href="/entrar?next=/app/">Entrar con Google</a>';
  }
}
/* entró: la app sigue como cualquier sesión, con el ejemplo y sus cambios en pantalla */
async function anonIn(j) {
  const go = ANON_GO; ANON_GO = null;   // (antes de cerrar la ventana, que lo olvida)
  try { localStorage.removeItem('fs_ref'); } catch (e) { }
  // otra cuenta usó antes este navegador: lo guardado aquí para ella se borra (como en reauthDialog)
  const prev = ls.get('me', null); if (prev && prev.id && prev.id !== j.me.id) await clearLocalData();
  APITEAM.anon = false;
  // sin recargar por el idioma de la cuenta (langFromAccount): el ejemplo vive en la memoria de esta página
  APITEAM.setMe(j.me, true); try { localStorage.setItem('filmspirit:me', JSON.stringify(j.me)); } catch (e) { }
  const b = $('#anonBtn'); if (b) b.remove();
  document.body.classList.remove('anon');
  apiUrl(null);   // recargar ya no vuelve al ejemplo sin cuenta
  closeModal();
  toast(j.isNew ? '¡Listo! Ya tienes tu cuenta de FilmSpirit.' : 'Listo: entraste con tu cuenta.', 4000);
  if (typeof refreshProjCount === 'function') refreshProjCount();
  setSaveState();
  if (go) setTimeout(go, 60);
}

/* ---------- invitaciones ---------- */
function inviteTextApi(x) {
  const tabs = secListAll().filter(([s]) => x.perms && x.perms[s]).map(([s, n]) => `${n} (${x.perms[s] === 'editar' ? 'editar' : 'ver'})`).join(', ');
  return `Hola:\n\nTe sumé al proyecto «${SHARE.title || P.meta.title}» en FilmSpirit.${tabs ? '\nTienes acceso a: ' + tabs + '.' : ''}\n\nEntra aquí con tu cuenta de Google ${x.email}:\n${apiLink(SHARE.pid)}\n\nSi aún no tienes cuenta, se crea sola al entrar (es gratis).`;
}
function invitationsDialog(list) {
  const m = modal({
    title: 'Envía las invitaciones', wide: true,
    body: `<p style="margin:0">Cada persona entra con su cuenta de Google y ve solo lo que le asignaste. Copia la invitación y envíasela por WhatsApp o correo.</p>
      ${list.map((x, i) => `<div class="pw-row"><div><b>${esc(x.name && x.name !== x.email ? x.name : x.email)}</b><span class="hint">${esc(x.email)}${x.pending ? ' · aún no tiene cuenta' : ''}</span></div><button class="btn sm" data-inv="${i}">Copiar invitación</button></div>`).join('')}
      <div class="pw-row"><div><b>Enlace del proyecto</b><span class="hint" style="word-break:break-all">${esc(apiLink(SHARE.pid))}</span></div><button class="btn sm" data-link>Copiar enlace</button></div>`,
    foot: '<button class="btn primary" data-close>Listo</button>',
  });
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-inv],[data-link]'); if (!b) return;
    const txt = b.hasAttribute('data-link') ? apiLink(SHARE.pid) : inviteTextApi({ ...list[+b.dataset.inv], perms: (SHARE.members.find(x => x.email === list[+b.dataset.inv].email) || {}).perms });
    navigator.clipboard.writeText(txt).then(() => toast('Copiado'), () => toast('No se pudo copiar'));
  });
}
/* abrir un enlace de un proyecto al que no tengo acceso */
function noAccessDialog(pid, msg) {
  const me = APITEAM.me;
  const m = modal({
    title: 'Sin acceso a este proyecto',
    body: `<p style="margin:0">${esc(msg || 'No tienes acceso a este proyecto.')}</p><p class="hint" style="margin:0">Entraste como <b>${esc(me.email)}</b>. Si producción te invitó con otro correo, cierra sesión y entra con esa cuenta de Google.</p>`,
    foot: `<button class="btn" data-close>Cerrar</button><button class="btn primary" id="naReq">Pedir acceso a producción</button>`,
  });
  $('#naReq', m).onclick = async () => {
    const b = $('#naReq', m); b.disabled = true;
    try { await APITEAM.requestAccess(pid); b.textContent = 'Pedido enviado'; toast('Producción verá tu pedido en Equipo y permisos.', 5000); }
    catch (e) { b.disabled = false; toast(e.message, 5000); }
  };
}
/* el ejemplo se guarda en la cuenta solo si la persona lo pide */
/* botón Compartir: el proyecto tiene que existir en el servidor */
async function apiShare(anchor) {
  if (!P) return;
  if (APITEAM.anon) return anonAsk('share');   // sin cuenta (lote AD)
  if (P._sample && !P._saved) return confirmBox('Compartir', 'Este es el proyecto de ejemplo. Para compartirlo, primero guárdalo como un proyecto tuyo.', 'Guardar como mi proyecto', adoptSample, false);
  if (P._blocked) return freeLimitNotice(P._kind);
  if (!P._shared) {
    try { await APITEAM.ensureCreated(P); }
    catch (e) {
      if (PLAN_LIMIT_CODES.has(e.code)) { P._blocked = true; setSaveState(); return freeLimitNotice(e.data && e.data.kind, e.message); }
      toast(e.message || 'No se pudo guardar el proyecto.', 5000); return;
    }
  }
  if (SHARE && SHARE.admin) return teamDialog();
  return teamPanel(anchor);
}
/* proyecto en solo lectura: archivado, o con más proyectos activos de los que permite el plan */
function planBanner() {
  const on = !!(SHARE && P && SHARE.pid === P.id && SHARE.ro);
  const kind = on ? (SHARE.archived ? 'arch' : 'plan') : '';
  let b = $('.banner.plan');
  if (b && b.dataset.k !== kind) { b.remove(); b = null; }
  if (!kind) return;
  if (b) return;
  b = document.createElement('div');
  b.className = 'banner plan'; b.dataset.k = kind;
  b.innerHTML = kind === 'arch'
    ? (SHARE.admin ? 'Proyecto archivado: solo lectura. Puedes verlo, exportarlo y descargarlo en ZIP. <button class="btn sm" data-b="unarch">Desarchivar</button> <button class="btn sm" data-b="zip">Descargar ZIP</button>'
      : 'Proyecto archivado por producción: solo lectura.')
    : SHARE.admin
      ? (SHARE.kind !== 'guion' && !(SHARE.limits && SHARE.limits.projects)
        // plan Guion con un proyecto de producción (de antes, o al terminar la suscripción)
        // (lote AD) sin prueba gratis: los planes y, al lado, el proyecto de ejemplo con todas sus pestañas
        ? 'Solo lectura: los proyectos de producción son de Indie, Pro y Studio. Puedes verlo, exportarlo y descargarlo; tus datos siguen aquí. <button class="btn sm" data-b="zip">Descargar ZIP</button> <button class="btn sm primary" data-b="pro">Ver planes de suscripción</button> <button class="btn sm" data-b="sample">Explorar con un proyecto de ejemplo</button>'
        : `Solo lectura: tu plan permite ${SHARE.kind === 'guion' ? `${SHARE.limits && SHARE.limits.scripts} guiones activos` : `${SHARE.limits && SHARE.limits.projects} ${(SHARE.limits && SHARE.limits.projects) === 1 ? 'proyecto de producción activo' : 'proyectos de producción activos'}`}. Puedes verlo y exportarlo. <button class="btn sm" data-b="act">Usar este como activo</button> <button class="btn sm" data-b="arch">Archivar otro…</button> <button class="btn sm primary" data-b="pro">Ver planes</button>`)
      : 'Solo lectura: quien administra este proyecto superó los proyectos activos de su plan.';
  $('#banners').appendChild(b);     // fila propia de avisos (no rompe la grilla si hay más de uno)
  b.addEventListener('click', async e => {
    const x = e.target.closest('[data-b]'); if (!x) return;
    if (x.dataset.b === 'pro') return licenseDialog('', nextPlan((APITEAM.me || {}).plan));
    if (x.dataset.b === 'unarch') return archiveProject(false);
    if (x.dataset.b === 'zip') return archiveZipDialog();
    if (x.dataset.b === 'sample') return sampleExplore();
    if (x.dataset.b === 'arch') return openMenu($('#openBtn'));
    confirmBox('Proyecto activo', `«${esc(P.meta.title)}» pasará a ser uno de tus proyectos activos y otro quedará en solo lectura. Puedes cambiarlo una vez cada 30 días; archivar un proyecto libera su lugar sin esperar.`, 'Cambiar', async () => {
      try { await apiFetch('POST', `/api/p/${encodeURIComponent(P.id)}/activate`, {}); toast('Listo: este proyecto está activo.'); }
      catch (er) { toast(er.message, 6000); }
    }, false);
  });
}
/* proyecto con el que arranca la app: el del enlace, el último abierto o el primero de la lista */
function apiStartPid() {
  try { const p = new URLSearchParams(location.search).get('p'); if (p && /^[\w-]{4,60}$/.test(p)) return p; } catch (e) { }
  return null;
}
