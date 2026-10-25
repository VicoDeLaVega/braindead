'use strict';
/*
 * Mon espace — pages, bases et vues façon Notion/Coda, 100 % statique.
 * Les données vivent dans le localStorage du navigateur (exportables en JSON).
 */

/* ================= Constantes ================= */
const KEY = 'monespace.v1';
const NOTIF_KEY = 'monespace.notified';

const COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
const COLOR_NAMES = { gray: 'Gris', brown: 'Brun', orange: 'Orange', yellow: 'Jaune', green: 'Vert', blue: 'Bleu', purple: 'Violet', pink: 'Rose', red: 'Rouge' };
const TYPES = {
  text: { label: 'Texte', icon: '≡' },
  number: { label: 'Nombre', icon: '#' },
  select: { label: 'Sélection', icon: '◉' },
  multi: { label: 'Multi-sélection', icon: '☷' },
  date: { label: 'Date', icon: '◷' },
  checkbox: { label: 'Case à cocher', icon: '☑' },
  url: { label: 'Lien', icon: '↗' },
  relation: { label: 'Relation', icon: '⇄' },
  recur: { label: 'Récurrence', icon: '↻' },
};
const RECUR = { '': 'Aucune', weekly: 'Chaque semaine', monthly: 'Chaque mois', quarterly: 'Chaque trimestre', yearly: 'Chaque année' };
const NUM_FORMATS = { number: 'Nombre', euro: 'Euro (€)', percent: 'Pourcentage (%)' };
const VIEW_TYPES = {
  table: { label: 'Tableau', icon: '▤' },
  kanban: { label: 'Kanban', icon: '▥' },
  list: { label: 'Liste', icon: '☰' },
  calendar: { label: 'Calendrier', icon: '◫' },
};
const THEMES = [
  { id: 'neige', name: 'Neige', bg: '#ffffff', ac: '#2f80ed' },
  { id: 'sable', name: 'Sable', bg: '#f3ece1', ac: '#c2683a' },
  { id: 'menthe', name: 'Menthe', bg: '#e8f4ee', ac: '#1f9d6b' },
  { id: 'lavande', name: 'Lavande', bg: '#efeafb', ac: '#7c5cd6' },
  { id: 'peche', name: 'Pêche', bg: '#fdeae2', ac: '#e8684a' },
  { id: 'ciel', name: 'Ciel', bg: '#e6effc', ac: '#2b6fd6' },
  { id: 'papier', name: 'Papier', bg: '#ece4d4', ac: '#8a6d3b' },
  { id: 'nuit', name: 'Nuit', bg: '#202020', ac: '#5aa2d6' },
  { id: 'encre', name: 'Encre', bg: '#141e2e', ac: '#7aa2f7' },
];
const EMOJIS = ['📋', '✅', '📌', '🎯', '⭐', '🔥', '💡', '📝', '📁', '📂', '🗂️', '📄', '🧾', '📮', '✉️', '🏦', '💳', '💶',
  '💰', '🧮', '🏠', '🔑', '🛠️', '🔧', '🚗', '⛽', '🏥', '💊', '🦷', '🎓', '💼', '💻', '📱', '📅', '⏰', '🔔',
  '🛒', '🧺', '🍎', '🥕', '🥖', '🧀', '🥛', '🥚', '🍝', '🍷', '☕', '🧴', '🧻', '🧼', '🐶', '🐱', '🌱', '🌻',
  '✈️', '🏖️', '🎁', '📦', '🎨', '🎵', '📚', '🏃', '🧘', '❤️', '👶', '🎉', '🛁', '🔌', '📺', '🌍', '⚖️', '🪪'];
const TEMPLATES = [
  ['vide', '📁', 'Vide', 'Un statut et une date, à personnaliser'],
  ['taches', '✅', 'Tâches', 'Statut, priorité, échéance, projet'],
  ['projets', '🎯', 'Projets', 'Avancement, dates, priorité, tags'],
  ['courses', '🛒', 'Courses', 'Rayons, quantités, magasin, acheté'],
  ['admin', '🗂️', 'Papiers admin', 'Démarches, organismes, échéances'],
  ['paiements', '💶', 'Paiements & rappels', 'Montants, récurrence, payé'],
];

/* ================= Utilitaires ================= */
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
let seq = 0;
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const isEmpty = v => v == null || v === '' || v === false || (Array.isArray(v) && !v.length);
const enterBlur = e => { if (e.key === 'Enter') e.target.blur(); };
const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const s in v) s.startsWith('--') ? el.style.setProperty(s, v[s]) : (el.style[s] = v[s]);
    } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
}

/* --- Dates (format ISO AAAA-MM-JJ, heure locale) --- */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayISO = () => iso(new Date());
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
function addMonths(s, n) {
  const d = parseD(s), day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return iso(d);
}
const diffDays = (a, b) => Math.round((parseD(a) - parseD(b)) / 864e5);
function fmtDate(s, withYear) {
  const d = parseD(s);
  const o = { day: 'numeric', month: 'short' };
  if (withYear || d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
  return d.toLocaleDateString('fr-FR', o);
}
function relDate(s) {
  const n = diffDays(s, todayISO());
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return 'Demain';
  if (n === -1) return 'Hier';
  if (n < 0) return `${fmtDate(s)} · retard ${-n} j`;
  if (n < 7) return parseD(s).toLocaleDateString('fr-FR', { weekday: 'long' });
  return fmtDate(s);
}
function nextDate(s, r) {
  if (r === 'weekly') return addDays(s, 7);
  if (r === 'monthly') return addMonths(s, 1);
  if (r === 'quarterly') return addMonths(s, 3);
  if (r === 'yearly') return addMonths(s, 12);
  return s;
}
const normUrl = u => /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u;
const prettyUrl = u => String(u).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

/* ================= État ================= */
let S; // initialisé au démarrage (bas du fichier)
const ui = { route: { name: 'home' }, routeKey: '', peek: null, peekWide: false, search: '', cal: {}, dragId: null };

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.dbs) && Array.isArray(d.pages)) return migrate(d);
  } catch (e) { /* données illisibles : on repart des exemples */ }
  return seed();
}
function migrate(d) {
  d.name ||= 'Mon espace';
  d.theme ||= 'neige';
  for (const db of d.dbs) {
    db.views ||= [];
    for (const v of db.views) { v.filters ||= []; v.hidden ||= []; }
  }
  return d;
}
let saveT;
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 150); }
function saveNow() {
  clearTimeout(saveT);
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast("Impossible d'enregistrer : stockage du navigateur plein ?"); }
}
window.addEventListener('beforeunload', saveNow);
window.addEventListener('pagehide', saveNow);

const dbById = id => S.dbs.find(d => d.id === id);
const pageById = id => S.pages.find(p => p.id === id);
const propOf = (db, id) => db.props.find(p => p.id === id);
const pagesOf = db => S.pages.filter(p => p.db === db.id);
const activeView = db => db.views.find(v => v.id === db.activeView) || db.views[0];
const dueProp = db => db.props.find(p => p.type === 'date' && p.due) || db.props.find(p => p.type === 'date');
const amountProp = db => db.props.find(p => p.type === 'number' && p.format === 'euro');
const visibleProps = (db, view) => db.props.filter(p => !view.hidden.includes(p.id));

function newPage(db, title = '', props = {}) {
  const now = Date.now();
  const clean = {};
  for (const k in props) if (!isEmpty(props[k])) clean[k] = props[k];
  return { id: uid(), db: db.id, title, icon: '', props: clean, content: '', created: now, updated: now, order: now + seq++ };
}
function touch(pg) { pg.updated = Date.now(); save(); }

function isDone(pg) {
  const db = dbById(pg.db);
  if (!db) return false;
  for (const p of db.props) {
    const v = pg.props[p.id];
    if (p.type === 'checkbox' && p.done && v) return true;
    if (p.type === 'select' && v && p.options.some(o => o.id === v && o.done)) return true;
  }
  return false;
}
const hasDoneMarker = db => db.props.some(p => (p.type === 'checkbox' && p.done) || (p.type === 'select' && p.options.some(o => o.done)));

function setProp(pg, p, val) {
  const wasDone = isDone(pg);
  if (isEmpty(val) && p.type !== 'number') delete pg.props[p.id];
  else if (val == null || val === '' || (typeof val === 'number' && isNaN(val))) delete pg.props[p.id];
  else pg.props[p.id] = val;
  touch(pg);
  if (!wasDone && isDone(pg)) onCompleted(pg);
}
function setDone(pg, done) {
  const db = dbById(pg.db);
  const cb = db.props.find(p => p.type === 'checkbox' && p.done);
  if (cb) return setProp(pg, cb, done || null);
  const sp = db.props.find(p => p.type === 'select' && p.options.some(o => o.done));
  if (sp) setProp(pg, sp, done ? sp.options.find(o => o.done).id : (sp.options.find(o => !o.done)?.id || null));
}
// Une tâche récurrente terminée est reprogrammée à l'échéance suivante.
function onCompleted(pg) {
  const db = dbById(pg.db);
  const rp = db.props.find(p => p.type === 'recur');
  const dp = dueProp(db);
  const r = rp && pg.props[rp.id], d = dp && pg.props[dp.id];
  if (!r || !d) return;
  const next = nextDate(d, r);
  pg.props[dp.id] = next;
  for (const p of db.props) {
    if (p.type === 'checkbox' && p.done) delete pg.props[p.id];
    if (p.type === 'select' && p.options.some(o => o.done && o.id === pg.props[p.id])) {
      const first = p.options.find(o => !o.done);
      if (first) pg.props[p.id] = first.id; else delete pg.props[p.id];
    }
  }
  pg.content = (pg.content || '') + `<p class="log">✓ Échéance du ${fmtDate(d, true)} réglée le ${fmtDate(todayISO(), true)}</p>`;
  touch(pg);
  toast(`↻ « ${pg.title || 'Sans titre'} » reprogrammé au ${fmtDate(next, true)}`);
}

/* ================= Modèles & exemples ================= */
const opt = (name, color, done) => (done ? { id: uid(), name, color, done: true } : { id: uid(), name, color });
const mkProp = (name, type, extra = {}) => ({ id: uid(), name, type, ...(type === 'select' || type === 'multi' ? { options: [] } : {}), ...extra });
const mkView = (name, type, extra = {}) => ({ id: uid(), name, type, filters: [], sort: null, hideDone: false, hidden: [], ...extra });
const prioOpts = () => [opt('Haute', 'red'), opt('Moyenne', 'orange'), opt('Basse', 'gray')];

function makeDb(kind, ctx = {}) {
  const P = {};
  let db;
  switch (kind) {
    case 'taches':
      db = {
        name: 'Tâches', icon: '✅', props: [
          P.statut = mkProp('Statut', 'select', { options: [opt('À faire', 'gray'), opt('En cours', 'blue'), opt('En attente', 'yellow'), opt('Fait', 'green', true)] }),
          P.prio = mkProp('Priorité', 'select', { options: prioOpts() }),
          P.ech = mkProp('Échéance', 'date', { due: true }),
          P.cat = mkProp('Catégorie', 'multi', { options: [opt('Perso', 'purple'), opt('Maison', 'brown'), opt('Travail', 'blue'), opt('Santé', 'green')] }),
          ctx.projets ? (P.projet = mkProp('Projet', 'relation', { target: ctx.projets })) : null,
          P.lien = mkProp('Lien', 'url'),
        ].filter(Boolean),
      };
      db.views = [
        mkView('Par statut', 'kanban', { groupBy: P.statut.id }),
        mkView('Tableau', 'table', { sort: { prop: P.ech.id, dir: 1 } }),
        mkView('Par priorité', 'kanban', { groupBy: P.prio.id, hideDone: true }),
        mkView('Calendrier', 'calendar', { dateProp: P.ech.id }),
      ];
      break;
    case 'projets':
      db = {
        name: 'Projets', icon: '🎯', props: [
          P.statut = mkProp('Statut', 'select', { options: [opt('Idée', 'gray'), opt('Planifié', 'purple'), opt('En cours', 'blue'), opt('En pause', 'yellow'), opt('Terminé', 'green', true)] }),
          P.prio = mkProp('Priorité', 'select', { options: prioOpts() }),
          P.debut = mkProp('Début', 'date'),
          P.fin = mkProp('Fin', 'date', { due: true }),
          P.avancement = mkProp('Avancement', 'number', { format: 'percent' }),
          P.tags = mkProp('Tags', 'multi', { options: [opt('Maison', 'brown'), opt('Loisirs', 'pink'), opt('Pro', 'blue'), opt('Famille', 'orange')] }),
          P.lien = mkProp('Lien', 'url'),
        ],
      };
      db.views = [
        mkView('Par statut', 'kanban', { groupBy: P.statut.id }),
        mkView('Tableau', 'table', { sort: { prop: P.fin.id, dir: 1 } }),
        mkView('Calendrier', 'calendar', { dateProp: P.fin.id }),
      ];
      break;
    case 'courses':
      db = {
        name: 'Courses', icon: '🛒', props: [
          P.rayon = mkProp('Rayon', 'select', { options: [opt('Fruits & légumes', 'green'), opt('Frais', 'blue'), opt('Boulangerie', 'brown'), opt('Épicerie', 'orange'), opt('Boissons', 'purple'), opt('Surgelés', 'gray'), opt('Hygiène', 'pink'), opt('Maison', 'yellow')] }),
          P.qte = mkProp('Quantité', 'text'),
          P.magasin = mkProp('Magasin', 'select', { options: [opt('Supermarché', 'blue'), opt('Marché', 'green'), opt('Bio', 'yellow'), opt('Pharmacie', 'red')] }),
          P.achete = mkProp('Acheté', 'checkbox', { done: true }),
          P.prix = mkProp('Prix', 'number', { format: 'euro' }),
        ],
      };
      db.views = [
        mkView('À acheter', 'kanban', { groupBy: P.rayon.id, hideDone: true }),
        mkView('Liste', 'list', { sort: { prop: P.rayon.id, dir: 1 }, hidden: [P.prix.id] }),
        mkView('Par magasin', 'kanban', { groupBy: P.magasin.id, hideDone: true }),
      ];
      break;
    case 'admin':
      db = {
        name: 'Papiers admin', icon: '🗂️', props: [
          P.statut = mkProp('Statut', 'select', { options: [opt('À faire', 'gray'), opt('En cours', 'blue'), opt('En attente de réponse', 'yellow'), opt('Terminé', 'green', true)] }),
          P.type = mkProp('Type', 'select', { options: [opt('Impôts', 'red'), opt('Banque', 'blue'), opt('Santé', 'green'), opt('Logement', 'brown'), opt('Assurance', 'purple'), opt('Voiture', 'orange'), opt('Travail', 'gray'), opt('Identité', 'pink')] }),
          P.ech = mkProp('Échéance', 'date', { due: true }),
          P.organisme = mkProp('Organisme', 'text'),
          P.prio = mkProp('Priorité', 'select', { options: prioOpts() }),
          P.lien = mkProp('Lien', 'url'),
        ],
      };
      db.views = [
        mkView('Par statut', 'kanban', { groupBy: P.statut.id }),
        mkView('Tableau', 'table', { sort: { prop: P.ech.id, dir: 1 } }),
        mkView('Par type', 'kanban', { groupBy: P.type.id, hideDone: true }),
        mkView('Calendrier', 'calendar', { dateProp: P.ech.id }),
      ];
      break;
    case 'paiements':
      db = {
        name: 'Paiements & rappels', icon: '💶', props: [
          P.montant = mkProp('Montant', 'number', { format: 'euro' }),
          P.ech = mkProp('Échéance', 'date', { due: true }),
          P.recur = mkProp('Récurrence', 'recur'),
          P.paye = mkProp('Payé', 'checkbox', { done: true }),
          P.cat = mkProp('Catégorie', 'select', { options: [opt('Loyer', 'brown'), opt('Énergie', 'yellow'), opt('Internet & tél.', 'blue'), opt('Assurance', 'purple'), opt('Abonnement', 'pink'), opt('Impôts', 'red'), opt('Crédit', 'orange'), opt('Autre', 'gray')] }),
          P.moyen = mkProp('Moyen', 'select', { options: [opt('Prélèvement', 'gray'), opt('Virement', 'blue'), opt('Carte', 'green'), opt('Chèque', 'orange')] }),
          P.lien = mkProp('Lien', 'url'),
        ],
      };
      db.views = [
        mkView('À venir', 'table', { sort: { prop: P.ech.id, dir: 1 }, hideDone: true }),
        mkView('Calendrier', 'calendar', { dateProp: P.ech.id }),
        mkView('Par catégorie', 'kanban', { groupBy: P.cat.id }),
      ];
      break;
    default:
      db = {
        name: 'Nouvelle base', icon: '📁', props: [
          P.statut = mkProp('Statut', 'select', { options: [opt('À faire', 'gray'), opt('En cours', 'blue'), opt('Fait', 'green', true)] }),
          P.date = mkProp('Date', 'date', { due: true }),
          P.tags = mkProp('Tags', 'multi'),
        ],
      };
      db.views = [mkView('Tableau', 'table'), mkView('Kanban', 'kanban', { groupBy: P.statut.id })];
  }
  db.id = uid();
  db.tpl = kind;
  db.activeView = db.views[0].id;
  return { db, P };
}

function resolveVal(p, v) {
  if (p.type === 'select') return p.options.find(o => o.name === v)?.id;
  if (p.type === 'multi') return [].concat(v).map(n => p.options.find(o => o.name === n)?.id).filter(Boolean);
  return v;
}
function seed() {
  const data = { version: 1, name: 'Mon espace', theme: 'neige', dbs: [], pages: [] };
  const T = todayISO(), d = n => addDays(T, n);
  const add = (x, title, vals = {}, extra = {}) => {
    const pg = newPage(x.db, title);
    Object.assign(pg, extra);
    for (const [k, v] of Object.entries(vals)) pg.props[x.P[k].id] = resolveVal(x.P[k], v);
    data.pages.push(pg);
    return pg;
  };
  const pr = makeDb('projets');
  const ta = makeDb('taches', { projets: pr.db.id });
  const co = makeDb('courses');
  const ad = makeDb('admin');
  const pa = makeDb('paiements');
  data.dbs.push(ta.db, pr.db, co.db, ad.db, pa.db);

  const sdb = add(pr, 'Rénover la salle de bain', { statut: 'En cours', prio: 'Haute', debut: d(-20), fin: d(40), avancement: 35, tags: ['Maison'] }, { icon: '🛁',
    content: '<h2>Objectif</h2><p>Remplacer la douche et le lavabo avant l’hiver.</p><h3>Budget</h3><ul><li>Carrelage : 600 €</li><li>Plombier : 900 €</li></ul>' });
  const vac = add(pr, "Vacances d'été", { statut: 'Planifié', prio: 'Moyenne', fin: d(120), avancement: 10, tags: ['Famille', 'Loisirs'] }, { icon: '🏖️' });
  add(pr, "Apprendre l'espagnol", { statut: 'Idée', prio: 'Basse', tags: ['Loisirs'] }, { icon: '📚' });

  add(ta, 'Appeler le plombier', { statut: 'En cours', prio: 'Haute', ech: d(1), cat: ['Maison'], projet: [sdb.id] }, {
    content: '<p>Demander un devis pour :</p><ul class="checklist"><li data-done="true">Douche</li><li>Lavabo</li><li>Robinetterie</li></ul>' });
  add(ta, 'Choisir le carrelage', { statut: 'À faire', prio: 'Moyenne', ech: d(5), cat: ['Maison'], projet: [sdb.id] });
  add(ta, 'Prendre RDV chez le dentiste', { statut: 'À faire', prio: 'Haute', ech: d(-1), cat: ['Santé'] }, { icon: '🦷' });
  add(ta, 'Réserver le logement', { statut: 'À faire', prio: 'Moyenne', ech: d(14), cat: ['Perso'], projet: [vac.id] });
  add(ta, 'Trier la boîte mail', { statut: 'Fait', prio: 'Basse', cat: ['Perso'] });

  add(co, 'Pommes', { rayon: 'Fruits & légumes', qte: '1 kg', magasin: 'Marché' });
  add(co, 'Tomates', { rayon: 'Fruits & légumes', qte: '6', magasin: 'Marché' });
  add(co, 'Lait', { rayon: 'Frais', qte: '2 L', magasin: 'Supermarché' });
  add(co, 'Yaourts nature', { rayon: 'Frais', qte: '8', magasin: 'Supermarché' });
  add(co, 'Baguette', { rayon: 'Boulangerie', qte: '1' });
  add(co, 'Pâtes', { rayon: 'Épicerie', qte: '2 paquets', magasin: 'Supermarché' });
  add(co, 'Café', { rayon: 'Épicerie', magasin: 'Bio', achete: true });
  add(co, 'Liquide vaisselle', { rayon: 'Maison', magasin: 'Supermarché' });
  add(co, 'Dentifrice', { rayon: 'Hygiène', magasin: 'Pharmacie' });

  add(ad, 'Déclaration de revenus', { statut: 'À faire', type: 'Impôts', ech: d(10), organisme: 'impots.gouv.fr', prio: 'Haute', lien: 'https://www.impots.gouv.fr' }, { icon: '🧾',
    content: '<ul class="checklist"><li>Récupérer les attestations</li><li>Vérifier les frais réels</li><li>Signer en ligne</li></ul>' });
  add(ad, "Renouveler la carte d'identité", { statut: 'En cours', type: 'Identité', ech: d(30), organisme: 'Mairie', prio: 'Moyenne', lien: 'https://ants.gouv.fr' }, { icon: '🪪' });
  add(ad, 'Envoyer la feuille de soins', { statut: 'En attente de réponse', type: 'Santé', ech: d(-3), organisme: 'CPAM', prio: 'Basse' });
  add(ad, "Attestation d'assurance habitation", { statut: 'Terminé', type: 'Assurance', organisme: 'Assureur' });

  add(pa, 'Loyer', { montant: 850, ech: d(6), recur: 'monthly', cat: 'Loyer', moyen: 'Virement' }, { icon: '🏠' });
  add(pa, 'Électricité', { montant: 74.5, ech: d(2), recur: 'monthly', cat: 'Énergie', moyen: 'Prélèvement' }, { icon: '🔌' });
  add(pa, 'Box internet', { montant: 29.99, ech: d(-1), recur: 'monthly', cat: 'Internet & tél.', moyen: 'Carte' });
  add(pa, 'Streaming', { montant: 13.49, ech: d(12), recur: 'monthly', cat: 'Abonnement', moyen: 'Carte' }, { icon: '📺' });
  add(pa, 'Assurance auto', { montant: 420, ech: d(45), recur: 'yearly', cat: 'Assurance', moyen: 'Prélèvement' }, { icon: '🚗' });
  add(pa, 'Taxe foncière', { montant: 980, ech: d(60), recur: 'yearly', cat: 'Impôts', moyen: 'Virement', lien: 'https://www.impots.gouv.fr' });
  return data;
}

/* ================= Rendu global ================= */
function applyTheme() {
  document.documentElement.dataset.theme = S.theme;
  const meta = $('meta[name=theme-color]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff';
}
function render() { applyTheme(); renderSidebar(); renderMain(); if (ui.peek) renderPeek(); updateTitle(); }
function refresh() { renderSidebar(); renderMain(); if (ui.peek) renderPeek(); updateTitle(); }
let softT;
function softMain() { clearTimeout(softT); softT = setTimeout(() => { renderMain(); renderSidebar(); }, 350); }

function parseHash() {
  const m = location.hash.match(/^#\/db\/([^/]+)/);
  ui.route = m && dbById(m[1]) ? { name: 'db', id: m[1] } : { name: 'home' };
}
window.addEventListener('hashchange', () => {
  parseHash(); ui.search = ''; document.body.classList.remove('sb-open'); closePop(); renderSidebar(); renderMain();
});

function dueItems() {
  const T = todayISO(), out = [];
  for (const db of S.dbs) {
    const dp = dueProp(db);
    if (!dp) continue;
    const ap = amountProp(db);
    for (const pg of pagesOf(db)) {
      const d = pg.props[dp.id];
      if (!d || isDone(pg)) continue;
      out.push({ pg, db, d, n: diffDays(d, T), amt: ap ? pg.props[ap.id] : null });
    }
  }
  return out.sort((a, b) => a.d.localeCompare(b.d));
}
function updateTitle() {
  const n = dueItems().filter(i => i.n <= 0).length;
  document.title = (n ? `(${n}) ` : '') + S.name;
}
const openCount = db => pagesOf(db).filter(p => !isDone(p)).length;

/* ================= Barre latérale ================= */
function renderSidebar() {
  const sb = $('#sidebar');
  const urgent = dueItems().filter(i => i.n <= 0).length;
  const notifOn = 'Notification' in window && Notification.permission === 'granted';
  sb.innerHTML = '';
  append(sb, [
    h('div', { class: 'sb-head' },
      h('div', { class: 'logo' }, '◆'),
      h('input', { class: 'ws-name', value: S.name, 'aria-label': "Nom de l'espace", onchange: e => { S.name = e.target.value.trim() || 'Mon espace'; save(); updateTitle(); }, onkeydown: enterBlur })),
    h('button', { class: 'sb-item', onclick: openQuickFind }, h('span', { class: 'sb-ico' }, '⌕'), 'Rechercher', h('kbd', null, 'Ctrl K')),
    h('a', { class: 'sb-item' + (ui.route.name === 'home' ? ' active' : ''), href: '#/home' },
      h('span', { class: 'sb-ico' }, '⌂'), h('span', { class: 'sb-txt' }, 'Accueil'), urgent ? h('span', { class: 'sb-badge', title: 'En retard ou pour aujourd’hui' }, urgent) : null),
    h('div', { class: 'sb-label' }, 'BASES', h('button', { class: 'icon-btn sm', title: 'Nouvelle base', onclick: openNewDb }, '+')),
    S.dbs.map(db => h('a', { class: 'sb-item' + (ui.route.id === db.id && ui.route.name === 'db' ? ' active' : ''), href: '#/db/' + db.id },
      h('span', { class: 'sb-ico' }, db.icon || '📄'), h('span', { class: 'sb-txt' }, db.name), h('span', { class: 'sb-count' }, openCount(db)))),
    h('div', { class: 'sb-spacer' }),
    h('div', { class: 'sb-label' }, 'THÈME', h('span', { class: 'sb-count' }, THEMES.find(t => t.id === S.theme)?.name)),
    h('div', { class: 'themes' }, THEMES.map(t => h('button', {
      class: 'swatch' + (S.theme === t.id ? ' on' : ''), title: t.name, 'aria-label': 'Thème ' + t.name,
      style: { background: t.bg, '--ac': t.ac }, onclick: () => { S.theme = t.id; save(); render(); },
    }))),
    h('div', { class: 'sb-tools' },
      h('button', { class: 'sb-item', onclick: enableNotifs }, h('span', { class: 'sb-ico' }, '🔔'), notifOn ? 'Rappels activés' : 'Activer les rappels'),
      h('button', { class: 'sb-item', onclick: exportICS }, h('span', { class: 'sb-ico' }, '📅'), 'Exporter vers agenda (.ics)'),
      h('button', { class: 'sb-item', onclick: exportJSON }, h('span', { class: 'sb-ico' }, '⬇'), 'Sauvegarder (.json)'),
      h('button', { class: 'sb-item', onclick: () => $('#import-file').click() }, h('span', { class: 'sb-ico' }, '⬆'), 'Restaurer une sauvegarde')),
  ]);
}

/* ================= Zone principale ================= */
function renderMain() {
  const main = $('#main');
  const key = ui.route.name + (ui.route.id || '');
  const keep = key === ui.routeKey ? main.scrollTop : 0;
  ui.routeKey = key;
  main.innerHTML = '';
  main.append(h('button', { class: 'menu-btn', 'aria-label': 'Menu', onclick: () => document.body.classList.toggle('sb-open') }, '☰'));
  const db = ui.route.name === 'db' && dbById(ui.route.id);
  if (db) renderDb(main, db); else renderHome(main);
  main.scrollTop = keep;
}

/* ---------- Accueil ---------- */
function renderHome(main) {
  const T = todayISO();
  const items = dueItems();
  const late = items.filter(i => i.n < 0), today = items.filter(i => i.n === 0);
  const week = items.filter(i => i.n > 0 && i.n <= 7), later = items.filter(i => i.n > 7 && i.n <= 31);
  const toPay = items.filter(i => i.amt && i.n <= 30).reduce((s, i) => s + Number(i.amt), 0);
  const hr = new Date().getHours();
  const greet = hr < 5 ? 'Bonne nuit' : hr < 18 ? 'Bonjour' : 'Bonsoir';
  const notifOk = !('Notification' in window) || Notification.permission !== 'default';

  const agItem = i => {
    const row = h('div', { class: 'ag-item', onclick: () => openPeek(i.pg.id) },
      hasDoneMarker(i.db) ? h('input', {
        type: 'checkbox', class: 'chk', title: 'Marquer comme fait', onclick: e => e.stopPropagation(),
        onchange: () => { row.classList.add('leaving'); setTimeout(() => { setDone(i.pg, true); refresh(); }, 280); },
      }) : null,
      h('div', { class: 'ag-main' },
        h('div', { class: 'ag-title' }, i.pg.icon ? i.pg.icon + ' ' : '', i.pg.title || 'Sans titre'),
        h('div', { class: 'ag-sub' }, h('span', null, i.db.icon, ' ', i.db.name), i.amt ? h('b', null, EUR.format(i.amt)) : null)),
      dateBadge(i.d, false));
    return row;
  };
  const agCol = (title, list, cls) => h('div', { class: 'ag-col ' + (cls || '') },
    h('h2', null, title, h('span', { class: 'n' }, list.length)),
    list.length ? list.map(agItem) : h('div', { class: 'ag-empty' }, 'Rien ici 🎉'));

  // Ajout rapide
  const dbsWithTitle = S.dbs;
  const qaIn = h('input', { class: 'qa-in', placeholder: 'Ajouter rapidement… (Entrée)' });
  const qaDb = h('select', { class: 'in', 'aria-label': 'Base' }, dbsWithTitle.map(db => h('option', { value: db.id, selected: db.id === S.lastQa }, db.icon + ' ' + db.name)));
  const qaDate = h('input', { type: 'date', class: 'in', title: 'Échéance (facultatif)' });
  const qaGo = () => {
    const title = qaIn.value.trim();
    if (!title) return qaIn.focus();
    const db = dbById(qaDb.value);
    if (!db) return;
    const props = {};
    const dp = dueProp(db);
    if (qaDate.value && dp) props[dp.id] = qaDate.value;
    S.pages.push(newPage(db, title, props));
    S.lastQa = db.id;
    save(); refresh();
    toast(`Ajouté à ${db.icon} ${db.name}`, { label: 'Ouvrir', fn: () => go('#/db/' + db.id) });
    $('.qa-in')?.focus();
  };
  qaIn.addEventListener('keydown', e => { if (e.key === 'Enter') qaGo(); });

  const recent = [...S.pages].sort((a, b) => b.updated - a.updated).slice(0, 6);

  main.append(h('div', { class: 'page-wrap home' },
    h('h1', null, greet + ' 👋'),
    h('div', { class: 'sub' }, new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
    notifOk ? null : h('div', { class: 'tip' }, '🔔', h('span', null, 'Recevez une notification pour ce qui arrive à échéance (quand l’app est ouverte).'),
      h('button', { class: 'btn', onclick: enableNotifs }, 'Activer')),
    h('div', { class: 'stats' },
      h('div', { class: 'stat late' }, h('div', { class: 'v' }, late.length), h('div', { class: 'l' }, 'En retard')),
      h('div', { class: 'stat today' }, h('div', { class: 'v' }, today.length), h('div', { class: 'l' }, "Pour aujourd'hui")),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, week.length), h('div', { class: 'l' }, '7 prochains jours')),
      h('div', { class: 'stat money' }, h('div', { class: 'v' }, EUR.format(toPay)), h('div', { class: 'l' }, 'À payer sous 30 jours'))),
    h('div', { class: 'qa' }, qaIn, qaDb, qaDate, h('button', { class: 'btn primary', onclick: qaGo }, 'Ajouter')),
    h('div', { class: 'agenda' },
      agCol('En retard', late, 'late'), agCol("Aujourd'hui", today), agCol('Cette semaine', week), agCol('Plus tard (30 j)', later)),
    h('h2', null, 'Bases'),
    h('div', { class: 'bases' },
      S.dbs.map(db => {
        const all = pagesOf(db).length, open = openCount(db);
        return h('a', { class: 'base-card', href: '#/db/' + db.id },
          h('div', { class: 'bi' }, db.icon || '📄'), h('div', { class: 'bn' }, db.name),
          h('div', { class: 'bs' }, hasDoneMarker(db) ? `${open} en cours · ${all} au total` : `${all} pages`),
          hasDoneMarker(db) && all ? h('span', { class: 'bar' }, h('i', { style: { width: Math.round((all - open) / all * 100) + '%' } })) : null);
      }),
      h('button', { class: 'base-card new', onclick: openNewDb }, '+ Nouvelle base')),
    recent.length ? [h('h2', null, 'Modifié récemment'), h('div', { class: 'recent' }, recent.map(pg => {
      const db = dbById(pg.db);
      return h('a', { onclick: () => openPeek(pg.id) }, h('span', null, pg.icon || db?.icon || '📄'), h('span', null, pg.title || 'Sans titre'),
        h('span', { class: 'rd' }, db?.name, ' · ', new Date(pg.updated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })));
    }))] : null,
  ));
  void T;
}

/* ---------- Base ---------- */
function renderDb(main, db) {
  const view = activeView(db);
  const nf = view.filters.length;
  const body = h('div', { class: 'view-body' });
  const renderBody = () => {
    body.innerHTML = '';
    const pages = applyView(db, view);
    ({ table: renderTable, kanban: renderKanban, list: renderList, calendar: renderCalendar }[view.type] || renderTable)(body, db, view, pages);
  };
  main.append(h('div', { class: 'page-wrap wide' },
    h('header', { class: 'db-head' },
      h('button', { class: 'db-icon', title: "Changer l'icône", onclick: e => emojiPicker(e.currentTarget, v => { db.icon = v || '📄'; save(); render(); }) }, db.icon || '📄'),
      h('input', { class: 'db-title', value: db.name, 'aria-label': 'Nom de la base', onchange: e => { db.name = e.target.value.trim() || 'Sans titre'; save(); renderSidebar(); }, onkeydown: enterBlur })),
    h('div', { class: 'view-tabs' },
      db.views.map(v => h('button', {
        class: 'view-tab' + (v.id === view.id ? ' on' : ''),
        onclick: e => { if (v.id === view.id) return viewPop(e.currentTarget, db, v); db.activeView = v.id; save(); renderMain(); },
        title: v.id === view.id ? 'Cliquer pour configurer la vue' : '',
      }, h('span', { class: 'vt-ico' }, VIEW_TYPES[v.type]?.icon), v.name)),
      h('button', { class: 'view-tab add', title: 'Nouvelle vue', onclick: e => addViewMenu(e.currentTarget, db) }, '+')),
    h('div', { class: 'toolbar' },
      h('label', { class: 'search' }, '⌕', h('input', { placeholder: 'Rechercher…', value: ui.search, oninput: e => { ui.search = e.target.value; renderBody(); } })),
      h('button', { class: 'tool' + (nf ? ' on' : ''), onclick: e => filterPop(e.currentTarget, db, view) }, nf ? `Filtres · ${nf}` : 'Filtrer'),
      h('button', { class: 'tool' + (view.sort ? ' on' : ''), onclick: e => sortPop(e.currentTarget, db, view) }, view.sort ? 'Trié' : 'Trier'),
      hasDoneMarker(db) ? h('button', { class: 'tool' + (view.hideDone ? ' on' : ''), onclick: () => { view.hideDone = !view.hideDone; save(); renderMain(); } },
        view.hideDone ? 'Terminés masqués' : 'Masquer terminés') : null,
      h('button', { class: 'tool', onclick: e => viewPop(e.currentTarget, db, view) }, 'Vue ⚙'),
      h('button', { class: 'tool', onclick: () => openSchema(db) }, 'Propriétés'),
      h('button', { class: 'btn primary', onclick: () => createAndOpen(db, defaultsFor(view)) }, '+ Nouveau')),
    body));
  renderBody();
}

function defaultsFor(view) {
  const out = {};
  for (const f of view.filters) {
    if ((f.op === 'is' || f.op === 'contains') && f.value) out[f.prop] = f.value;
    if (f.op === 'has' && f.value) out[f.prop] = [f.value];
    if (f.op === 'checked') out[f.prop] = true;
  }
  delete out.title;
  return out;
}
function createAndOpen(db, props = {}) {
  const pg = newPage(db, '', props);
  S.pages.push(pg);
  save();
  renderMain(); renderSidebar();
  openPeek(pg.id, { focusTitle: true });
}
function quickAdd(db, view) {
  return h('input', {
    class: 'quick-add', placeholder: '+ Ajouter… (Entrée)',
    onkeydown: e => {
      if (e.key !== 'Enter' || !e.target.value.trim()) return;
      S.pages.push(newPage(db, e.target.value.trim(), defaultsFor(view)));
      save(); renderMain(); renderSidebar();
      $('.quick-add')?.focus();
    },
  });
}

/* ---------- Filtrage / tri ---------- */
function searchText(db, pg) {
  const parts = [pg.title];
  for (const p of db.props) {
    const v = pg.props[p.id];
    if (v == null) continue;
    if (p.type === 'select') parts.push(p.options.find(o => o.id === v)?.name);
    else if (p.type === 'multi') parts.push(...v.map(id => p.options.find(o => o.id === id)?.name));
    else if (p.type === 'relation') parts.push(...v.map(id => pageById(id)?.title));
    else if (typeof v === 'string' || typeof v === 'number') parts.push(v);
  }
  parts.push((pg.content || '').replace(/<[^>]+>/g, ' '));
  return norm(parts.filter(Boolean).join(' '));
}
const OPS_TEXT = [['contains', 'contient'], ['notcontains', 'ne contient pas'], ['empty', 'est vide'], ['notempty', "n'est pas vide"]];
const OPS_SEL = [['is', 'est'], ['isnot', "n'est pas"], ['empty', 'est vide'], ['notempty', "n'est pas vide"]];
const OPS_MULTI = [['has', 'contient'], ['hasnot', 'ne contient pas'], ['empty', 'est vide'], ['notempty', "n'est pas vide"]];
const OPS = {
  text: OPS_TEXT, url: OPS_TEXT, select: OPS_SEL, recur: OPS_SEL, multi: OPS_MULTI, relation: OPS_MULTI,
  number: [['eq', '='], ['gt', '>'], ['lt', '<'], ['empty', 'est vide'], ['notempty', "n'est pas vide"]],
  checkbox: [['checked', 'est coché'], ['unchecked', "n'est pas coché"]],
  date: [['overdue', 'en retard'], ['today', "aujourd'hui"], ['week', '7 prochains jours'], ['month', '30 prochains jours'],
    ['future', 'à venir'], ['past', 'passée'], ['empty', 'est vide'], ['notempty', "n'est pas vide"]],
};
const NEEDS_VALUE = new Set(['contains', 'notcontains', 'eq', 'gt', 'lt', 'is', 'isnot', 'has', 'hasnot']);
const fieldOf = (db, id) => id === 'title' ? { id: 'title', name: 'Nom', type: 'text' } : propOf(db, id);

function testFilter(db, pg, f) {
  const p = fieldOf(db, f.prop);
  if (!p) return true;
  const v = f.prop === 'title' ? pg.title : pg.props[f.prop];
  const fv = f.value, T = todayISO();
  const none = fv == null || fv === '';
  switch (f.op) {
    case 'empty': return isEmpty(v);
    case 'notempty': return !isEmpty(v);
    case 'contains': return none || norm(v).includes(norm(fv));
    case 'notcontains': return none || !norm(v).includes(norm(fv));
    case 'eq': return none || (v != null && Number(v) === Number(fv));
    case 'gt': return none || (v != null && Number(v) > Number(fv));
    case 'lt': return none || (v != null && Number(v) < Number(fv));
    case 'is': return none || v === fv;
    case 'isnot': return none || v !== fv;
    case 'has': return none || (v || []).includes(fv);
    case 'hasnot': return none || !(v || []).includes(fv);
    case 'checked': return !!v;
    case 'unchecked': return !v;
    case 'overdue': return !!v && v < T;
    case 'today': return v === T;
    case 'week': return !!v && v >= T && v <= addDays(T, 7);
    case 'month': return !!v && v >= T && v <= addDays(T, 30);
    case 'future': return !!v && v > T;
    case 'past': return !!v && v < T;
  }
  return true;
}
function cmpPages(db, pid, a, b) {
  const p = pid === 'title' ? { type: 'text' } : pid === 'created' || pid === 'updated' ? { type: 'number' } : propOf(db, pid);
  if (!p) return 0;
  const get = pg => pid === 'title' ? pg.title : pid === 'created' || pid === 'updated' ? pg[pid] : pg.props[pid];
  const x = get(a), y = get(b);
  const ex = isEmpty(x) && x !== false, ey = isEmpty(y) && y !== false;
  if (ex && ey) return 0;
  if (ex) return 1;
  if (ey) return -1;
  const idx = id => p.options.findIndex(o => o.id === id);
  switch (p.type) {
    case 'number': return x - y;
    case 'checkbox': return (x ? 1 : 0) - (y ? 1 : 0);
    case 'select': return idx(x) - idx(y);
    case 'multi': return idx(x[0]) - idx(y[0]);
    case 'relation': return String(pageById(x[0])?.title || '').localeCompare(String(pageById(y[0])?.title || ''), 'fr');
    case 'recur': return Object.keys(RECUR).indexOf(x) - Object.keys(RECUR).indexOf(y);
    default: return String(x).localeCompare(String(y), 'fr', { sensitivity: 'base', numeric: true });
  }
}
function applyView(db, view) {
  let ps = pagesOf(db);
  if (view.hideDone) ps = ps.filter(p => !isDone(p));
  const q = norm(ui.search.trim());
  if (q) ps = ps.filter(p => searchText(db, p).includes(q));
  for (const f of view.filters) ps = ps.filter(p => testFilter(db, p, f));
  if (view.sort && (view.sort.prop === 'title' || view.sort.prop === 'created' || view.sort.prop === 'updated' || propOf(db, view.sort.prop))) {
    const { prop, dir } = view.sort;
    ps.sort((a, b) => {
      const c = cmpPages(db, prop, a, b);
      // les valeurs vides restent en bas quel que soit le sens
      const ea = isEmpty(prop === 'title' ? a.title : a.props[prop]), eb = isEmpty(prop === 'title' ? b.title : b.props[prop]);
      if (ea !== eb && !['created', 'updated', 'title'].includes(prop) && fieldOf(db, prop)?.type !== 'checkbox') return ea ? 1 : -1;
      return c * dir || (a.order || 0) - (b.order || 0);
    });
  } else ps.sort((a, b) => (a.order || 0) - (b.order || 0));
  return ps;
}

/* ---------- Affichage des valeurs ---------- */
const chip = o => h('span', { class: 'chip c-' + (o.color || 'gray') }, o.name);
function dateBadge(v, done) {
  const n = diffDays(v, todayISO());
  const cls = done ? '' : n < 0 ? 'late' : n === 0 ? 'today' : n <= 3 ? 'soon' : '';
  return h('span', { class: 'date ' + cls, title: parseD(v).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }, relDate(v));
}
function fmtNum(p, v) {
  if (p.format === 'euro') return EUR.format(v);
  if (p.format === 'percent') return `${v} %`;
  return Number(v).toLocaleString('fr-FR');
}
function renderValue(p, v, done) {
  if (isEmpty(v) && !(p.type === 'number' && v === 0)) return null;
  switch (p.type) {
    case 'select': { const o = p.options.find(o => o.id === v); return o ? chip(o) : null; }
    case 'multi': { const os = v.map(id => p.options.find(o => o.id === id)).filter(Boolean); return os.length ? os.map(chip) : null; }
    case 'relation': {
      const ps = v.map(pageById).filter(Boolean);
      return ps.length ? ps.map(x => h('span', { class: 'rel-chip', onclick: e => { e.stopPropagation(); openPeek(x.id); } }, (x.icon || '📄') + ' ' + (x.title || 'Sans titre'))) : null;
    }
    case 'date': return dateBadge(v, done);
    case 'checkbox': return h('span', { class: 'chk-ro' }, '✓ ' + p.name);
    case 'number': return h('span', { class: 'num' }, fmtNum(p, v),
      p.format === 'percent' ? h('span', { class: 'bar' }, h('i', { style: { width: Math.max(0, Math.min(100, v)) + '%' } })) : null);
    case 'url': return h('a', { href: normUrl(v), target: '_blank', rel: 'noopener', class: 'link', onclick: e => e.stopPropagation() }, '↗ ' + prettyUrl(v));
    case 'recur': return RECUR[v] ? h('span', { class: 'recur' }, '↻ ' + RECUR[v]) : null;
    default: return h('span', { class: 'txt' }, String(v));
  }
}

/* ---------- Éditeurs de propriétés ---------- */
function editor(pg, p, where) {
  const v = pg.props[p.id];
  const commit = val => { setProp(pg, p, val); refresh(); };
  const ph = where === 'peek' ? h('span', { class: 'ph' }, 'Vide') : null;
  switch (p.type) {
    case 'text': case 'url': case 'number': {
      const inp = h('input', {
        class: 'cell-in', type: p.type === 'number' ? 'number' : 'text', value: v ?? '', step: 'any',
        placeholder: where === 'peek' ? (p.type === 'url' ? 'https://…' : 'Vide') : '',
        oninput: e => {
          const raw = e.target.value;
          setProp(pg, p, p.type === 'number' ? (raw === '' ? null : Number(raw)) : raw);
        },
        onchange: () => { if (where === 'peek') softMain(); },
        onkeydown: enterBlur,
      });
      if (p.type === 'url' && v) return h('div', { class: 'url-ed' }, inp, h('a', { href: normUrl(v), target: '_blank', rel: 'noopener', class: 'url-go', title: 'Ouvrir le lien' }, '↗'));
      if (p.type === 'number' && p.format && p.format !== 'number') return h('div', { class: 'num-ed' }, inp, h('span', { class: 'suffix' }, p.format === 'euro' ? '€' : '%'));
      return inp;
    }
    case 'checkbox':
      return h('input', { type: 'checkbox', class: 'chk', checked: !!v, 'aria-label': p.name, onchange: e => commit(e.target.checked) });
    case 'date':
      return h('button', { class: 'cell-btn', onclick: e => datePop(e.currentTarget, v, commit) }, v ? dateBadge(v, isDone(pg)) : ph);
    case 'select': case 'multi':
      return h('button', { class: 'cell-btn', onclick: e => selectMenu(e.currentTarget, p, v, commit) }, renderValue(p, v) || ph);
    case 'relation':
      return h('button', { class: 'cell-btn', onclick: e => relationMenu(e.currentTarget, p, v, commit) }, renderValue(p, v) || ph);
    case 'recur':
      return h('select', { class: 'cell-sel', onchange: e => commit(e.target.value || null) },
        Object.entries(RECUR).map(([k, l]) => h('option', { value: k, selected: (v || '') === k }, l)));
  }
  return h('span');
}

/* ---------- Vue Tableau ---------- */
function toggleSort(view, pid) {
  if (view.sort?.prop === pid) view.sort = view.sort.dir === 1 ? { prop: pid, dir: -1 } : null;
  else view.sort = { prop: pid, dir: 1 };
  save(); renderMain();
}
const sortMark = (view, pid) => view.sort?.prop === pid ? (view.sort.dir === 1 ? ' ↑' : ' ↓') : '';

function renderTable(body, db, view, pages) {
  const props = visibleProps(db, view);
  const head = h('tr', null,
    h('th', { onclick: () => toggleSort(view, 'title') }, h('span', { class: 'ti' }, 'Aa'), 'Nom', sortMark(view, 'title')),
    props.map(p => h('th', { onclick: () => toggleSort(view, p.id), title: 'Trier par ' + p.name }, h('span', { class: 'ti' }, TYPES[p.type].icon), p.name, sortMark(view, p.id))),
    h('th', { class: 'th-add', title: 'Ajouter une propriété', onclick: () => openSchema(db, true) }, '+'));
  const rows = pages.map(pg => h('tr', { class: isDone(pg) ? 'done' : '' },
    h('td', { class: 'td-title' }, h('div', { class: 'tt' },
      pg.icon ? h('span', { class: 'pi' }, pg.icon) : null,
      h('input', { class: 'cell-in title-in', value: pg.title, placeholder: 'Sans titre', oninput: e => { pg.title = e.target.value; touch(pg); }, onkeydown: enterBlur }),
      h('button', { class: 'open-btn', onclick: () => openPeek(pg.id) }, 'Ouvrir'))),
    props.map(p => h('td', { class: 'td-' + p.type }, editor(pg, p, 'table'))),
    h('td')));
  const foot = [h('span', null, `${pages.length} élément${pages.length > 1 ? 's' : ''}`)];
  for (const p of props) if (p.type === 'number' && p.format === 'euro') {
    const sum = pages.reduce((s, pg) => s + (Number(pg.props[p.id]) || 0), 0);
    foot.push(h('span', null, `${p.name} : `, h('b', null, EUR.format(sum))));
  }
  body.append(
    h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', null, head),
      h('tbody', null, rows, h('tr', { class: 'tr-add' }, h('td', { colspan: props.length + 2 }, quickAdd(db, view)))))),
    h('div', { class: 'tbl-foot' }, foot));
}

/* ---------- Vue Kanban ---------- */
function makeDraggable(el, pg) {
  el.draggable = true;
  el.addEventListener('dragstart', e => {
    ui.dragId = pg.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', pg.id);
    setTimeout(() => el.classList.add('dragging'));
  });
  el.addEventListener('dragend', () => { el.classList.remove('dragging'); ui.dragId = null; clearDrop(); });
}
function clearDrop() {
  document.querySelectorAll('.drop-line').forEach(x => x.remove());
  document.querySelectorAll('.drop').forEach(x => x.classList.remove('drop'));
}
function cardAfter(list, y) {
  return [...list.querySelectorAll('.card:not(.dragging)')].find(c => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; }) || null;
}
function card(pg, db, view, gp) {
  const done = isDone(pg);
  const meta = visibleProps(db, view).filter(p => p.id !== gp.id && !(p.type === 'checkbox' && p.done))
    .map(p => renderValue(p, pg.props[p.id], done)).filter(x => x != null);
  const c = h('div', { class: 'card' + (done ? ' done' : ''), 'data-id': pg.id, onclick: () => openPeek(pg.id) },
    h('div', { class: 'card-title' }, pg.icon ? h('span', { class: 'pi' }, pg.icon) : null, pg.title ? h('span', null, pg.title) : h('span', { class: 'ph' }, 'Sans titre')),
    meta.length ? h('div', { class: 'card-meta' }, meta) : null);
  makeDraggable(c, pg);
  return c;
}
function renderKanban(body, db, view, pages) {
  const gp = propOf(db, view.groupBy);
  if (!gp || !['select', 'checkbox'].includes(gp.type)) {
    const opts = db.props.filter(p => ['select', 'checkbox'].includes(p.type));
    body.append(h('div', { class: 'empty pick-group' },
      h('p', null, 'Choisissez une propriété « Sélection » ou « Case à cocher » pour regrouper les cartes.'),
      opts.length ? h('select', { class: 'in', onchange: e => { view.groupBy = e.target.value; save(); renderMain(); } },
        h('option', { value: '' }, 'Grouper par…'), opts.map(p => h('option', { value: p.id }, p.name)))
        : h('button', { class: 'btn', onclick: () => openSchema(db, true) }, 'Ajouter une propriété')));
    return;
  }
  const groups = gp.type === 'checkbox'
    ? [{ key: false, label: 'Non ' + gp.name.toLowerCase() }, { key: true, label: gp.name, color: 'green', done: gp.done }]
    : [...gp.options.map(o => ({ key: o.id, label: o.name, color: o.color, done: o.done })), { key: null, label: 'Sans ' + gp.name.toLowerCase() }];
  const keyOf = pg => gp.type === 'checkbox' ? !!pg.props[gp.id] : (gp.options.some(o => o.id === pg.props[gp.id]) ? pg.props[gp.id] : null);
  const ap = amountProp(db);
  const board = h('div', { class: 'board' });
  for (const g of groups) {
    const items = pages.filter(pg => keyOf(pg) === g.key);
    if (g.key === null && !items.length) continue;
    if (g.done && view.hideDone && gp.type === 'select') continue;
    const sum = ap ? items.reduce((s, pg) => s + (Number(pg.props[ap.id]) || 0), 0) : 0;
    const addHere = () => createAndOpen(db, { ...defaultsFor(view), [gp.id]: g.key === false ? null : g.key });
    const list = h('div', { class: 'col-cards' }, items.map(pg => card(pg, db, view, gp)));
    const col = h('div', { class: 'col' + (g.done ? ' col-done' : '') },
      h('div', { class: 'col-head' },
        h('span', { class: 'chip c-' + (g.color || 'gray') }, (g.done ? '✓ ' : '') + g.label),
        h('span', { class: 'col-count' }, items.length),
        sum ? h('span', { class: 'col-sum' }, EUR.format(sum)) : null,
        h('button', { class: 'icon-btn sm', title: 'Ajouter ici', onclick: addHere }, '+')),
      list,
      h('button', { class: 'col-add', onclick: addHere }, '+ Nouveau'));
    col.addEventListener('dragover', e => {
      if (!ui.dragId) return;
      e.preventDefault();
      clearDrop();
      col.classList.add('drop');
      const after = cardAfter(list, e.clientY);
      const line = h('div', { class: 'drop-line' });
      after ? list.insertBefore(line, after) : list.append(line);
    });
    col.addEventListener('dragleave', e => { if (!col.contains(e.relatedTarget)) clearDrop(); });
    col.addEventListener('drop', e => {
      e.preventDefault();
      const pg = pageById(ui.dragId);
      if (!pg) return;
      const afterEl = cardAfter(list, e.clientY);
      const sib = items.filter(x => x.id !== pg.id).sort((a, b) => (a.order || 0) - (b.order || 0));
      let i = afterEl ? sib.findIndex(x => x.id === afterEl.dataset.id) : sib.length;
      if (i < 0) i = sib.length;
      const prev = sib[i - 1], next = sib[i];
      pg.order = prev && next ? (prev.order + next.order) / 2 : next ? next.order - 1 : prev ? prev.order + 1 : Date.now();
      ui.dragId = null;
      clearDrop();
      if (keyOf(pg) !== g.key) setProp(pg, gp, g.key === false ? null : g.key); else touch(pg);
      refresh();
    });
    board.append(col);
  }
  body.append(board);
}

/* ---------- Vue Liste ---------- */
function renderList(body, db, view, pages) {
  const marker = hasDoneMarker(db);
  const props = visibleProps(db, view).filter(p => !(p.type === 'checkbox' && p.done));
  body.append(h('div', { class: 'list' },
    h('div', { class: 'list-add' }, quickAdd(db, view)),
    pages.map(pg => {
      const done = isDone(pg);
      const row = h('div', { class: 'list-row' + (done ? ' done' : ''), onclick: () => openPeek(pg.id) },
        marker ? h('input', {
          type: 'checkbox', class: 'chk', checked: done, onclick: e => e.stopPropagation(),
          onchange: e => {
            const val = e.target.checked;
            row.classList.toggle('done', val);
            if (view.hideDone && val) row.classList.add('leaving');
            setTimeout(() => { setDone(pg, val); refresh(); }, view.hideDone && val ? 300 : 0);
          },
        }) : null,
        pg.icon ? h('span', { class: 'pi' }, pg.icon) : null,
        h('span', { class: 'lr-title' }, pg.title || 'Sans titre'),
        h('span', { class: 'lr-meta' }, props.map(p => renderValue(p, pg.props[p.id], done))));
      return row;
    }),
    pages.length ? null : h('div', { class: 'empty', style: { marginTop: '14px' } }, ui.search || view.filters.length ? 'Aucun résultat.' : 'Rien pour l’instant — tapez ci-dessus pour ajouter.')));
}

/* ---------- Vue Calendrier ---------- */
function renderCalendar(body, db, view, pages) {
  const dp = propOf(db, view.dateProp) || dueProp(db);
  if (!dp || dp.type !== 'date') {
    body.append(h('div', { class: 'empty' }, 'Cette base n’a pas de propriété Date.', h('br'), h('button', { class: 'btn', onclick: () => openSchema(db, true) }, 'Ajouter une propriété')));
    return;
  }
  const T = todayISO();
  const ym = ui.cal[view.id] || T.slice(0, 7);
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysIn = new Date(y, m, 0).getDate();
  const cells = Math.ceil((offset + daysIn) / 7) * 7;
  const shift = n => { const d = new Date(y, m - 1 + n, 1); ui.cal[view.id] = iso(d).slice(0, 7); renderMain(); };
  const undated = pages.filter(pg => !pg.props[dp.id]).length;

  const grid = h('div', { class: 'cal-grid' }, ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map(d => h('div', { class: 'cal-dow' }, d)));
  for (let i = 0; i < cells; i++) {
    const d = new Date(y, m - 1, 1 - offset + i), s = iso(d);
    const items = pages.filter(pg => pg.props[dp.id] === s);
    const cell = h('div', { class: 'cal-cell' + (d.getMonth() !== m - 1 ? ' out' : '') + (s === T ? ' today' : '') },
      h('div', { class: 'cal-day' }, h('span', null, d.getDate()),
        h('button', { class: 'cal-add', title: 'Ajouter', onclick: () => createAndOpen(db, { ...defaultsFor(view), [dp.id]: s }) }, '+')),
      items.map(pg => {
        const done = isDone(pg);
        const it = h('div', { class: 'cal-item' + (done ? ' done' : '') + (!done && s < T ? ' late' : ''), title: pg.title, onclick: () => openPeek(pg.id) },
          (pg.icon ? pg.icon + ' ' : '') + (pg.title || 'Sans titre'));
        makeDraggable(it, pg);
        return it;
      }));
    cell.addEventListener('dragover', e => { if (!ui.dragId) return; e.preventDefault(); clearDrop(); cell.classList.add('drop'); });
    cell.addEventListener('dragleave', e => { if (!cell.contains(e.relatedTarget)) cell.classList.remove('drop'); });
    cell.addEventListener('drop', e => {
      e.preventDefault();
      const pg = pageById(ui.dragId);
      ui.dragId = null; clearDrop();
      if (pg) { setProp(pg, dp, s); refresh(); }
    });
    grid.append(cell);
  }
  body.append(
    h('div', { class: 'cal-nav' },
      h('button', { class: 'icon-btn', title: 'Mois précédent', onclick: () => shift(-1) }, '‹'),
      h('div', { class: 'cal-title' }, first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })),
      h('button', { class: 'icon-btn', title: 'Mois suivant', onclick: () => shift(1) }, '›'),
      h('button', { class: 'tool', onclick: () => { delete ui.cal[view.id]; renderMain(); } }, "Aujourd'hui"),
      undated ? h('span', { class: 'muted sm', style: { marginLeft: 'auto' } }, `${undated} sans date`) : null),
    grid);
}

/* ================= Popovers & menus ================= */
let pop = null;
function popover(anchor, content, { width } = {}) {
  closePop();
  const el = h('div', { class: 'pop' }, content);
  if (width) el.style.width = width + 'px';
  document.body.append(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, hh = el.offsetHeight;
  let left = Math.max(8, Math.min(r.left, innerWidth - w - 8));
  let top = r.bottom + 4;
  if (top + hh > innerHeight - 8 && r.top - hh - 4 > 8) top = r.top - hh - 4;
  top = Math.max(8, Math.min(top, innerHeight - hh - 8));
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  pop = el;
  setTimeout(() => document.addEventListener('mousedown', onOutside, true));
  return el;
}
function onOutside(e) { if (pop && !pop.contains(e.target)) closePop(); }
function closePop() {
  if (!pop) return;
  pop.remove();
  pop = null;
  document.removeEventListener('mousedown', onOutside, true);
}
window.addEventListener('resize', closePop);

function pickerMenu(anchor, { getItems, value, multi, onChange, onCreate }) {
  const sel = new Set(multi ? (value || []) : (value ? [value] : []));
  const input = h('input', { class: 'menu-search', placeholder: onCreate ? 'Rechercher ou créer…' : 'Rechercher…' });
  const list = h('div', { class: 'menu-list' });
  let first = null;
  const pick = id => {
    if (multi) { sel.has(id) ? sel.delete(id) : sel.add(id); onChange([...sel]); draw(); }
    else { onChange(id); closePop(); }
  };
  const create = () => { const id = onCreate(input.value.trim()); input.value = ''; pick(id); };
  function draw() {
    list.innerHTML = '';
    const q = norm(input.value.trim());
    const all = getItems();
    const items = all.filter(it => norm(it.text).includes(q));
    first = items[0]?.id ?? null;
    if (!multi && value && !q) list.append(h('div', { class: 'menu-item muted', onclick: () => { onChange(null); closePop(); } }, '✕ Retirer'));
    for (const it of items) list.append(h('div', { class: 'menu-item' + (sel.has(it.id) ? ' on' : ''), onclick: () => pick(it.id) }, it.node, sel.has(it.id) ? h('span', { class: 'check' }, '✓') : null));
    if (q && onCreate && !all.some(it => norm(it.text) === q)) list.append(h('div', { class: 'menu-item create', onclick: create }, '+ Créer ', h('b', null, input.value.trim())));
    if (!items.length && !q) list.append(h('div', { class: 'menu-empty' }, onCreate ? 'Tapez pour créer une option' : 'Aucun élément'));
  }
  input.addEventListener('input', draw);
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = input.value.trim();
    const ex = getItems().find(it => norm(it.text) === norm(q));
    if (ex) pick(ex.id);
    else if (q && onCreate) create();
    else if (first) pick(first);
  });
  draw();
  popover(anchor, h('div', { class: 'menu' }, input, list), { width: 270 });
  input.focus();
}
function selectMenu(anchor, p, v, onChange) {
  pickerMenu(anchor, {
    value: v, multi: p.type === 'multi', onChange,
    getItems: () => p.options.map(o => ({ id: o.id, text: o.name, node: chip(o) })),
    onCreate: name => { const o = opt(name, COLORS[p.options.length % COLORS.length]); p.options.push(o); save(); return o.id; },
  });
}
function relationMenu(anchor, p, v, onChange) {
  const target = dbById(p.target);
  if (!target) return toast('La base liée n’existe plus — modifiez la propriété.');
  pickerMenu(anchor, {
    value: v, multi: true, onChange,
    getItems: () => pagesOf(target).map(x => ({ id: x.id, text: x.title || 'Sans titre', node: h('span', null, (x.icon || target.icon || '📄') + ' ' + (x.title || 'Sans titre')) })),
    onCreate: title => { const np = newPage(target, title); S.pages.push(np); save(); return np.id; },
  });
}
function datePop(anchor, v, onChange) {
  const T = todayISO();
  const inp = h('input', { type: 'date', value: v || '', onchange: e => { if (e.target.value) onChange(e.target.value); } });
  const quick = [["Aujourd'hui", T], ['Demain', addDays(T, 1)], ['Dans une semaine', addDays(T, 7)], ['Dans un mois', addMonths(T, 1)]];
  popover(anchor, h('div', { class: 'pop-body date-pop' },
    inp,
    h('div', { class: 'menu-list', style: { padding: 0 } },
      quick.map(([l, d]) => h('button', { class: 'menu-item', onclick: () => { onChange(d); closePop(); } }, l, h('span', { class: 'muted' }, fmtDate(d)))),
      v ? h('button', { class: 'menu-item danger', onclick: () => { onChange(null); closePop(); } }, 'Effacer la date') : null)), { width: 250 });
}
function emojiPicker(anchor, onPick) {
  popover(anchor, h('div', null,
    h('div', { class: 'emoji-grid' }, EMOJIS.map(e => h('button', { onclick: () => { onPick(e); closePop(); } }, e))),
    h('div', { style: { padding: '0 8px 8px' } }, h('button', { class: 'link-btn', onclick: () => { onPick(''); closePop(); } }, 'Retirer l’icône'))));
}
function colorPop(anchor, o, done) {
  popover(anchor, h('div', { class: 'colors' }, COLORS.map(c => h('button', { onclick: () => { o.color = c; closePop(); done(); } },
    h('span', { class: 'dot c-' + c }), COLOR_NAMES[c]))));
}

/* ---------- Filtres, tri, vues ---------- */
function filterPop(anchor, db, view) {
  const wrap = h('div', { class: 'pop-body' });
  const fields = [fieldOf(db, 'title'), ...db.props];
  const changed = () => { save(); renderMain(); draw(); };
  function valueInput(p, f) {
    const set = v => { f.value = v; save(); renderMain(); };
    if (p.type === 'select' || p.type === 'multi')
      return h('select', { onchange: e => set(e.target.value) }, h('option', { value: '' }, '—'), p.options.map(o => h('option', { value: o.id, selected: o.id === f.value }, o.name)));
    if (p.type === 'recur')
      return h('select', { onchange: e => set(e.target.value) }, Object.entries(RECUR).filter(([k]) => k).map(([k, l]) => h('option', { value: k, selected: k === f.value }, l)));
    if (p.type === 'relation') {
      const t = dbById(p.target);
      return h('select', { onchange: e => set(e.target.value) }, h('option', { value: '' }, '—'), (t ? pagesOf(t) : []).map(x => h('option', { value: x.id, selected: x.id === f.value }, x.title || 'Sans titre')));
    }
    return h('input', { type: p.type === 'number' ? 'number' : 'text', value: f.value ?? '', placeholder: 'Valeur', oninput: e => set(e.target.value) });
  }
  function draw() {
    wrap.innerHTML = '';
    if (!view.filters.length) wrap.append(h('div', { class: 'muted sm' }, 'Aucun filtre sur cette vue.'));
    view.filters.forEach((f, i) => {
      const p = fields.find(x => x.id === f.prop) || fields[0];
      wrap.append(h('div', { class: 'f-row' },
        h('select', { onchange: e => { f.prop = e.target.value; f.op = OPS[fieldOf(db, f.prop).type][0][0]; f.value = null; changed(); } },
          fields.map(x => h('option', { value: x.id, selected: x.id === f.prop }, x.name))),
        h('select', { onchange: e => { f.op = e.target.value; changed(); } }, OPS[p.type].map(([k, l]) => h('option', { value: k, selected: k === f.op }, l))),
        NEEDS_VALUE.has(f.op) ? valueInput(p, f) : null,
        h('button', { class: 'icon-btn sm', title: 'Retirer', onclick: () => { view.filters.splice(i, 1); changed(); } }, '✕')));
    });
    wrap.append(h('button', { class: 'link-btn', onclick: () => { view.filters.push({ prop: 'title', op: 'contains', value: '' }); changed(); } }, '+ Ajouter un filtre'));
  }
  draw();
  popover(anchor, wrap, { width: 470 });
}
function sortPop(anchor, db, view) {
  const fields = [['', 'Ordre manuel'], ['title', 'Nom'], ...db.props.map(p => [p.id, p.name]), ['created', 'Date de création'], ['updated', 'Dernière modification']];
  const set = (prop, dir) => { view.sort = prop ? { prop, dir } : null; save(); renderMain(); };
  popover(anchor, h('div', { class: 'pop-body' },
    h('div', { class: 'pop-label' }, 'TRIER PAR'),
    h('div', { class: 'f-row' },
      h('select', { onchange: e => set(e.target.value, view.sort?.dir || 1) }, fields.map(([k, l]) => h('option', { value: k, selected: (view.sort?.prop || '') === k }, l))),
      h('select', { onchange: e => view.sort && set(view.sort.prop, Number(e.target.value)) },
        h('option', { value: '1', selected: view.sort?.dir !== -1 }, 'Croissant'), h('option', { value: '-1', selected: view.sort?.dir === -1 }, 'Décroissant')))), { width: 330 });
}
function viewDefaults(db, type) {
  const extra = {};
  if (type === 'kanban') extra.groupBy = db.props.find(p => p.type === 'select')?.id || db.props.find(p => p.type === 'checkbox')?.id;
  if (type === 'calendar') extra.dateProp = dueProp(db)?.id;
  return extra;
}
function addViewMenu(anchor, db) {
  popover(anchor, h('div', { class: 'menu-list' },
    Object.entries(VIEW_TYPES).map(([k, t]) => h('button', {
      class: 'menu-item', onclick: () => {
        const v = mkView(t.label, k, viewDefaults(db, k));
        db.views.push(v); db.activeView = v.id; save(); closePop(); renderMain();
      },
    }, h('span', { class: 'vt-ico' }, t.icon), t.label))), { width: 200 });
}
function viewPop(anchor, db, view) {
  const wrap = h('div', { class: 'pop-body' });
  const changed = () => { save(); renderMain(); draw(); };
  function draw() {
    wrap.innerHTML = '';
    const groupable = db.props.filter(p => ['select', 'checkbox'].includes(p.type));
    const dates = db.props.filter(p => p.type === 'date');
    wrap.append(
      h('div', { class: 'pop-label' }, 'NOM DE LA VUE'),
      h('input', { class: 'in', value: view.name, oninput: e => { view.name = e.target.value || 'Vue'; save(); }, onchange: () => renderMain(), onkeydown: enterBlur }),
      h('div', { class: 'pop-label' }, 'DISPOSITION'),
      h('div', { class: 'seg' }, Object.entries(VIEW_TYPES).map(([k, t]) => h('button', {
        class: view.type === k ? 'on' : '', onclick: () => { view.type = k; Object.assign(view, { ...viewDefaults(db, k), groupBy: view.groupBy && propOf(db, view.groupBy) ? view.groupBy : viewDefaults(db, k).groupBy, dateProp: view.dateProp || viewDefaults(db, k).dateProp }); changed(); },
      }, h('span', null, t.icon), t.label))),
      view.type === 'kanban' ? [h('div', { class: 'pop-label' }, 'GROUPER PAR'),
        h('select', { class: 'in', onchange: e => { view.groupBy = e.target.value; changed(); } },
          groupable.map(p => h('option', { value: p.id, selected: p.id === view.groupBy }, p.name)))] : null,
      view.type === 'calendar' ? [h('div', { class: 'pop-label' }, 'DATE UTILISÉE'),
        h('select', { class: 'in', onchange: e => { view.dateProp = e.target.value; changed(); } },
          dates.map(p => h('option', { value: p.id, selected: p.id === (view.dateProp || dueProp(db)?.id) }, p.name)))] : null,
      h('div', { class: 'pop-label' }, 'PROPRIÉTÉS AFFICHÉES'),
      h('div', { class: 'vis-list' }, db.props.map(p => h('label', null,
        h('input', { type: 'checkbox', class: 'chk', checked: !view.hidden.includes(p.id), onchange: e => { view.hidden = e.target.checked ? view.hidden.filter(x => x !== p.id) : [...view.hidden, p.id]; changed(); } }),
        h('span', { class: 'ti muted' }, TYPES[p.type].icon), p.name))),
      h('div', { class: 'menu-sep' }),
      h('button', { class: 'menu-item', onclick: () => { const v = JSON.parse(JSON.stringify(view)); v.id = uid(); v.name += ' (copie)'; db.views.push(v); db.activeView = v.id; save(); closePop(); renderMain(); } }, '⧉ Dupliquer la vue'),
      db.views.length > 1 ? h('button', { class: 'menu-item danger', onclick: () => { db.views = db.views.filter(v => v !== view); db.activeView = db.views[0].id; save(); closePop(); renderMain(); } }, '🗑 Supprimer la vue') : null,
      h('button', { class: 'menu-item danger', onclick: () => deleteDb(db) }, '🗑 Supprimer la base entière'),
    );
  }
  draw();
  popover(anchor, wrap, { width: 320 });
}

/* ================= Modales ================= */
function modal(title, content, { cls = '', onClose } = {}) {
  closeModal();
  const box = h('div', { class: 'modal ' + cls, role: 'dialog' },
    title ? h('div', { class: 'modal-head' }, h('h2', null, title), h('button', { class: 'icon-btn', 'aria-label': 'Fermer', onclick: closeModal }, '✕')) : null,
    h('div', { class: 'modal-body' }, content));
  const ov = h('div', { class: 'overlay', onmousedown: e => { if (e.target === ov) closeModal(); } }, box);
  ov._onClose = onClose;
  $('#modal-root').append(ov);
  return box;
}
function closeModal() {
  const ov = $('#modal-root .overlay');
  if (!ov) return;
  ov.remove();
  ov._onClose?.();
}

function openNewDb() {
  closePop();
  let kind = 'vide';
  const icon = h('button', { class: 'db-icon', style: { fontSize: '24px', width: '40px', height: '40px' }, onclick: e => emojiPicker(e.currentTarget, v => { icon.textContent = v || '📁'; icon.dataset.set = '1'; }) }, '📁');
  const name = h('input', { class: 'in', placeholder: 'Nom de la base (facultatif)' });
  const grid = h('div', { class: 'tpl-grid' });
  const draw = () => {
    grid.innerHTML = '';
    for (const [k, e, n, d] of TEMPLATES) grid.append(h('button', {
      class: 'tpl' + (kind === k ? ' on' : ''),
      onclick: () => { kind = k; if (!icon.dataset.set) icon.textContent = e; draw(); },
    }, h('span', { class: 'te' }, e), h('span', { class: 'tn' }, n), h('span', { class: 'td' }, d)));
  };
  draw();
  const create = () => {
    const { db } = makeDb(kind, { projets: S.dbs.find(d => d.tpl === 'projets')?.id });
    if (name.value.trim()) db.name = name.value.trim();
    else if (kind === 'vide') db.name = 'Nouvelle base';
    db.icon = icon.textContent;
    S.dbs.push(db);
    save(); closeModal();
    location.hash = '#/db/' + db.id;
  };
  name.addEventListener('keydown', e => { if (e.key === 'Enter') create(); });
  modal('Nouvelle base', [
    h('div', { class: 'form-row' }, icon, name),
    h('div', { class: 'pop-label', style: { marginTop: '14px' } }, 'MODÈLE'),
    grid,
    h('div', { class: 'modal-foot' }, h('button', { class: 'btn', onclick: closeModal }, 'Annuler'), h('button', { class: 'btn primary', onclick: create }, 'Créer la base')),
  ]);
  name.focus();
}
function deleteDb(db) {
  closePop();
  const n = pagesOf(db).length;
  if (!confirm(`Supprimer « ${db.name} » et ses ${n} page(s) ? Cette action est définitive (pensez à sauvegarder).`)) return;
  S.dbs = S.dbs.filter(d => d !== db);
  S.pages = S.pages.filter(p => p.db !== db.id);
  for (const d of S.dbs) {
    const gone = d.props.filter(p => p.type === 'relation' && p.target === db.id).map(p => p.id);
    if (!gone.length) continue;
    d.props = d.props.filter(p => !gone.includes(p.id));
    for (const pg of pagesOf(d)) gone.forEach(id => delete pg.props[id]);
    cleanupViews(d);
  }
  save();
  location.hash = '#/home';
  refresh();
}

function cleanupViews(db) {
  for (const v of db.views) {
    const g = propOf(db, v.groupBy);
    if (v.groupBy && (!g || !['select', 'checkbox'].includes(g.type))) v.groupBy = viewDefaults(db, 'kanban').groupBy;
    const d = propOf(db, v.dateProp);
    if (v.dateProp && (!d || d.type !== 'date')) v.dateProp = dueProp(db)?.id;
    if (v.sort && !['title', 'created', 'updated'].includes(v.sort.prop) && !propOf(db, v.sort.prop)) v.sort = null;
    v.filters = v.filters.filter(f => { const p = fieldOf(db, f.prop); return p && OPS[p.type].some(([k]) => k === f.op); });
    v.hidden = v.hidden.filter(id => propOf(db, id));
  }
}
function changeType(db, p, t) {
  const old = p.type;
  if (old === t) return;
  const names = v => old === 'select' ? [p.options.find(o => o.id === v)?.name]
    : old === 'multi' ? v.map(id => p.options.find(o => o.id === id)?.name)
      : old === 'relation' ? v.map(id => pageById(id)?.title)
        : old === 'recur' ? [RECUR[v]] : [v];
  const keepOpts = old === 'select' || old === 'multi';
  const newOpts = (t === 'select' || t === 'multi') && keepOpts ? p.options : [];
  for (const pg of pagesOf(db)) {
    const v = pg.props[p.id];
    if (v == null) continue;
    let nv = null;
    if (t === 'text' || t === 'url') nv = old === 'checkbox' ? (v ? 'Oui' : '') : names(v).filter(Boolean).join(', ');
    else if (t === 'number') { const n = parseFloat(String(v).replace(',', '.')); nv = isNaN(n) ? null : n; }
    else if (t === 'select' || t === 'multi') {
      if (keepOpts) nv = t === 'multi' ? (old === 'multi' ? v : [v]) : (old === 'multi' ? v[0] : v);
      else {
        const ids = names(v).flatMap(s => String(s ?? '').split(',')).map(s => s.trim()).filter(Boolean).map(n => {
          let o = newOpts.find(o => o.name === n);
          if (!o) { o = opt(n, COLORS[newOpts.length % COLORS.length]); newOpts.push(o); }
          return o.id;
        });
        nv = t === 'multi' ? ids : ids[0];
      }
    } else if (t === 'date') nv = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    else if (t === 'checkbox') nv = !isEmpty(v);
    if (isEmpty(nv) && nv !== 0) delete pg.props[p.id]; else pg.props[p.id] = nv;
  }
  p.type = t;
  if (t === 'select' || t === 'multi') p.options = newOpts; else delete p.options;
  if (t === 'relation' && !p.target) p.target = (S.dbs.find(d => d.id !== db.id) || db).id;
  if (t !== 'date') delete p.due;
  if (t !== 'checkbox') delete p.done;
  cleanupViews(db);
  save();
}
function openSchema(db, addNew) {
  closePop();
  const body = h('div', { class: 'schema' });
  function extra(p) {
    if (p.type === 'select' || p.type === 'multi') return h('div', { class: 'sch-opts' },
      p.options.map((o, j) => h('div', { class: 'sch-opt' },
        h('button', { class: 'dot c-' + o.color, title: 'Couleur : ' + COLOR_NAMES[o.color], onclick: e => colorPop(e.currentTarget, o, () => { save(); draw(); }) }),
        h('input', { class: 'in sm', value: o.name, oninput: e => { o.name = e.target.value; save(); } }),
        p.type === 'select' ? h('label', { class: 'sch-done', title: 'Les éléments avec cette option sont considérés comme terminés' },
          h('input', { type: 'checkbox', class: 'chk', checked: !!o.done, onchange: e => { if (e.target.checked) o.done = true; else delete o.done; save(); } }), 'terminé') : null,
        h('button', { class: 'icon-btn sm', title: 'Monter', disabled: j === 0, onclick: () => { p.options.splice(j - 1, 0, p.options.splice(j, 1)[0]); save(); draw(); } }, '↑'),
        h('button', { class: 'icon-btn sm danger', title: 'Supprimer l’option', onclick: () => { p.options.splice(j, 1); save(); draw(); } }, '✕'))),
      h('button', { class: 'link-btn', onclick: () => { p.options.push(opt('Option ' + (p.options.length + 1), COLORS[p.options.length % COLORS.length])); save(); draw(); } }, '+ Ajouter une option'));
    if (p.type === 'checkbox') return h('label', { class: 'sch-flag' },
      h('input', { type: 'checkbox', class: 'chk', checked: !!p.done, onchange: e => { p.done = e.target.checked; save(); } }), 'Cochée = terminé (masquage, rappels, récurrence)');
    if (p.type === 'date') return h('label', { class: 'sch-flag' },
      h('input', { type: 'checkbox', class: 'chk', checked: !!p.due, onchange: e => { db.props.forEach(x => { if (x.type === 'date') delete x.due; }); if (e.target.checked) p.due = true; save(); draw(); } }),
      "Date d'échéance (accueil, rappels, récurrence)");
    if (p.type === 'number') return h('div', { class: 'sch-sub' }, 'Format',
      h('select', { class: 'in sm', onchange: e => { p.format = e.target.value; save(); } }, Object.entries(NUM_FORMATS).map(([k, l]) => h('option', { value: k, selected: (p.format || 'number') === k }, l))));
    if (p.type === 'relation') return h('div', { class: 'sch-sub' }, 'Liée à',
      h('select', { class: 'in sm', onchange: e => { p.target = e.target.value; for (const pg of pagesOf(db)) delete pg.props[p.id]; save(); } },
        S.dbs.map(d => h('option', { value: d.id, selected: d.id === p.target }, d.icon + ' ' + d.name))));
    if (p.type === 'recur') return h('div', { class: 'sch-sub' }, 'Quand l’élément est marqué terminé, son échéance avance automatiquement.');
    return null;
  }
  function draw() {
    body.innerHTML = '';
    db.props.forEach((p, i) => body.append(h('div', { class: 'sch-prop' },
      h('div', { class: 'sch-line' },
        h('span', { class: 'ti' }, TYPES[p.type].icon),
        h('input', { class: 'in', value: p.name, 'aria-label': 'Nom de la propriété', oninput: e => { p.name = e.target.value || 'Sans nom'; save(); } }),
        h('select', { class: 'in', 'aria-label': 'Type', onchange: e => { changeType(db, p, e.target.value); draw(); } },
          Object.entries(TYPES).map(([k, t]) => h('option', { value: k, selected: k === p.type }, t.label))),
        h('button', { class: 'icon-btn sm', title: 'Monter', disabled: i === 0, onclick: () => { db.props.splice(i - 1, 0, db.props.splice(i, 1)[0]); save(); draw(); } }, '↑'),
        h('button', { class: 'icon-btn sm', title: 'Descendre', disabled: i === db.props.length - 1, onclick: () => { db.props.splice(i + 1, 0, db.props.splice(i, 1)[0]); save(); draw(); } }, '↓'),
        h('button', {
          class: 'icon-btn sm danger', title: 'Supprimer', onclick: () => {
            if (!confirm(`Supprimer la propriété « ${p.name} » et toutes ses valeurs ?`)) return;
            db.props.splice(i, 1);
            for (const pg of pagesOf(db)) delete pg.props[p.id];
            cleanupViews(db); save(); draw();
          },
        }, '✕')),
      extra(p))));
    body.append(h('button', { class: 'btn', onclick: addProp }, '+ Ajouter une propriété'));
  }
  function addProp() {
    db.props.push(mkProp('Nouvelle propriété', 'text'));
    save(); draw();
    const ins = body.querySelectorAll('.sch-line .in:not(select)');
    ins[ins.length - 1]?.select();
  }
  draw();
  modal(`Propriétés — ${db.name}`, body, { onClose: () => { save(); refresh(); } });
  if (addNew) addProp();
}

/* ---------- Recherche rapide (Ctrl+K) ---------- */
function openQuickFind() {
  closePop();
  const input = h('input', { class: 'qf-in', placeholder: 'Rechercher une page ou une base…' });
  const list = h('div', { class: 'qf-list' });
  let results = [], sel = 0;
  const openRes = r => { closeModal(); if (r.kind === 'db') location.hash = '#/db/' + r.d.id; else openPeek(r.p.id); };
  function draw() {
    const q = norm(input.value.trim());
    results = [
      ...S.dbs.filter(d => norm(d.name).includes(q)).map(d => ({ kind: 'db', d })),
      ...S.pages.filter(p => !q || norm(p.title).includes(q)).sort((a, b) => b.updated - a.updated).slice(0, 40).map(p => ({ kind: 'page', p })),
    ];
    sel = Math.min(sel, Math.max(0, results.length - 1));
    list.innerHTML = '';
    results.forEach((r, i) => {
      const db = r.kind === 'db' ? r.d : dbById(r.p.db);
      list.append(h('div', { class: 'menu-item' + (i === sel ? ' kb' : ''), onclick: () => openRes(r) },
        h('span', null, r.kind === 'db' ? db.icon : (r.p.icon || db?.icon || '📄')),
        h('span', null, r.kind === 'db' ? db.name : (r.p.title || 'Sans titre')),
        h('span', { class: 'muted' }, r.kind === 'db' ? 'Base' : db?.name)));
    });
    if (!results.length) list.append(h('div', { class: 'menu-empty' }, 'Aucun résultat'));
    list.children[sel]?.scrollIntoView({ block: 'nearest' });
  }
  input.addEventListener('input', () => { sel = 0; draw(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, results.length - 1); draw(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
    if (e.key === 'Enter' && results[sel]) openRes(results[sel]);
  });
  draw();
  modal(null, [input, list], { cls: 'qf' });
  input.focus();
}

/* ================= Page (panneau latéral) ================= */
function openPeek(id, opts = {}) { closePop(); ui.peek = id; renderPeek(opts); }
function closePeek() {
  ui.peek = null;
  $('#peek-root').innerHTML = '';
  renderMain(); renderSidebar(); updateTitle();
}
function closestEl(node, sel, root) {
  const el = node && (node.nodeType === 1 ? node : node.parentElement);
  const c = el?.closest(sel);
  return c && root.contains(c) ? c : null;
}
function renderPeek(opts = {}) {
  const root = $('#peek-root');
  const pg = pageById(ui.peek);
  if (!pg) { ui.peek = null; root.innerHTML = ''; return; }
  const db = dbById(pg.db);
  const prev = root.querySelector('.peek');
  const st = prev ? prev.scrollTop : 0;
  root.innerHTML = '';

  const title = h('textarea', {
    class: 'peek-title', rows: 1, placeholder: 'Sans titre', value: pg.title,
    oninput: e => { pg.title = e.target.value.replace(/\n/g, ''); touch(pg); autosize(e.target); softMain(); },
    onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); content.focus(); } },
  });
  const content = h('div', {
    class: 'content', contenteditable: 'true', spellcheck: 'true',
    'data-ph': 'Écrivez vos notes… Raccourcis : « # » titre, « - » liste, « [] » case à cocher, « > » citation',
    html: pg.content || '',
  });
  const syncContent = () => { pg.content = content.innerHTML; touch(pg); };
  content.addEventListener('input', e => {
    // différé : Chrome ignore les execCommand imbriqués dans un événement input
    if (e.inputType === 'insertText' && e.data === ' ') setTimeout(() => { mdShortcut(content); syncContent(); });
    syncContent();
  });
  content.addEventListener('blur', () => { if (!content.textContent.trim() && !content.querySelector('hr,li,img')) { content.innerHTML = ''; syncContent(); } });
  content.addEventListener('click', e => {
    const li = closestEl(e.target, 'ul.checklist > li', content);
    if (!li || e.clientX - li.getBoundingClientRect().left > 24) return;
    li.dataset.done = li.dataset.done === 'true' ? 'false' : 'true';
    syncContent();
  });
  content.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    // une nouvelle case à cocher ne doit pas hériter de l'état « cochée »
    setTimeout(() => {
      const li = closestEl(getSelection().anchorNode, 'ul.checklist > li', content);
      if (li && !li.textContent.trim()) li.removeAttribute('data-done');
    });
  });
  content.addEventListener('paste', e => {
    // colle en texte brut pour garder des notes propres
    const t = e.clipboardData?.getData('text/plain');
    if (t == null) return;
    e.preventDefault();
    document.execCommand('insertText', false, t);
  });

  const exec = (cmd, val) => () => document.execCommand(cmd, false, val);
  const tb = (label, tip, fn) => h('button', {
    class: 'tb', title: tip, onmousedown: e => {
      e.preventDefault();
      if (!content.contains(getSelection().anchorNode)) content.focus();
      fn(); syncContent();
    },
  }, label);
  const sep = () => h('span', { class: 'tb-sep' });

  const panel = h('aside', { class: 'peek' + (ui.peekWide ? ' wide' : ''), role: 'dialog', 'aria-label': pg.title || 'Page' },
    h('div', { class: 'peek-top' },
      h('a', { class: 'crumb', href: '#/db/' + db.id, onclick: () => { ui.peek = null; $('#peek-root').innerHTML = ''; } }, db.icon, ' ', db.name),
      h('button', { class: 'icon-btn', title: ui.peekWide ? 'Réduire' : 'Agrandir', onclick: () => { ui.peekWide = !ui.peekWide; renderPeek(); } }, ui.peekWide ? '⇥' : '⇤'),
      h('button', { class: 'icon-btn', title: 'Dupliquer', onclick: () => duplicatePage(pg) }, '⧉'),
      h('button', { class: 'icon-btn danger', title: 'Supprimer', onclick: () => deletePage(pg.id) }, '🗑'),
      h('button', { class: 'icon-btn', title: 'Fermer (Échap)', onclick: closePeek }, '✕')),
    h('div', { class: 'peek-in' },
      pg.icon
        ? h('button', { class: 'peek-icon', title: "Changer l'icône", onclick: e => emojiPicker(e.currentTarget, v => { pg.icon = v; touch(pg); refresh(); }) }, pg.icon)
        : h('button', { class: 'peek-icon add', onclick: e => emojiPicker(e.currentTarget, v => { pg.icon = v; touch(pg); refresh(); }) }, '☺ Ajouter une icône'),
      title,
      h('div', { class: 'props' }, db.props.map(p => [
        h('div', { class: 'p-label', title: TYPES[p.type].label }, h('span', { class: 'ti' }, TYPES[p.type].icon), p.name),
        h('div', { class: 'p-val' }, editor(pg, p, 'peek')),
      ])),
      h('button', { class: 'link-btn sm', onclick: () => openSchema(db, true) }, '+ Ajouter une propriété'),
      h('div', { class: 'peek-meta' },
        h('span', null, 'Créé le ' + new Date(pg.created).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })),
        h('span', null, 'Modifié le ' + new Date(pg.updated).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }))),
      h('hr', { class: 'peek-hr' }),
      h('div', { class: 'ed-tools' },
        tb('B', 'Gras (Ctrl+B)', exec('bold')), tb('I', 'Italique (Ctrl+I)', exec('italic')), tb('U', 'Souligné (Ctrl+U)', exec('underline')), tb('S̶', 'Barré', exec('strikeThrough')),
        sep(),
        tb('H1', 'Grand titre', exec('formatBlock', '<h1>')), tb('H2', 'Titre', exec('formatBlock', '<h2>')), tb('H3', 'Sous-titre', exec('formatBlock', '<h3>')), tb('¶', 'Paragraphe', exec('formatBlock', '<p>')),
        sep(),
        tb('•', 'Liste à puces', exec('insertUnorderedList')), tb('1.', 'Liste numérotée', exec('insertOrderedList')), tb('☑', 'Liste de cases à cocher', () => toggleChecklist(content)),
        tb('❝', 'Citation', exec('formatBlock', '<blockquote>')), tb('―', 'Séparateur', exec('insertHorizontalRule')),
        sep(),
        tb('🔗', 'Lien', () => { const u = prompt('Adresse du lien :', 'https://'); if (u) document.execCommand('createLink', false, normUrl(u)); }),
        tb('⌫', 'Effacer la mise en forme', exec('removeFormat'))),
      content));
  root.append(h('div', { class: 'peek-backdrop', onclick: closePeek }), panel);
  content.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  requestAnimationFrame(() => {
    autosize(title);
    panel.scrollTop = st;
    if (opts.focusTitle) title.focus();
  });
}
function autosize(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }

function toggleChecklist(content) {
  let li = closestEl(getSelection().anchorNode, 'li', content);
  let ul = li?.closest('ul');
  if (ul && ul.classList.contains('checklist')) { document.execCommand('insertUnorderedList'); return; }
  if (!ul) {
    document.execCommand('insertUnorderedList');
    li = closestEl(getSelection().anchorNode, 'li', content);
    ul = li?.closest('ul');
  }
  if (ul) ul.classList.add('checklist');
  unwrapList(content);
}
// Raccourcis Markdown en début de ligne : #, ##, ###, -, *, 1., [], >  (déclenchés par l'espace)
const MD = { '#': ['formatBlock', '<h1>'], '##': ['formatBlock', '<h2>'], '###': ['formatBlock', '<h3>'], '-': ['ul'], '*': ['ul'], '1.': ['ol'], '[]': ['todo'], '>': ['formatBlock', '<blockquote>'] };
function mdShortcut(content) {
  const sel = getSelection();
  if (!sel.rangeCount || !sel.isCollapsed) return;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== 3 || node.previousSibling) return;
  const block = node.parentElement;
  if (block !== content && !/^(P|DIV|H[1-3])$/.test(block.tagName)) return;
  const before = node.textContent.slice(0, sel.anchorOffset);
  const cmd = MD[before.slice(0, -1)];
  if (!cmd || !/[  ]$/.test(before)) return;
  const range = document.createRange();
  range.setStart(node, 0);
  range.setEnd(node, sel.anchorOffset);
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand('delete');
  if (cmd[0] === 'formatBlock') document.execCommand('formatBlock', false, cmd[1]);
  else if (cmd[0] === 'ul') document.execCommand('insertUnorderedList');
  else if (cmd[0] === 'ol') document.execCommand('insertOrderedList');
  else toggleChecklist(content);
  unwrapList(content);
}
// Chrome place parfois la liste créée dans un <p> : on la remonte d'un niveau.
function unwrapList(content) {
  const li = closestEl(getSelection().anchorNode, 'li', content);
  const list = li?.parentElement, par = list?.parentElement;
  if (!par || par === content || par.tagName !== 'P' || par.childNodes.length !== 1) return;
  par.replaceWith(list);
  const r = document.createRange();
  r.selectNodeContents(li);
  r.collapse(false);
  getSelection().removeAllRanges();
  getSelection().addRange(r);
}

function duplicatePage(pg) {
  const c = JSON.parse(JSON.stringify(pg));
  Object.assign(c, { id: uid(), title: pg.title + ' (copie)', created: Date.now(), updated: Date.now(), order: pg.order + 0.5 });
  S.pages.push(c);
  save();
  openPeek(c.id);
  renderMain();
  toast('Page dupliquée');
}
function deletePage(id) {
  const i = S.pages.findIndex(p => p.id === id);
  if (i < 0) return;
  const [pg] = S.pages.splice(i, 1);
  save();
  closePeek();
  toast(`« ${pg.title || 'Sans titre'} » supprimé`, { label: 'Annuler', fn: () => { S.pages.splice(i, 0, pg); save(); refresh(); } });
}

/* ================= Toasts ================= */
function toast(msg, action) {
  const t = h('div', { class: 'toast', role: 'status' }, h('span', null, msg),
    action ? h('button', { onclick: () => { action.fn(); t.remove(); } }, action.label) : null);
  $('#toasts').append(t);
  setTimeout(() => t.classList.add('out'), 4800);
  setTimeout(() => t.remove(), 5300);
}
const go = hash => { location.hash = hash; };

/* ================= Rappels, export, import ================= */
async function enableNotifs() {
  if (!('Notification' in window)) return toast('Ce navigateur ne gère pas les notifications. Utilisez l’export .ics vers votre agenda.');
  if (Notification.permission === 'granted') { checkNotifs(true); return toast('Rappels déjà activés ✓'); }
  const r = await Notification.requestPermission();
  if (r === 'granted') { toast('Rappels activés — ils s’affichent quand l’app est ouverte.'); checkNotifs(true); }
  else toast('Notifications refusées par le navigateur.');
  renderSidebar(); renderMain();
}
async function notify(title, opts) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return await reg.showNotification(title, opts);
  } catch (e) { /* repli ci-dessous */ }
  try { new Notification(title, opts); } catch (e) { /* ignoré */ }
}
function checkNotifs(force) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const T = todayISO();
  let sent = {};
  try { sent = JSON.parse(localStorage.getItem(NOTIF_KEY)) || {}; } catch (e) { /* vide */ }
  for (const k in sent) if (!k.endsWith('@' + T)) delete sent[k];
  for (const i of dueItems().filter(i => i.n <= 1)) {
    const k = i.pg.id + '@' + T;
    if (sent[k] && !force) continue;
    sent[k] = 1;
    const when = i.n < 0 ? `En retard (${fmtDate(i.d)})` : i.n === 0 ? "Aujourd'hui" : 'Demain';
    notify(`${i.pg.title || 'Sans titre'}`, { body: `${when} · ${i.db.icon} ${i.db.name}${i.amt ? ' · ' + EUR.format(i.amt) : ''}`, tag: i.pg.id, icon: 'icon.svg' });
  }
  localStorage.setItem(NOTIF_KEY, JSON.stringify(sent));
}
function download(name, text, type) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function exportJSON() {
  saveNow();
  download(`mon-espace-${todayISO()}.json`, JSON.stringify(S, null, 2), 'application/json');
  toast('Sauvegarde téléchargée');
}
function exportICS() {
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const ymd = s => s.replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const RR = { weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY', quarterly: 'FREQ=MONTHLY;INTERVAL=3', yearly: 'FREQ=YEARLY' };
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mon espace//FR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + esc(S.name)];
  const items = dueItems();
  for (const i of items) {
    const rp = i.db.props.find(p => p.type === 'recur');
    const r = rp && i.pg.props[rp.id];
    const title = (i.pg.title || 'Sans titre') + (i.amt ? ` — ${EUR.format(i.amt)}` : '');
    lines.push('BEGIN:VEVENT', `UID:${i.pg.id}@mon-espace`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(i.d)}`, `DTEND;VALUE=DATE:${ymd(addDays(i.d, 1))}`,
      'SUMMARY:' + esc(title), 'DESCRIPTION:' + esc(`${i.db.name}`), 'CATEGORIES:' + esc(i.db.name));
    if (r && RR[r]) lines.push('RRULE:' + RR[r]);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(title), 'TRIGGER:-PT15H', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(title), 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  download(`rappels-${todayISO()}.ics`, lines.join('\r\n'), 'text/calendar');
  toast(`${items.length} échéance(s) exportée(s) — ouvrez le fichier pour les ajouter à votre agenda (rappel la veille et le jour même).`);
}
$('#import-file').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.dbs) || !Array.isArray(d.pages)) throw new Error('format');
    if (!confirm(`Remplacer toutes les données actuelles par cette sauvegarde (${d.dbs.length} bases, ${d.pages.length} pages) ?`)) return;
    S = migrate(d);
    saveNow();
    ui.peek = null; $('#peek-root').innerHTML = '';
    location.hash = '#/home';
    render();
    toast('Sauvegarde restaurée ✓');
  } catch (err) { toast('Fichier invalide : ce n’est pas une sauvegarde Mon espace.'); }
});

/* ================= Clavier & démarrage ================= */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openQuickFind(); return; }
  if (e.key === 'Escape') {
    if (pop) closePop();
    else if ($('#modal-root .overlay')) closeModal();
    else if (ui.peek) closePeek();
    else document.body.classList.remove('sb-open');
  }
});
// Synchronise les onglets ouverts en même temps.
window.addEventListener('storage', e => {
  if (e.key !== KEY || !e.newValue) return;
  try { S = migrate(JSON.parse(e.newValue)); parseHash(); render(); } catch (err) { /* ignoré */ }
});

document.execCommand('defaultParagraphSeparator', false, 'p');
S = load();
parseHash();
render();
saveNow();
checkNotifs();
setInterval(() => { checkNotifs(); updateTitle(); }, 15 * 60 * 1000);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
