'use strict';
/*
 * Braindead — Notion/Coda-style pages, databases and views, 100% static.
 * Data lives in the browser's localStorage (exportable as JSON).
 */

/* ================= Constants ================= */
const KEY = 'monespace.v1';
const NOTIF_KEY = 'monespace.notified';

const COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
const COLOR_NAMES = { gray: 'Grey', brown: 'Brown', orange: 'Orange', yellow: 'Yellow', green: 'Green', blue: 'Blue', purple: 'Purple', pink: 'Pink', red: 'Red' };
const TYPES = {
  text: { label: 'Text', icon: '≡' },
  number: { label: 'Number', icon: '#' },
  select: { label: 'Select', icon: '◉' },
  multi: { label: 'Multi-select', icon: '☷' },
  date: { label: 'Date', icon: '◷' },
  checkbox: { label: 'Checkbox', icon: '☑' },
  url: { label: 'URL', icon: '↗' },
  relation: { label: 'Relation', icon: '⇄' },
  recur: { label: 'Recurrence', icon: '↻' },
};
const RECUR = { '': 'None', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };
const NUM_FORMATS = { number: 'Number', euro: 'Euro (€)', percent: 'Percent (%)' };
const VIEW_TYPES = {
  table: { label: 'Table', icon: '▤' },
  kanban: { label: 'Kanban', icon: '▥' },
  list: { label: 'List', icon: '☰' },
  calendar: { label: 'Calendar', icon: '◫' },
};
const THEMES = [
  { id: 'neige', name: 'Snow', bg: '#ffffff', ac: '#2f80ed' },
  { id: 'sable', name: 'Sand', bg: '#f3ece1', ac: '#c2683a' },
  { id: 'menthe', name: 'Mint', bg: '#e8f4ee', ac: '#1f9d6b' },
  { id: 'lavande', name: 'Lavender', bg: '#efeafb', ac: '#7c5cd6' },
  { id: 'peche', name: 'Peach', bg: '#fdeae2', ac: '#e8684a' },
  { id: 'ciel', name: 'Sky', bg: '#e6effc', ac: '#2b6fd6' },
  { id: 'papier', name: 'Paper', bg: '#ece4d4', ac: '#8a6d3b' },
  { id: 'nuit', name: 'Night', bg: '#202020', ac: '#5aa2d6' },
  { id: 'encre', name: 'Ink', bg: '#141e2e', ac: '#7aa2f7' },
];
const EMOJIS = ['📋', '✅', '📌', '🎯', '⭐', '🔥', '💡', '📝', '📁', '📂', '🗂️', '📄', '🧾', '📮', '✉️', '🏦', '💳', '💶',
  '💰', '🧮', '🏠', '🔑', '🛠️', '🔧', '🚗', '⛽', '🏥', '💊', '🦷', '🎓', '💼', '💻', '📱', '📅', '⏰', '🔔',
  '🛒', '🧺', '🍎', '🥕', '🥖', '🧀', '🥛', '🥚', '🍝', '🍷', '☕', '🧴', '🧻', '🧼', '🐶', '🐱', '🌱', '🌻',
  '✈️', '🏖️', '🎁', '📦', '🎨', '🎵', '📚', '🏃', '🧘', '❤️', '👶', '🎉', '🛁', '🔌', '📺', '🌍', '⚖️', '🪪'];
const TEMPLATES = [
  ['vide', '📁', 'Blank', 'A status and a date, ready to customise'],
  ['taches', '✅', 'Tasks', 'Status, priority, due date, project'],
  ['projets', '🎯', 'Projects', 'Progress, dates, priority, tags'],
  ['courses', '🛒', 'Groceries', 'Aisles, quantities, store, bought'],
  ['admin', '🗂️', 'Paperwork', 'Admin tasks, organisations, deadlines'],
  ['paiements', '💶', 'Bills & reminders', 'Amounts, recurrence, paid'],
];

/* ================= Utilities ================= */
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
let seq = 0;
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const isEmpty = v => v == null || v === '' || v === false || (Array.isArray(v) && !v.length);
const enterBlur = e => { if (e.key === 'Enter') e.target.blur(); };
const EUR = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });

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

/* --- Dates (ISO YYYY-MM-DD, local time) --- */
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
  return d.toLocaleDateString('en-GB', o);
}
function relDate(s) {
  const n = diffDays(s, todayISO());
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n < 0) return `${fmtDate(s)} · ${-n}d late`;
  if (n < 7) return parseD(s).toLocaleDateString('en-GB', { weekday: 'long' });
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

/* ================= State ================= */
let S; // initialised at startup (bottom of file)
const ui = { route: { name: 'home' }, routeKey: '', peek: null, peekWide: false, search: '', cal: {}, dragId: null, apps: [] };

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.dbs) && Array.isArray(d.pages)) return migrate(d);
  } catch (e) { /* unreadable data: start again from the examples */ }
  return seed();
}
function migrate(d) {
  d.name ||= 'Braindead';
  d.theme ||= 'neige';
  for (const db of d.dbs) {
    db.views ||= [];
    for (const v of db.views) { v.filters ||= []; v.hidden ||= []; }
  }
  return d;
}
let saveT;
// savedAt marks the latest edit, so the newest copy wins when syncing with a file.
function save() { S.savedAt = Date.now(); clearTimeout(saveT); saveT = setTimeout(saveNow, 150); }
function saveNow() {
  clearTimeout(saveT);
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast("Couldn't save: is the browser storage full?"); }
  schedulePush();
  notifyApps();
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
// A completed recurring item is rescheduled to its next due date.
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
  pg.content = (pg.content || '') + `<p class="log">✓ Due ${fmtDate(d, true)} — done on ${fmtDate(todayISO(), true)}</p>`;
  touch(pg);
  toast(`↻ “${pg.title || 'Untitled'}” rescheduled to ${fmtDate(next, true)}`);
}

/* ================= Templates & examples ================= */
const opt = (name, color, done) => (done ? { id: uid(), name, color, done: true } : { id: uid(), name, color });
const mkProp = (name, type, extra = {}) => ({ id: uid(), name, type, ...(type === 'select' || type === 'multi' ? { options: [] } : {}), ...extra });
const mkView = (name, type, extra = {}) => ({ id: uid(), name, type, filters: [], sort: null, hideDone: false, hidden: [], ...extra });
const prioOpts = () => [opt('High', 'red'), opt('Medium', 'orange'), opt('Low', 'gray')];

function makeDb(kind, ctx = {}) {
  const P = {};
  let db;
  switch (kind) {
    case 'taches':
      db = {
        name: 'Tasks', icon: '✅', props: [
          P.statut = mkProp('Status', 'select', { options: [opt('To do', 'gray'), opt('In progress', 'blue'), opt('Waiting', 'yellow'), opt('Done', 'green', true)] }),
          P.prio = mkProp('Priority', 'select', { options: prioOpts() }),
          P.ech = mkProp('Due date', 'date', { due: true }),
          P.cat = mkProp('Category', 'multi', { options: [opt('Personal', 'purple'), opt('Home', 'brown'), opt('Work', 'blue'), opt('Health', 'green')] }),
          ctx.projets ? (P.projet = mkProp('Project', 'relation', { target: ctx.projets })) : null,
          P.lien = mkProp('Link', 'url'),
        ].filter(Boolean),
      };
      db.views = [
        mkView('By status', 'kanban', { groupBy: P.statut.id }),
        mkView('Table', 'table', { sort: { prop: P.ech.id, dir: 1 } }),
        mkView('By priority', 'kanban', { groupBy: P.prio.id, hideDone: true }),
        mkView('Calendar', 'calendar', { dateProp: P.ech.id }),
      ];
      break;
    case 'projets':
      db = {
        name: 'Projects', icon: '🎯', props: [
          P.statut = mkProp('Status', 'select', { options: [opt('Idea', 'gray'), opt('Planned', 'purple'), opt('In progress', 'blue'), opt('On hold', 'yellow'), opt('Done', 'green', true)] }),
          P.prio = mkProp('Priority', 'select', { options: prioOpts() }),
          P.debut = mkProp('Start', 'date'),
          P.fin = mkProp('End', 'date', { due: true }),
          P.avancement = mkProp('Progress', 'number', { format: 'percent' }),
          P.tags = mkProp('Tags', 'multi', { options: [opt('Home', 'brown'), opt('Leisure', 'pink'), opt('Pro', 'blue'), opt('Family', 'orange')] }),
          P.lien = mkProp('Link', 'url'),
        ],
      };
      db.views = [
        mkView('By status', 'kanban', { groupBy: P.statut.id }),
        mkView('Table', 'table', { sort: { prop: P.fin.id, dir: 1 } }),
        mkView('Calendar', 'calendar', { dateProp: P.fin.id }),
      ];
      break;
    case 'courses':
      db = {
        name: 'Groceries', icon: '🛒', props: [
          P.rayon = mkProp('Aisle', 'select', { options: [opt('Fruit & veg', 'green'), opt('Fresh', 'blue'), opt('Bakery', 'brown'), opt('Pantry', 'orange'), opt('Drinks', 'purple'), opt('Frozen', 'gray'), opt('Toiletries', 'pink'), opt('Home', 'yellow')] }),
          P.qte = mkProp('Quantity', 'text'),
          P.magasin = mkProp('Store', 'select', { options: [opt('Supermarket', 'blue'), opt('Market', 'green'), opt('Organic', 'yellow'), opt('Pharmacy', 'red')] }),
          P.achete = mkProp('Bought', 'checkbox', { done: true }),
          P.prix = mkProp('Price', 'number', { format: 'euro' }),
        ],
      };
      db.views = [
        mkView('To buy', 'kanban', { groupBy: P.rayon.id, hideDone: true }),
        mkView('List', 'list', { sort: { prop: P.rayon.id, dir: 1 }, hidden: [P.prix.id] }),
        mkView('By store', 'kanban', { groupBy: P.magasin.id, hideDone: true }),
      ];
      break;
    case 'admin':
      db = {
        name: 'Paperwork', icon: '🗂️', props: [
          P.statut = mkProp('Status', 'select', { options: [opt('To do', 'gray'), opt('In progress', 'blue'), opt('Awaiting reply', 'yellow'), opt('Done', 'green', true)] }),
          P.type = mkProp('Type', 'select', { options: [opt('Taxes', 'red'), opt('Bank', 'blue'), opt('Health', 'green'), opt('Housing', 'brown'), opt('Insurance', 'purple'), opt('Car', 'orange'), opt('Work', 'gray'), opt('ID', 'pink')] }),
          P.ech = mkProp('Due date', 'date', { due: true }),
          P.organisme = mkProp('Organisation', 'text'),
          P.prio = mkProp('Priority', 'select', { options: prioOpts() }),
          P.lien = mkProp('Link', 'url'),
        ],
      };
      db.views = [
        mkView('By status', 'kanban', { groupBy: P.statut.id }),
        mkView('Table', 'table', { sort: { prop: P.ech.id, dir: 1 } }),
        mkView('By type', 'kanban', { groupBy: P.type.id, hideDone: true }),
        mkView('Calendar', 'calendar', { dateProp: P.ech.id }),
      ];
      break;
    case 'paiements':
      db = {
        name: 'Bills & reminders', icon: '💶', props: [
          P.montant = mkProp('Amount', 'number', { format: 'euro' }),
          P.ech = mkProp('Due date', 'date', { due: true }),
          P.recur = mkProp('Recurrence', 'recur'),
          P.paye = mkProp('Paid', 'checkbox', { done: true }),
          P.cat = mkProp('Category', 'select', { options: [opt('Rent', 'brown'), opt('Energy', 'yellow'), opt('Internet & phone', 'blue'), opt('Insurance', 'purple'), opt('Subscription', 'pink'), opt('Taxes', 'red'), opt('Loan', 'orange'), opt('Other', 'gray')] }),
          P.moyen = mkProp('Method', 'select', { options: [opt('Direct debit', 'gray'), opt('Transfer', 'blue'), opt('Card', 'green'), opt('Cheque', 'orange')] }),
          P.lien = mkProp('Link', 'url'),
        ],
      };
      db.views = [
        mkView('Upcoming', 'table', { sort: { prop: P.ech.id, dir: 1 }, hideDone: true }),
        mkView('Calendar', 'calendar', { dateProp: P.ech.id }),
        mkView('By category', 'kanban', { groupBy: P.cat.id }),
      ];
      break;
    default:
      db = {
        name: 'New database', icon: '📁', props: [
          P.statut = mkProp('Status', 'select', { options: [opt('To do', 'gray'), opt('In progress', 'blue'), opt('Done', 'green', true)] }),
          P.date = mkProp('Date', 'date', { due: true }),
          P.tags = mkProp('Tags', 'multi'),
        ],
      };
      db.views = [mkView('Table', 'table'), mkView('Kanban', 'kanban', { groupBy: P.statut.id })];
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
  const data = { version: 1, name: 'Braindead', theme: 'neige', dbs: [], pages: [] };
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

  const sdb = add(pr, 'Renovate the bathroom', { statut: 'In progress', prio: 'High', debut: d(-20), fin: d(40), avancement: 35, tags: ['Home'] }, { icon: '🛁',
    content: '<h2>Goal</h2><p>Replace the shower and sink before winter.</p><h3>Budget</h3><ul><li>Tiles: €600</li><li>Plumber: €900</li></ul>' });
  const vac = add(pr, 'Summer holidays', { statut: 'Planned', prio: 'Medium', fin: d(120), avancement: 10, tags: ['Family', 'Leisure'] }, { icon: '🏖️' });
  add(pr, 'Learn Spanish', { statut: 'Idea', prio: 'Low', tags: ['Leisure'] }, { icon: '📚' });

  add(ta, 'Call the plumber', { statut: 'In progress', prio: 'High', ech: d(1), cat: ['Home'], projet: [sdb.id] }, {
    content: '<p>Ask for a quote for:</p><ul class="checklist"><li data-done="true">Shower</li><li>Sink</li><li>Taps</li></ul>' });
  add(ta, 'Choose the tiles', { statut: 'To do', prio: 'Medium', ech: d(5), cat: ['Home'], projet: [sdb.id] });
  add(ta, 'Book a dentist appointment', { statut: 'To do', prio: 'High', ech: d(-1), cat: ['Health'] }, { icon: '🦷' });
  add(ta, 'Book accommodation', { statut: 'To do', prio: 'Medium', ech: d(14), cat: ['Personal'], projet: [vac.id] });
  add(ta, 'Clean up the inbox', { statut: 'Done', prio: 'Low', cat: ['Personal'] });

  add(co, 'Apples', { rayon: 'Fruit & veg', qte: '1 kg', magasin: 'Market' });
  add(co, 'Tomatoes', { rayon: 'Fruit & veg', qte: '6', magasin: 'Market' });
  add(co, 'Milk', { rayon: 'Fresh', qte: '2 L', magasin: 'Supermarket' });
  add(co, 'Plain yoghurt', { rayon: 'Fresh', qte: '8', magasin: 'Supermarket' });
  add(co, 'Baguette', { rayon: 'Bakery', qte: '1' });
  add(co, 'Pasta', { rayon: 'Pantry', qte: '2 packs', magasin: 'Supermarket' });
  add(co, 'Coffee', { rayon: 'Pantry', magasin: 'Organic', achete: true });
  add(co, 'Washing-up liquid', { rayon: 'Home', magasin: 'Supermarket' });
  add(co, 'Toothpaste', { rayon: 'Toiletries', magasin: 'Pharmacy' });

  add(ad, 'Income tax return', { statut: 'To do', type: 'Taxes', ech: d(10), organisme: 'impots.gouv.fr', prio: 'High', lien: 'https://www.impots.gouv.fr' }, { icon: '🧾',
    content: '<ul class="checklist"><li>Gather the statements</li><li>Check deductible expenses</li><li>Sign online</li></ul>' });
  add(ad, 'Renew ID card', { statut: 'In progress', type: 'ID', ech: d(30), organisme: 'Town hall', prio: 'Medium', lien: 'https://ants.gouv.fr' }, { icon: '🪪' });
  add(ad, 'Send the medical claim form', { statut: 'Awaiting reply', type: 'Health', ech: d(-3), organisme: 'CPAM', prio: 'Low' });
  add(ad, 'Home insurance certificate', { statut: 'Done', type: 'Insurance', organisme: 'Insurer' });

  add(pa, 'Rent', { montant: 850, ech: d(6), recur: 'monthly', cat: 'Rent', moyen: 'Transfer' }, { icon: '🏠' });
  add(pa, 'Electricity', { montant: 74.5, ech: d(2), recur: 'monthly', cat: 'Energy', moyen: 'Direct debit' }, { icon: '🔌' });
  add(pa, 'Internet', { montant: 29.99, ech: d(-1), recur: 'monthly', cat: 'Internet & phone', moyen: 'Card' });
  add(pa, 'Streaming', { montant: 13.49, ech: d(12), recur: 'monthly', cat: 'Subscription', moyen: 'Card' }, { icon: '📺' });
  add(pa, 'Car insurance', { montant: 420, ech: d(45), recur: 'yearly', cat: 'Insurance', moyen: 'Direct debit' }, { icon: '🚗' });
  add(pa, 'Property tax', { montant: 980, ech: d(60), recur: 'yearly', cat: 'Taxes', moyen: 'Transfer', lien: 'https://www.impots.gouv.fr' });
  return data;
}

/* ================= Global rendering ================= */
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
  const a = location.hash.match(/^#\/app\/([^/]+)/);
  if (a) { ui.route = { name: 'app', id: decodeURIComponent(a[1]) }; return; }
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

/* ================= Sidebar ================= */
function renderSidebar() {
  const sb = $('#sidebar');
  const urgent = dueItems().filter(i => i.n <= 0).length;
  const notifOn = 'Notification' in window && Notification.permission === 'granted';
  sb.innerHTML = '';
  append(sb, [
    h('div', { class: 'sb-head' },
      h('div', { class: 'logo' }, '◆'),
      h('input', { class: 'ws-name', value: S.name, 'aria-label': 'Workspace name', onchange: e => { S.name = e.target.value.trim() || 'Braindead'; save(); updateTitle(); }, onkeydown: enterBlur })),
    h('button', { class: 'sb-item', onclick: openQuickFind }, h('span', { class: 'sb-ico' }, '⌕'), 'Search', h('kbd', null, 'Ctrl K')),
    h('a', { class: 'sb-item' + (ui.route.name === 'home' ? ' active' : ''), href: '#/home' },
      h('span', { class: 'sb-ico' }, '⌂'), h('span', { class: 'sb-txt' }, 'Home'), urgent ? h('span', { class: 'sb-badge', title: 'Overdue or due today' }, urgent) : null),
    h('div', { class: 'sb-label' }, 'DATABASES', h('button', { class: 'icon-btn sm', title: 'New database', onclick: openNewDb }, '+')),
    S.dbs.map(db => h('a', { class: 'sb-item' + (ui.route.id === db.id && ui.route.name === 'db' ? ' active' : ''), href: '#/db/' + db.id },
      h('span', { class: 'sb-ico' }, db.icon || '📄'), h('span', { class: 'sb-txt' }, db.name), h('span', { class: 'sb-count' }, openCount(db)))),
    ui.apps.length ? [
      h('div', { class: 'sb-label' }, 'APPS'),
      ui.apps.map(a => h('a', { class: 'sb-item' + (ui.route.name === 'app' && ui.route.id === a.id ? ' active' : ''), href: '#/app/' + encodeURIComponent(a.id), title: a.description || '' },
        h('span', { class: 'sb-ico' }, a.icon || '🧩'), h('span', { class: 'sb-txt' }, a.name || a.id))),
    ] : null,
    h('div', { class: 'sb-spacer' }),
    h('div', { class: 'sb-label' }, 'THEME', h('span', { class: 'sb-count' }, THEMES.find(t => t.id === S.theme)?.name)),
    h('div', { class: 'themes' }, THEMES.map(t => h('button', {
      class: 'swatch' + (S.theme === t.id ? ' on' : ''), title: t.name, 'aria-label': 'Theme ' + t.name,
      style: { background: t.bg, '--ac': t.ac }, onclick: () => { S.theme = t.id; save(); render(); },
    }))),
    h('div', { class: 'sb-tools' },
      syncButton(),
      h('button', { class: 'sb-item', onclick: enableNotifs }, h('span', { class: 'sb-ico' }, '🔔'), notifOn ? 'Reminders on' : 'Enable reminders'),
      h('button', { class: 'sb-item', onclick: exportICS }, h('span', { class: 'sb-ico' }, '📅'), 'Export to calendar (.ics)'),
      h('button', { class: 'sb-item', onclick: exportJSON }, h('span', { class: 'sb-ico' }, '⬇'), 'Back up (.json)'),
      h('button', { class: 'sb-item', onclick: () => $('#import-file').click() }, h('span', { class: 'sb-ico' }, '⬆'), 'Restore a backup')),
  ]);
}

/* ================= Main area ================= */
function renderMain() {
  const main = $('#main');
  main.classList.toggle('app-mode', ui.route.name === 'app');
  if (ui.route.name === 'app') return renderApp(main);
  const key = ui.route.name + (ui.route.id || '');
  const keep = key === ui.routeKey ? main.scrollTop : 0;
  ui.routeKey = key;
  main.innerHTML = '';
  main.append(h('button', { class: 'menu-btn', 'aria-label': 'Menu', onclick: () => document.body.classList.toggle('sb-open') }, '☰'));
  const db = ui.route.name === 'db' && dbById(ui.route.id);
  if (db) renderDb(main, db); else renderHome(main);
  main.scrollTop = keep;
}

/* ---------- Home ---------- */
function renderHome(main) {
  const T = todayISO();
  const items = dueItems();
  const late = items.filter(i => i.n < 0), today = items.filter(i => i.n === 0);
  const week = items.filter(i => i.n > 0 && i.n <= 7), later = items.filter(i => i.n > 7 && i.n <= 31);
  const toPay = items.filter(i => i.amt && i.n <= 30).reduce((s, i) => s + Number(i.amt), 0);
  const hr = new Date().getHours();
  const greet = hr < 5 ? 'Good night' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const notifOk = !('Notification' in window) || Notification.permission !== 'default';

  const agItem = i => {
    const row = h('div', { class: 'ag-item', onclick: () => openPeek(i.pg.id) },
      hasDoneMarker(i.db) ? h('input', {
        type: 'checkbox', class: 'chk', title: 'Mark as done', onclick: e => e.stopPropagation(),
        onchange: () => { row.classList.add('leaving'); setTimeout(() => { setDone(i.pg, true); refresh(); }, 280); },
      }) : null,
      h('div', { class: 'ag-main' },
        h('div', { class: 'ag-title' }, i.pg.icon ? i.pg.icon + ' ' : '', i.pg.title || 'Untitled'),
        h('div', { class: 'ag-sub' }, h('span', null, i.db.icon, ' ', i.db.name), i.amt ? h('b', null, EUR.format(i.amt)) : null)),
      dateBadge(i.d, false));
    return row;
  };
  const agCol = (title, list, cls) => h('div', { class: 'ag-col ' + (cls || '') },
    h('h2', null, title, h('span', { class: 'n' }, list.length)),
    list.length ? list.map(agItem) : h('div', { class: 'ag-empty' }, 'Nothing here 🎉'));

  // Quick add
  const dbsWithTitle = S.dbs;
  const qaIn = h('input', { class: 'qa-in', placeholder: 'Quick add… (Enter)' });
  const qaDb = h('select', { class: 'in', 'aria-label': 'Database' }, dbsWithTitle.map(db => h('option', { value: db.id, selected: db.id === S.lastQa }, db.icon + ' ' + db.name)));
  const qaDate = h('input', { type: 'date', class: 'in', title: 'Due date (optional)' });
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
    toast(`Added to ${db.icon} ${db.name}`, { label: 'Open', fn: () => go('#/db/' + db.id) });
    $('.qa-in')?.focus();
  };
  qaIn.addEventListener('keydown', e => { if (e.key === 'Enter') qaGo(); });

  const recent = [...S.pages].sort((a, b) => b.updated - a.updated).slice(0, 6);

  main.append(h('div', { class: 'page-wrap home' },
    h('h1', null, greet + ' 👋'),
    h('div', { class: 'sub' }, new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
    notifOk ? null : h('div', { class: 'tip' }, '🔔', h('span', null, 'Get a notification when something is due (while the app is open).'),
      h('button', { class: 'btn', onclick: enableNotifs }, 'Enable')),
    h('div', { class: 'stats' },
      h('div', { class: 'stat late' }, h('div', { class: 'v' }, late.length), h('div', { class: 'l' }, 'Overdue')),
      h('div', { class: 'stat today' }, h('div', { class: 'v' }, today.length), h('div', { class: 'l' }, 'Due today')),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, week.length), h('div', { class: 'l' }, 'Next 7 days')),
      h('div', { class: 'stat money' }, h('div', { class: 'v' }, EUR.format(toPay)), h('div', { class: 'l' }, 'To pay within 30 days'))),
    h('div', { class: 'qa' }, qaIn, qaDb, qaDate, h('button', { class: 'btn primary', onclick: qaGo }, 'Add')),
    h('div', { class: 'agenda' },
      agCol('Overdue', late, 'late'), agCol('Today', today), agCol('This week', week), agCol('Later (30 days)', later)),
    h('h2', null, 'Databases'),
    h('div', { class: 'bases' },
      S.dbs.map(db => {
        const all = pagesOf(db).length, open = openCount(db);
        return h('a', { class: 'base-card', href: '#/db/' + db.id },
          h('div', { class: 'bi' }, db.icon || '📄'), h('div', { class: 'bn' }, db.name),
          h('div', { class: 'bs' }, hasDoneMarker(db) ? `${open} open · ${all} total` : `${all} pages`),
          hasDoneMarker(db) && all ? h('span', { class: 'bar' }, h('i', { style: { width: Math.round((all - open) / all * 100) + '%' } })) : null);
      }),
      h('button', { class: 'base-card new', onclick: openNewDb }, '+ New database')),
    recent.length ? [h('h2', null, 'Recently edited'), h('div', { class: 'recent' }, recent.map(pg => {
      const db = dbById(pg.db);
      return h('a', { onclick: () => openPeek(pg.id) }, h('span', null, pg.icon || db?.icon || '📄'), h('span', null, pg.title || 'Untitled'),
        h('span', { class: 'rd' }, db?.name, ' · ', new Date(pg.updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })));
    }))] : null,
  ));
  void T;
}

/* ---------- Database ---------- */
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
      h('button', { class: 'db-icon', title: 'Change icon', onclick: e => emojiPicker(e.currentTarget, v => { db.icon = v || '📄'; save(); render(); }) }, db.icon || '📄'),
      h('input', { class: 'db-title', value: db.name, 'aria-label': 'Database name', onchange: e => { db.name = e.target.value.trim() || 'Untitled'; save(); renderSidebar(); }, onkeydown: enterBlur })),
    h('div', { class: 'view-tabs' },
      db.views.map(v => h('button', {
        class: 'view-tab' + (v.id === view.id ? ' on' : ''),
        onclick: e => { if (v.id === view.id) return viewPop(e.currentTarget, db, v); db.activeView = v.id; save(); renderMain(); },
        title: v.id === view.id ? 'Click to configure this view' : '',
      }, h('span', { class: 'vt-ico' }, VIEW_TYPES[v.type]?.icon), v.name)),
      h('button', { class: 'view-tab add', title: 'New view', onclick: e => addViewMenu(e.currentTarget, db) }, '+')),
    h('div', { class: 'toolbar' },
      h('label', { class: 'search' }, '⌕', h('input', { placeholder: 'Search…', value: ui.search, oninput: e => { ui.search = e.target.value; renderBody(); } })),
      h('button', { class: 'tool' + (nf ? ' on' : ''), onclick: e => filterPop(e.currentTarget, db, view) }, nf ? `Filters · ${nf}` : 'Filter'),
      h('button', { class: 'tool' + (view.sort ? ' on' : ''), onclick: e => sortPop(e.currentTarget, db, view) }, view.sort ? 'Sorted' : 'Sort'),
      hasDoneMarker(db) ? h('button', { class: 'tool' + (view.hideDone ? ' on' : ''), onclick: () => { view.hideDone = !view.hideDone; save(); renderMain(); } },
        view.hideDone ? 'Done hidden' : 'Hide done') : null,
      h('button', { class: 'tool', onclick: e => viewPop(e.currentTarget, db, view) }, 'View ⚙'),
      h('button', { class: 'tool', onclick: () => openSchema(db) }, 'Properties'),
      h('button', { class: 'btn primary', onclick: () => createAndOpen(db, defaultsFor(view)) }, '+ New')),
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
    class: 'quick-add', placeholder: '+ Add… (Enter)',
    onkeydown: e => {
      if (e.key !== 'Enter' || !e.target.value.trim()) return;
      S.pages.push(newPage(db, e.target.value.trim(), defaultsFor(view)));
      save(); renderMain(); renderSidebar();
      $('.quick-add')?.focus();
    },
  });
}

/* ---------- Filtering / sorting ---------- */
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
const OPS_TEXT = [['contains', 'contains'], ['notcontains', 'does not contain'], ['empty', 'is empty'], ['notempty', 'is not empty']];
const OPS_SEL = [['is', 'is'], ['isnot', 'is not'], ['empty', 'is empty'], ['notempty', 'is not empty']];
const OPS_MULTI = [['has', 'contains'], ['hasnot', 'does not contain'], ['empty', 'is empty'], ['notempty', 'is not empty']];
const OPS = {
  text: OPS_TEXT, url: OPS_TEXT, select: OPS_SEL, recur: OPS_SEL, multi: OPS_MULTI, relation: OPS_MULTI,
  number: [['eq', '='], ['gt', '>'], ['lt', '<'], ['empty', 'is empty'], ['notempty', 'is not empty']],
  checkbox: [['checked', 'is checked'], ['unchecked', 'is not checked']],
  date: [['overdue', 'overdue'], ['today', 'today'], ['week', 'next 7 days'], ['month', 'next 30 days'],
    ['future', 'upcoming'], ['past', 'past'], ['empty', 'is empty'], ['notempty', 'is not empty']],
};
const NEEDS_VALUE = new Set(['contains', 'notcontains', 'eq', 'gt', 'lt', 'is', 'isnot', 'has', 'hasnot']);
const fieldOf = (db, id) => id === 'title' ? { id: 'title', name: 'Name', type: 'text' } : propOf(db, id);

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
    case 'relation': return String(pageById(x[0])?.title || '').localeCompare(String(pageById(y[0])?.title || ''), 'en');
    case 'recur': return Object.keys(RECUR).indexOf(x) - Object.keys(RECUR).indexOf(y);
    default: return String(x).localeCompare(String(y), 'en', { sensitivity: 'base', numeric: true });
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
      // empty values stay at the bottom whatever the direction
      const ea = isEmpty(prop === 'title' ? a.title : a.props[prop]), eb = isEmpty(prop === 'title' ? b.title : b.props[prop]);
      if (ea !== eb && !['created', 'updated', 'title'].includes(prop) && fieldOf(db, prop)?.type !== 'checkbox') return ea ? 1 : -1;
      return c * dir || (a.order || 0) - (b.order || 0);
    });
  } else ps.sort((a, b) => (a.order || 0) - (b.order || 0));
  return ps;
}

/* ---------- Value display ---------- */
const chip = o => h('span', { class: 'chip c-' + (o.color || 'gray') }, o.name);
// Only due dates get urgency colours; a past start date is not "late".
function dateBadge(v, done, due = true) {
  const n = diffDays(v, todayISO());
  const cls = done || !due ? '' : n < 0 ? 'late' : n === 0 ? 'today' : n <= 3 ? 'soon' : '';
  return h('span', { class: 'date ' + cls, title: parseD(v).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
    due || n >= 0 ? relDate(v) : fmtDate(v));
}
function fmtNum(p, v) {
  if (p.format === 'euro') return EUR.format(v);
  if (p.format === 'percent') return `${v} %`;
  return Number(v).toLocaleString('en-GB');
}
function renderValue(p, v, done) {
  if (isEmpty(v) && !(p.type === 'number' && v === 0)) return null;
  switch (p.type) {
    case 'select': { const o = p.options.find(o => o.id === v); return o ? chip(o) : null; }
    case 'multi': { const os = v.map(id => p.options.find(o => o.id === id)).filter(Boolean); return os.length ? os.map(chip) : null; }
    case 'relation': {
      const ps = v.map(pageById).filter(Boolean);
      return ps.length ? ps.map(x => h('span', { class: 'rel-chip', onclick: e => { e.stopPropagation(); openPeek(x.id); } }, (x.icon || '📄') + ' ' + (x.title || 'Untitled'))) : null;
    }
    case 'date': return dateBadge(v, done, !!p.due);
    case 'checkbox': return h('span', { class: 'chk-ro' }, '✓ ' + p.name);
    case 'number': return h('span', { class: 'num' }, fmtNum(p, v),
      p.format === 'percent' ? h('span', { class: 'bar' }, h('i', { style: { width: Math.max(0, Math.min(100, v)) + '%' } })) : null);
    case 'url': return h('a', { href: normUrl(v), target: '_blank', rel: 'noopener', class: 'link', onclick: e => e.stopPropagation() }, '↗ ' + prettyUrl(v));
    case 'recur': return RECUR[v] ? h('span', { class: 'recur' }, '↻ ' + RECUR[v]) : null;
    default: return h('span', { class: 'txt' }, String(v));
  }
}

/* ---------- Property editors ---------- */
function editor(pg, p, where) {
  const v = pg.props[p.id];
  const commit = val => { setProp(pg, p, val); refresh(); };
  const ph = where === 'peek' ? h('span', { class: 'ph' }, 'Empty') : null;
  switch (p.type) {
    case 'text': case 'url': case 'number': {
      const inp = h('input', {
        class: 'cell-in', type: p.type === 'number' ? 'number' : 'text', value: v ?? '', step: 'any',
        placeholder: where === 'peek' ? (p.type === 'url' ? 'https://…' : 'Empty') : '',
        oninput: e => {
          const raw = e.target.value;
          setProp(pg, p, p.type === 'number' ? (raw === '' ? null : Number(raw)) : raw);
        },
        onchange: () => { if (where === 'peek') softMain(); },
        onkeydown: enterBlur,
      });
      if (p.type === 'url' && v) return h('div', { class: 'url-ed' }, inp, h('a', { href: normUrl(v), target: '_blank', rel: 'noopener', class: 'url-go', title: 'Open link' }, '↗'));
      if (p.type === 'number' && p.format && p.format !== 'number') return h('div', { class: 'num-ed' }, inp, h('span', { class: 'suffix' }, p.format === 'euro' ? '€' : '%'));
      return inp;
    }
    case 'checkbox':
      return h('input', { type: 'checkbox', class: 'chk', checked: !!v, 'aria-label': p.name, onchange: e => commit(e.target.checked) });
    case 'date':
      return h('button', { class: 'cell-btn', onclick: e => datePop(e.currentTarget, v, commit) }, v ? dateBadge(v, isDone(pg), !!p.due) : ph);
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

/* ---------- Table view ---------- */
function toggleSort(view, pid) {
  if (view.sort?.prop === pid) view.sort = view.sort.dir === 1 ? { prop: pid, dir: -1 } : null;
  else view.sort = { prop: pid, dir: 1 };
  save(); renderMain();
}
const sortMark = (view, pid) => view.sort?.prop === pid ? (view.sort.dir === 1 ? ' ↑' : ' ↓') : '';

function renderTable(body, db, view, pages) {
  const props = visibleProps(db, view);
  const head = h('tr', null,
    h('th', { onclick: () => toggleSort(view, 'title') }, h('span', { class: 'ti' }, 'Aa'), 'Name', sortMark(view, 'title')),
    props.map(p => h('th', { onclick: () => toggleSort(view, p.id), title: 'Sort by ' + p.name }, h('span', { class: 'ti' }, TYPES[p.type].icon), p.name, sortMark(view, p.id))),
    h('th', { class: 'th-add', title: 'Add a property', onclick: () => openSchema(db, true) }, '+'));
  const rows = pages.map(pg => h('tr', { class: isDone(pg) ? 'done' : '' },
    h('td', { class: 'td-title' }, h('div', { class: 'tt' },
      pg.icon ? h('span', { class: 'pi' }, pg.icon) : null,
      h('input', { class: 'cell-in title-in', value: pg.title, placeholder: 'Untitled', oninput: e => { pg.title = e.target.value; touch(pg); }, onkeydown: enterBlur }),
      h('button', { class: 'open-btn', onclick: () => openPeek(pg.id) }, 'Open'))),
    props.map(p => h('td', { class: 'td-' + p.type }, editor(pg, p, 'table'))),
    h('td')));
  const foot = [h('span', null, `${pages.length} item${pages.length > 1 ? 's' : ''}`)];
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

/* ---------- Kanban view ---------- */
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
    h('div', { class: 'card-title' }, pg.icon ? h('span', { class: 'pi' }, pg.icon) : null, pg.title ? h('span', null, pg.title) : h('span', { class: 'ph' }, 'Untitled')),
    meta.length ? h('div', { class: 'card-meta' }, meta) : null);
  makeDraggable(c, pg);
  return c;
}
function renderKanban(body, db, view, pages) {
  const gp = propOf(db, view.groupBy);
  if (!gp || !['select', 'checkbox'].includes(gp.type)) {
    const opts = db.props.filter(p => ['select', 'checkbox'].includes(p.type));
    body.append(h('div', { class: 'empty pick-group' },
      h('p', null, 'Pick a Select or Checkbox property to group the cards by.'),
      opts.length ? h('select', { class: 'in', onchange: e => { view.groupBy = e.target.value; save(); renderMain(); } },
        h('option', { value: '' }, 'Group by…'), opts.map(p => h('option', { value: p.id }, p.name)))
        : h('button', { class: 'btn', onclick: () => openSchema(db, true) }, 'Add a property')));
    return;
  }
  const groups = gp.type === 'checkbox'
    ? [{ key: false, label: 'Not ' + gp.name.toLowerCase() }, { key: true, label: gp.name, color: 'green', done: gp.done }]
    : [...gp.options.map(o => ({ key: o.id, label: o.name, color: o.color, done: o.done })), { key: null, label: 'No ' + gp.name.toLowerCase() }];
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
        h('button', { class: 'icon-btn sm', title: 'Add here', onclick: addHere }, '+')),
      list,
      h('button', { class: 'col-add', onclick: addHere }, '+ New'));
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

/* ---------- List view ---------- */
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
        h('span', { class: 'lr-title' }, pg.title || 'Untitled'),
        h('span', { class: 'lr-meta' }, props.map(p => renderValue(p, pg.props[p.id], done))));
      return row;
    }),
    pages.length ? null : h('div', { class: 'empty', style: { marginTop: '14px' } }, ui.search || view.filters.length ? 'No results.' : 'Nothing yet — type above to add one.')));
}

/* ---------- Calendar view ---------- */
function renderCalendar(body, db, view, pages) {
  const dp = propOf(db, view.dateProp) || dueProp(db);
  if (!dp || dp.type !== 'date') {
    body.append(h('div', { class: 'empty' }, 'This database has no Date property.', h('br'), h('button', { class: 'btn', onclick: () => openSchema(db, true) }, 'Add a property')));
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

  const grid = h('div', { class: 'cal-grid' }, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => h('div', { class: 'cal-dow' }, d)));
  for (let i = 0; i < cells; i++) {
    const d = new Date(y, m - 1, 1 - offset + i), s = iso(d);
    const items = pages.filter(pg => pg.props[dp.id] === s);
    const cell = h('div', { class: 'cal-cell' + (d.getMonth() !== m - 1 ? ' out' : '') + (s === T ? ' today' : '') },
      h('div', { class: 'cal-day' }, h('span', null, d.getDate()),
        h('button', { class: 'cal-add', title: 'Add', onclick: () => createAndOpen(db, { ...defaultsFor(view), [dp.id]: s }) }, '+')),
      items.map(pg => {
        const done = isDone(pg);
        const it = h('div', { class: 'cal-item' + (done ? ' done' : '') + (!done && dp.due && s < T ? ' late' : ''), title: pg.title, onclick: () => openPeek(pg.id) },
          (pg.icon ? pg.icon + ' ' : '') + (pg.title || 'Untitled'));
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
      h('button', { class: 'icon-btn', title: 'Previous month', onclick: () => shift(-1) }, '‹'),
      h('div', { class: 'cal-title' }, first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })),
      h('button', { class: 'icon-btn', title: 'Next month', onclick: () => shift(1) }, '›'),
      h('button', { class: 'tool', onclick: () => { delete ui.cal[view.id]; renderMain(); } }, 'Today'),
      undated ? h('span', { class: 'muted sm', style: { marginLeft: 'auto' } }, `${undated} undated`) : null),
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
  const input = h('input', { class: 'menu-search', placeholder: onCreate ? 'Search or create…' : 'Search…' });
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
    if (!multi && value && !q) list.append(h('div', { class: 'menu-item muted', onclick: () => { onChange(null); closePop(); } }, '✕ Remove'));
    for (const it of items) list.append(h('div', { class: 'menu-item' + (sel.has(it.id) ? ' on' : ''), onclick: () => pick(it.id) }, it.node, sel.has(it.id) ? h('span', { class: 'check' }, '✓') : null));
    if (q && onCreate && !all.some(it => norm(it.text) === q)) list.append(h('div', { class: 'menu-item create', onclick: create }, '+ Create ', h('b', null, input.value.trim())));
    if (!items.length && !q) list.append(h('div', { class: 'menu-empty' }, onCreate ? 'Type to create an option' : 'No items'));
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
  if (!target) return toast('The linked database no longer exists — edit the property.');
  pickerMenu(anchor, {
    value: v, multi: true, onChange,
    getItems: () => pagesOf(target).map(x => ({ id: x.id, text: x.title || 'Untitled', node: h('span', null, (x.icon || target.icon || '📄') + ' ' + (x.title || 'Untitled')) })),
    onCreate: title => { const np = newPage(target, title); S.pages.push(np); save(); return np.id; },
  });
}
function datePop(anchor, v, onChange) {
  const T = todayISO();
  const inp = h('input', { type: 'date', value: v || '', onchange: e => { if (e.target.value) onChange(e.target.value); } });
  const quick = [['Today', T], ['Tomorrow', addDays(T, 1)], ['In a week', addDays(T, 7)], ['In a month', addMonths(T, 1)]];
  popover(anchor, h('div', { class: 'pop-body date-pop' },
    inp,
    h('div', { class: 'menu-list', style: { padding: 0 } },
      quick.map(([l, d]) => h('button', { class: 'menu-item', onclick: () => { onChange(d); closePop(); } }, l, h('span', { class: 'muted' }, fmtDate(d)))),
      v ? h('button', { class: 'menu-item danger', onclick: () => { onChange(null); closePop(); } }, 'Clear date') : null)), { width: 250 });
}
function emojiPicker(anchor, onPick) {
  popover(anchor, h('div', null,
    h('div', { class: 'emoji-grid' }, EMOJIS.map(e => h('button', { onclick: () => { onPick(e); closePop(); } }, e))),
    h('div', { style: { padding: '0 8px 8px' } }, h('button', { class: 'link-btn', onclick: () => { onPick(''); closePop(); } }, 'Remove icon'))));
}
function colorPop(anchor, o, done) {
  popover(anchor, h('div', { class: 'colors' }, COLORS.map(c => h('button', { onclick: () => { o.color = c; closePop(); done(); } },
    h('span', { class: 'dot c-' + c }), COLOR_NAMES[c]))));
}

/* ---------- Filters, sort, views ---------- */
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
      return h('select', { onchange: e => set(e.target.value) }, h('option', { value: '' }, '—'), (t ? pagesOf(t) : []).map(x => h('option', { value: x.id, selected: x.id === f.value }, x.title || 'Untitled')));
    }
    return h('input', { type: p.type === 'number' ? 'number' : 'text', value: f.value ?? '', placeholder: 'Value', oninput: e => set(e.target.value) });
  }
  function draw() {
    wrap.innerHTML = '';
    if (!view.filters.length) wrap.append(h('div', { class: 'muted sm' }, 'No filters on this view.'));
    view.filters.forEach((f, i) => {
      const p = fields.find(x => x.id === f.prop) || fields[0];
      wrap.append(h('div', { class: 'f-row' },
        h('select', { onchange: e => { f.prop = e.target.value; f.op = OPS[fieldOf(db, f.prop).type][0][0]; f.value = null; changed(); } },
          fields.map(x => h('option', { value: x.id, selected: x.id === f.prop }, x.name))),
        h('select', { onchange: e => { f.op = e.target.value; changed(); } }, OPS[p.type].map(([k, l]) => h('option', { value: k, selected: k === f.op }, l))),
        NEEDS_VALUE.has(f.op) ? valueInput(p, f) : null,
        h('button', { class: 'icon-btn sm', title: 'Remove', onclick: () => { view.filters.splice(i, 1); changed(); } }, '✕')));
    });
    wrap.append(h('button', { class: 'link-btn', onclick: () => { view.filters.push({ prop: 'title', op: 'contains', value: '' }); changed(); } }, '+ Add a filter'));
  }
  draw();
  popover(anchor, wrap, { width: 470 });
}
function sortPop(anchor, db, view) {
  const fields = [['', 'Manual order'], ['title', 'Name'], ...db.props.map(p => [p.id, p.name]), ['created', 'Created'], ['updated', 'Last edited']];
  const set = (prop, dir) => { view.sort = prop ? { prop, dir } : null; save(); renderMain(); };
  popover(anchor, h('div', { class: 'pop-body' },
    h('div', { class: 'pop-label' }, 'SORT BY'),
    h('div', { class: 'f-row' },
      h('select', { onchange: e => set(e.target.value, view.sort?.dir || 1) }, fields.map(([k, l]) => h('option', { value: k, selected: (view.sort?.prop || '') === k }, l))),
      h('select', { onchange: e => view.sort && set(view.sort.prop, Number(e.target.value)) },
        h('option', { value: '1', selected: view.sort?.dir !== -1 }, 'Ascending'), h('option', { value: '-1', selected: view.sort?.dir === -1 }, 'Descending')))), { width: 330 });
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
      h('div', { class: 'pop-label' }, 'VIEW NAME'),
      h('input', { class: 'in', value: view.name, oninput: e => { view.name = e.target.value || 'View'; save(); }, onchange: () => renderMain(), onkeydown: enterBlur }),
      h('div', { class: 'pop-label' }, 'LAYOUT'),
      h('div', { class: 'seg' }, Object.entries(VIEW_TYPES).map(([k, t]) => h('button', {
        class: view.type === k ? 'on' : '', onclick: () => { view.type = k; Object.assign(view, { ...viewDefaults(db, k), groupBy: view.groupBy && propOf(db, view.groupBy) ? view.groupBy : viewDefaults(db, k).groupBy, dateProp: view.dateProp || viewDefaults(db, k).dateProp }); changed(); },
      }, h('span', null, t.icon), t.label))),
      view.type === 'kanban' ? [h('div', { class: 'pop-label' }, 'GROUP BY'),
        h('select', { class: 'in', onchange: e => { view.groupBy = e.target.value; changed(); } },
          groupable.map(p => h('option', { value: p.id, selected: p.id === view.groupBy }, p.name)))] : null,
      view.type === 'calendar' ? [h('div', { class: 'pop-label' }, 'DATE PROPERTY'),
        h('select', { class: 'in', onchange: e => { view.dateProp = e.target.value; changed(); } },
          dates.map(p => h('option', { value: p.id, selected: p.id === (view.dateProp || dueProp(db)?.id) }, p.name)))] : null,
      h('div', { class: 'pop-label' }, 'VISIBLE PROPERTIES'),
      h('div', { class: 'vis-list' }, db.props.map(p => h('label', null,
        h('input', { type: 'checkbox', class: 'chk', checked: !view.hidden.includes(p.id), onchange: e => { view.hidden = e.target.checked ? view.hidden.filter(x => x !== p.id) : [...view.hidden, p.id]; changed(); } }),
        h('span', { class: 'ti muted' }, TYPES[p.type].icon), p.name))),
      h('div', { class: 'menu-sep' }),
      h('button', { class: 'menu-item', onclick: () => { const v = JSON.parse(JSON.stringify(view)); v.id = uid(); v.name += ' (copy)'; db.views.push(v); db.activeView = v.id; save(); closePop(); renderMain(); } }, '⧉ Duplicate view'),
      db.views.length > 1 ? h('button', { class: 'menu-item danger', onclick: () => { db.views = db.views.filter(v => v !== view); db.activeView = db.views[0].id; save(); closePop(); renderMain(); } }, '🗑 Delete view') : null,
      h('button', { class: 'menu-item danger', onclick: () => deleteDb(db) }, '🗑 Delete the whole database'),
    );
  }
  draw();
  popover(anchor, wrap, { width: 320 });
}

/* ================= Modals ================= */
function modal(title, content, { cls = '', onClose } = {}) {
  closeModal();
  const box = h('div', { class: 'modal ' + cls, role: 'dialog' },
    title ? h('div', { class: 'modal-head' }, h('h2', null, title), h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: closeModal }, '✕')) : null,
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
  const name = h('input', { class: 'in', placeholder: 'Database name (optional)' });
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
    else if (kind === 'vide') db.name = 'New database';
    db.icon = icon.textContent;
    S.dbs.push(db);
    save(); closeModal();
    location.hash = '#/db/' + db.id;
  };
  name.addEventListener('keydown', e => { if (e.key === 'Enter') create(); });
  modal('New database', [
    h('div', { class: 'form-row' }, icon, name),
    h('div', { class: 'pop-label', style: { marginTop: '14px' } }, 'TEMPLATE'),
    grid,
    h('div', { class: 'modal-foot' }, h('button', { class: 'btn', onclick: closeModal }, 'Cancel'), h('button', { class: 'btn primary', onclick: create }, 'Create database')),
  ]);
  name.focus();
}
function deleteDb(db) {
  closePop();
  const n = pagesOf(db).length;
  if (!confirm(`Delete “${db.name}” and its ${n} page(s)? This cannot be undone (consider backing up first).`)) return;
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
    if (t === 'text' || t === 'url') nv = old === 'checkbox' ? (v ? 'Yes' : '') : names(v).filter(Boolean).join(', ');
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
        h('button', { class: 'dot c-' + o.color, title: 'Colour: ' + COLOR_NAMES[o.color], onclick: e => colorPop(e.currentTarget, o, () => { save(); draw(); }) }),
        h('input', { class: 'in sm', value: o.name, oninput: e => { o.name = e.target.value; save(); } }),
        p.type === 'select' ? h('label', { class: 'sch-done', title: 'Items with this option count as done' },
          h('input', { type: 'checkbox', class: 'chk', checked: !!o.done, onchange: e => { if (e.target.checked) o.done = true; else delete o.done; save(); } }), 'done') : null,
        h('button', { class: 'icon-btn sm', title: 'Move up', disabled: j === 0, onclick: () => { p.options.splice(j - 1, 0, p.options.splice(j, 1)[0]); save(); draw(); } }, '↑'),
        h('button', { class: 'icon-btn sm danger', title: 'Delete option', onclick: () => { p.options.splice(j, 1); save(); draw(); } }, '✕'))),
      h('button', { class: 'link-btn', onclick: () => { p.options.push(opt('Option ' + (p.options.length + 1), COLORS[p.options.length % COLORS.length])); save(); draw(); } }, '+ Add an option'));
    if (p.type === 'checkbox') return h('label', { class: 'sch-flag' },
      h('input', { type: 'checkbox', class: 'chk', checked: !!p.done, onchange: e => { p.done = e.target.checked; save(); } }), 'Checked = done (hiding, reminders, recurrence)');
    if (p.type === 'date') return h('label', { class: 'sch-flag' },
      h('input', { type: 'checkbox', class: 'chk', checked: !!p.due, onchange: e => { db.props.forEach(x => { if (x.type === 'date') delete x.due; }); if (e.target.checked) p.due = true; save(); draw(); } }),
      'Due date (home, reminders, recurrence)');
    if (p.type === 'number') return h('div', { class: 'sch-sub' }, 'Format',
      h('select', { class: 'in sm', onchange: e => { p.format = e.target.value; save(); } }, Object.entries(NUM_FORMATS).map(([k, l]) => h('option', { value: k, selected: (p.format || 'number') === k }, l))));
    if (p.type === 'relation') return h('div', { class: 'sch-sub' }, 'Linked to',
      h('select', { class: 'in sm', onchange: e => { p.target = e.target.value; for (const pg of pagesOf(db)) delete pg.props[p.id]; save(); } },
        S.dbs.map(d => h('option', { value: d.id, selected: d.id === p.target }, d.icon + ' ' + d.name))));
    if (p.type === 'recur') return h('div', { class: 'sch-sub' }, 'When the item is marked done, its due date moves forward automatically.');
    return null;
  }
  function draw() {
    body.innerHTML = '';
    db.props.forEach((p, i) => body.append(h('div', { class: 'sch-prop' },
      h('div', { class: 'sch-line' },
        h('span', { class: 'ti' }, TYPES[p.type].icon),
        h('input', { class: 'in', value: p.name, 'aria-label': 'Property name', oninput: e => { p.name = e.target.value || 'Sans nom'; save(); } }),
        h('select', { class: 'in', 'aria-label': 'Type', onchange: e => { changeType(db, p, e.target.value); draw(); } },
          Object.entries(TYPES).map(([k, t]) => h('option', { value: k, selected: k === p.type }, t.label))),
        h('button', { class: 'icon-btn sm', title: 'Move up', disabled: i === 0, onclick: () => { db.props.splice(i - 1, 0, db.props.splice(i, 1)[0]); save(); draw(); } }, '↑'),
        h('button', { class: 'icon-btn sm', title: 'Move down', disabled: i === db.props.length - 1, onclick: () => { db.props.splice(i + 1, 0, db.props.splice(i, 1)[0]); save(); draw(); } }, '↓'),
        h('button', {
          class: 'icon-btn sm danger', title: 'Delete', onclick: () => {
            if (!confirm(`Delete the “${p.name}” property and all its values?`)) return;
            db.props.splice(i, 1);
            for (const pg of pagesOf(db)) delete pg.props[p.id];
            cleanupViews(db); save(); draw();
          },
        }, '✕')),
      extra(p))));
    body.append(h('button', { class: 'btn', onclick: addProp }, '+ Add a property'));
  }
  function addProp() {
    db.props.push(mkProp('New property', 'text'));
    save(); draw();
    const ins = body.querySelectorAll('.sch-line .in:not(select)');
    ins[ins.length - 1]?.select();
  }
  draw();
  modal(`Properties — ${db.name}`, body, { onClose: () => { save(); refresh(); } });
  if (addNew) addProp();
}

/* ---------- Quick find (Ctrl+K) ---------- */
function openQuickFind() {
  closePop();
  const input = h('input', { class: 'qf-in', placeholder: 'Search for a page or database…' });
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
        h('span', null, r.kind === 'db' ? db.name : (r.p.title || 'Untitled')),
        h('span', { class: 'muted' }, r.kind === 'db' ? 'Database' : db?.name)));
    });
    if (!results.length) list.append(h('div', { class: 'menu-empty' }, 'No results'));
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

/* ================= Page (side panel) ================= */
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
    class: 'peek-title', rows: 1, placeholder: 'Untitled', value: pg.title,
    oninput: e => { pg.title = e.target.value.replace(/\n/g, ''); touch(pg); autosize(e.target); softMain(); },
    onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); content.focus(); } },
  });
  const content = h('div', {
    class: 'content', contenteditable: 'true', spellcheck: 'true',
    'data-ph': 'Write your notes… Shortcuts: “# ” heading, “- ” list, “[] ” checkbox, “> ” quote',
    html: pg.content || '',
  });
  const syncContent = () => { pg.content = content.innerHTML; touch(pg); };
  content.addEventListener('input', e => {
    // deferred: Chrome ignores execCommand nested inside an input event
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
    // a new checklist item must not inherit the checked state
    setTimeout(() => {
      const li = closestEl(getSelection().anchorNode, 'ul.checklist > li', content);
      if (li && !li.textContent.trim()) li.removeAttribute('data-done');
    });
  });
  content.addEventListener('paste', e => {
    // paste as plain text to keep notes clean
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
      h('button', { class: 'icon-btn', title: ui.peekWide ? 'Collapse' : 'Expand', onclick: () => { ui.peekWide = !ui.peekWide; renderPeek(); } }, ui.peekWide ? '⇥' : '⇤'),
      h('button', { class: 'icon-btn', title: 'Duplicate', onclick: () => duplicatePage(pg) }, '⧉'),
      h('button', { class: 'icon-btn danger', title: 'Delete', onclick: () => deletePage(pg.id) }, '🗑'),
      h('button', { class: 'icon-btn', title: 'Close (Esc)', onclick: closePeek }, '✕')),
    h('div', { class: 'peek-in' },
      pg.icon
        ? h('button', { class: 'peek-icon', title: 'Change icon', onclick: e => emojiPicker(e.currentTarget, v => { pg.icon = v; touch(pg); refresh(); }) }, pg.icon)
        : h('button', { class: 'peek-icon add', onclick: e => emojiPicker(e.currentTarget, v => { pg.icon = v; touch(pg); refresh(); }) }, '☺ Add icon'),
      title,
      h('div', { class: 'props' }, db.props.map(p => [
        h('div', { class: 'p-label', title: TYPES[p.type].label }, h('span', { class: 'ti' }, TYPES[p.type].icon), p.name),
        h('div', { class: 'p-val' }, editor(pg, p, 'peek')),
      ])),
      h('button', { class: 'link-btn sm', onclick: () => openSchema(db, true) }, '+ Add a property'),
      h('div', { class: 'peek-meta' },
        h('span', null, 'Created ' + new Date(pg.created).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })),
        h('span', null, 'Edited ' + new Date(pg.updated).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }))),
      h('hr', { class: 'peek-hr' }),
      h('div', { class: 'ed-tools' },
        tb('B', 'Bold (Ctrl+B)', exec('bold')), tb('I', 'Italic (Ctrl+I)', exec('italic')), tb('U', 'Underline (Ctrl+U)', exec('underline')), tb('S̶', 'Strikethrough', exec('strikeThrough')),
        sep(),
        tb('H1', 'Heading 1', exec('formatBlock', '<h1>')), tb('H2', 'Heading 2', exec('formatBlock', '<h2>')), tb('H3', 'Heading 3', exec('formatBlock', '<h3>')), tb('¶', 'Paragraph', exec('formatBlock', '<p>')),
        sep(),
        tb('•', 'Bulleted list', exec('insertUnorderedList')), tb('1.', 'Numbered list', exec('insertOrderedList')), tb('☑', 'Checklist', () => toggleChecklist(content)),
        tb('❝', 'Quote', exec('formatBlock', '<blockquote>')), tb('―', 'Divider', exec('insertHorizontalRule')),
        sep(),
        tb('🔗', 'Link', () => { const u = prompt('Link URL:', 'https://'); if (u) document.execCommand('createLink', false, normUrl(u)); }),
        tb('⌫', 'Clear formatting', exec('removeFormat'))),
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
// Markdown shortcuts at line start: #, ##, ###, -, *, 1., [], >  (triggered by space)
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
// Chrome sometimes puts the new list inside a <p>: lift it one level.
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
  Object.assign(c, { id: uid(), title: pg.title + ' (copy)', created: Date.now(), updated: Date.now(), order: pg.order + 0.5 });
  S.pages.push(c);
  save();
  openPeek(c.id);
  renderMain();
  toast('Page duplicated');
}
function deletePage(id) {
  const i = S.pages.findIndex(p => p.id === id);
  if (i < 0) return;
  const [pg] = S.pages.splice(i, 1);
  save();
  closePeek();
  toast(`“${pg.title || 'Untitled'}” deleted`, { label: 'Undo', fn: () => { S.pages.splice(i, 0, pg); save(); refresh(); } });
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

/* ================= Reminders, export, import ================= */
async function enableNotifs() {
  if (!('Notification' in window)) return toast('This browser doesn’t support notifications. Use the .ics export to your calendar instead.');
  if (Notification.permission === 'granted') { checkNotifs(true); return toast('Reminders already on ✓'); }
  const r = await Notification.requestPermission();
  if (r === 'granted') { toast('Reminders on — they show while the app is open.'); checkNotifs(true); }
  else toast('Notifications blocked by the browser.');
  renderSidebar(); renderMain();
}
async function notify(title, opts) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return await reg.showNotification(title, opts);
  } catch (e) { /* fallback below */ }
  try { new Notification(title, opts); } catch (e) { /* ignored */ }
}
function checkNotifs(force) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const T = todayISO();
  let sent = {};
  try { sent = JSON.parse(localStorage.getItem(NOTIF_KEY)) || {}; } catch (e) { /* empty */ }
  for (const k in sent) if (!k.endsWith('@' + T)) delete sent[k];
  for (const i of dueItems().filter(i => i.n <= 1)) {
    const k = i.pg.id + '@' + T;
    if (sent[k] && !force) continue;
    sent[k] = 1;
    const when = i.n < 0 ? `Overdue (${fmtDate(i.d)})` : i.n === 0 ? 'Today' : 'Tomorrow';
    notify(`${i.pg.title || 'Untitled'}`, { body: `${when} · ${i.db.icon} ${i.db.name}${i.amt ? ' · ' + EUR.format(i.amt) : ''}`, tag: i.pg.id, icon: 'icon.svg' });
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
  download(`braindead-${todayISO()}.json`, JSON.stringify(S, null, 2), 'application/json');
  toast('Backup downloaded');
}
function exportICS() {
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const ymd = s => s.replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const RR = { weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY', quarterly: 'FREQ=MONTHLY;INTERVAL=3', yearly: 'FREQ=YEARLY' };
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Braindead//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + esc(S.name)];
  const items = dueItems();
  for (const i of items) {
    const rp = i.db.props.find(p => p.type === 'recur');
    const r = rp && i.pg.props[rp.id];
    const title = (i.pg.title || 'Untitled') + (i.amt ? ` — ${EUR.format(i.amt)}` : '');
    lines.push('BEGIN:VEVENT', `UID:${i.pg.id}@braindead`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(i.d)}`, `DTEND;VALUE=DATE:${ymd(addDays(i.d, 1))}`,
      'SUMMARY:' + esc(title), 'DESCRIPTION:' + esc(`${i.db.name}`), 'CATEGORIES:' + esc(i.db.name));
    if (r && RR[r]) lines.push('RRULE:' + RR[r]);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(title), 'TRIGGER:-PT15H', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(title), 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  download(`reminders-${todayISO()}.ics`, lines.join('\r\n'), 'text/calendar');
  toast(`${items.length} due item(s) exported — open the file to add them to your calendar (alerts the day before and on the day).`);
}
$('#import-file').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.dbs) || !Array.isArray(d.pages)) throw new Error('format');
    if (!confirm(`Replace all current data with this backup (${d.dbs.length} databases, ${d.pages.length} pages)?`)) return;
    S = migrate(d);
    saveNow();
    ui.peek = null; $('#peek-root').innerHTML = '';
    location.hash = '#/home';
    render();
    toast('Backup restored ✓');
  } catch (err) { toast('Invalid file: this is not a Braindead backup.'); }
});

/* ================= Apps (HTML pages in apps/, listed in apps/apps.json) ================= */
// Apps run in a sandboxed iframe (no access to this page or its storage) and talk to
// Braindead through postMessage — see apps/braindead-sdk.js and CLAUDE.md.
async function loadApps() {
  if (!location.protocol.startsWith('http')) return;
  try {
    const r = await fetch('apps/apps.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const list = await r.json();
    ui.apps = Array.isArray(list) ? list.filter(a => a && a.id && a.file) : [];
  } catch (e) { return; }
  renderSidebar();
  if (ui.route.name === 'app') renderMain();
}
const menuBtn = () => h('button', { class: 'menu-btn', 'aria-label': 'Menu', onclick: () => document.body.classList.toggle('sb-open') }, '☰');
function renderApp(main) {
  const app = ui.apps.find(a => a.id === ui.route.id);
  const current = main.querySelector('iframe.app-frame');
  // Moving or recreating an iframe reloads it, so keep the running one.
  if (current && app && current.dataset.app === app.id) { pushTheme(current); return; }
  ui.routeKey = 'app' + ui.route.id;
  main.innerHTML = '';
  if (!app) {
    main.append(menuBtn(), h('div', { class: 'page-wrap' }, h('div', { class: 'empty' }, ui.apps.length ? 'This app does not exist.' : 'Loading…')));
    return;
  }
  const frame = h('iframe', {
    class: 'app-frame', 'data-app': app.id, src: 'apps/' + app.file, title: app.name,
    sandbox: 'allow-scripts allow-forms allow-modals allow-downloads allow-popups allow-popups-to-escape-sandbox',
  });
  frame.addEventListener('load', () => pushTheme(frame));
  main.append(h('div', { class: 'app-wrap' },
    h('header', { class: 'app-head' }, menuBtn(), h('span', { class: 'ai' }, app.icon || '🧩'), h('b', null, app.name || app.id),
      app.description ? h('span', { class: 'muted' }, app.description) : null),
    frame));
}
const THEME_VARS = ['--bg', '--side', '--surface', '--surface2', '--col', '--hover', '--border', '--border2', '--text', '--muted', '--faint',
  '--accent', '--accent-fg', '--accent-soft', '--danger', '--warn', '--ok', '--shadow', '--shadow-lg', '--radius', '--font', '--title-font',
  ...COLORS.flatMap(c => [`--${c}-bg`, `--${c}-fg`])];
function pushTheme(frame) {
  const cs = getComputedStyle(document.documentElement);
  const vars = Object.fromEntries(THEME_VARS.map(v => [v, cs.getPropertyValue(v).trim()]));
  frame.contentWindow?.postMessage({ bd: 1, event: 'theme', data: { name: S.theme, dark: S.theme === 'nuit' || S.theme === 'encre', vars } }, '*');
}
let notifyT;
function notifyApps() {
  clearTimeout(notifyT);
  notifyT = setTimeout(() => document.querySelectorAll('iframe.app-frame').forEach(f => f.contentWindow?.postMessage({ bd: 1, event: 'change' }, '*')), 200);
}

// --- Bridge: plain-language view of databases and pages for apps ---
function findDb(ref) {
  const db = dbById(ref) || S.dbs.find(d => norm(d.name) === norm(ref));
  if (!db) throw new Error(`Database "${ref}" not found`);
  return db;
}
const friendlyDb = db => ({
  id: db.id, name: db.name, icon: db.icon, template: db.tpl || null,
  properties: db.props.map(p => ({
    name: p.name, type: p.type,
    ...(p.options ? { options: p.options.map(o => o.name) } : {}),
    ...(p.format ? { format: p.format } : {}), ...(p.due ? { due: true } : {}), ...(p.done ? { done: true } : {}),
    ...(p.target ? { target: dbById(p.target)?.name || null } : {}),
  })),
});
function friendlyPage(pg) {
  const db = dbById(pg.db), props = {};
  for (const p of db.props) {
    const v = pg.props[p.id];
    if (p.type === 'select') props[p.name] = p.options.find(o => o.id === v)?.name ?? null;
    else if (p.type === 'multi') props[p.name] = (v || []).map(id => p.options.find(o => o.id === id)?.name).filter(Boolean);
    else if (p.type === 'relation') props[p.name] = (v || []).map(pageById).filter(Boolean).map(x => ({ id: x.id, title: x.title }));
    else if (p.type === 'checkbox') props[p.name] = !!v;
    else props[p.name] = v ?? null;
  }
  return { id: pg.id, database: db.name, title: pg.title, icon: pg.icon, done: isDone(pg), created: pg.created, updated: pg.updated, props };
}
function optionId(p, name) {
  let o = p.options.find(x => norm(x.name) === norm(name));
  if (!o) { o = opt(String(name), COLORS[p.options.length % COLORS.length]); p.options.push(o); }
  return o.id;
}
function applyFriendly(db, pg, data) {
  if (data.title != null) pg.title = String(data.title);
  if (data.icon != null) pg.icon = String(data.icon);
  for (const [name, val] of Object.entries(data.props || {})) {
    const p = db.props.find(x => norm(x.name) === norm(name));
    if (!p) throw new Error(`Unknown property "${name}" in ${db.name}`);
    let v;
    if (val == null || val === '') v = null;
    else if (p.type === 'select') v = optionId(p, val);
    else if (p.type === 'multi') v = [].concat(val).map(n => optionId(p, n));
    else if (p.type === 'relation') {
      const target = dbById(p.target);
      v = [].concat(val).map(x => pageById(x?.id || x)?.id || (target && pagesOf(target).find(t => norm(t.title) === norm(x?.title || x))?.id)).filter(Boolean);
    } else if (p.type === 'checkbox') v = !!val;
    else if (p.type === 'number') v = Number(val);
    else if (p.type === 'date') v = String(val).slice(0, 10);
    else if (p.type === 'recur') v = val in RECUR ? val : null;
    else v = String(val);
    setProp(pg, p, v);
  }
}
const APP_API = {
  getDatabases: () => S.dbs.map(friendlyDb),
  getPages: (app, db) => pagesOf(findDb(db)).sort((a, b) => (a.order || 0) - (b.order || 0)).map(friendlyPage),
  getPage: (app, id) => { const pg = pageById(id); return pg ? friendlyPage(pg) : null; },
  createPage(app, dbRef, data = {}) {
    const db = findDb(dbRef);
    const pg = newPage(db);
    S.pages.push(pg);
    applyFriendly(db, pg, data);
    save();
    return friendlyPage(pg);
  },
  updatePage(app, id, data = {}) {
    const pg = pageById(id);
    if (!pg) throw new Error(`Page "${id}" not found`);
    applyFriendly(dbById(pg.db), pg, data);
    save();
    return friendlyPage(pg);
  },
  deletePage(app, id) {
    const i = S.pages.findIndex(p => p.id === id);
    if (i >= 0) { S.pages.splice(i, 1); save(); }
    return i >= 0;
  },
  // Creates the database if missing, and adds any missing properties to an existing one.
  ensureDatabase(app, spec = {}) {
    if (!spec.name) throw new Error('ensureDatabase needs a name');
    let db = S.dbs.find(d => norm(d.name) === norm(spec.name));
    const isNew = !db;
    if (isNew) db = { id: uid(), name: spec.name, icon: spec.icon || '📄', tpl: 'app:' + app, props: [], views: [] };
    let changed = isNew;
    for (const ps of spec.properties || []) {
      if (db.props.some(p => norm(p.name) === norm(ps.name))) continue;
      if (!TYPES[ps.type]) throw new Error(`Unknown property type "${ps.type}"`);
      const extra = {};
      if (ps.type === 'select' || ps.type === 'multi') extra.options = (ps.options || []).map((o, i) => typeof o === 'string'
        ? opt(o, COLORS[i % COLORS.length]) : opt(o.name, o.color || COLORS[i % COLORS.length], o.done));
      if (ps.format) extra.format = ps.format;
      if (ps.due) extra.due = true;
      if (ps.done) extra.done = true;
      if (ps.type === 'relation') extra.target = findDb(ps.target).id;
      db.props.push(mkProp(ps.name, ps.type, extra));
      changed = true;
    }
    if (isNew) {
      db.views = [mkView('Table', 'table')];
      const sel = db.props.find(p => p.type === 'select'), date = dueProp(db);
      if (sel) db.views.push(mkView('Kanban', 'kanban', { groupBy: sel.id }));
      if (date) db.views.push(mkView('Calendar', 'calendar', { dateProp: date.id }));
      db.activeView = db.views[0].id;
      S.dbs.push(db);
    }
    if (changed) save();
    return friendlyDb(db);
  },
  storeGet: (app, key) => S.appData?.[app]?.[key] ?? null,
  storeSet(app, key, value) {
    ((S.appData ||= {})[app] ||= {})[key] = value;
    save();
    return true;
  },
};
window.addEventListener('message', e => {
  const frame = [...document.querySelectorAll('iframe.app-frame')].find(f => f.contentWindow === e.source);
  const m = e.data;
  if (!frame || !m || m.bd !== 1 || !m.method) return;
  let reply;
  try {
    if (!Object.hasOwn(APP_API, m.method)) throw new Error('Unknown method ' + m.method);
    reply = { bd: 1, id: m.id, result: APP_API[m.method](frame.dataset.app, ...(m.args || [])) };
  } catch (err) { reply = { bd: 1, id: m.id, error: String(err.message || err) }; }
  e.source.postMessage(JSON.parse(JSON.stringify(reply)), '*');
  if (!m.method.startsWith('get') && m.method !== 'storeGet') { renderSidebar(); updateTitle(); }
});

/* ================= Sync file (Chrome / Edge desktop) ================= */
// Optional auto-save to a file the user picks — e.g. in a Google Drive, Dropbox or OneDrive
// folder, which then backs it up and shares it between computers. The newest copy wins.
const canFile = 'showSaveFilePicker' in window;
const sync = { handle: null, state: 'off', pushT: null }; // state: off | ok | reconnect | error
function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('braindead', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const tx = r.result.transaction('kv', mode);
      const q = fn(tx.objectStore('kv'));
      tx.oncomplete = () => resolve(q.result);
      tx.onerror = () => reject(tx.error);
    };
  });
}
const idbGet = k => idb('readonly', s => s.get(k));
const idbSet = (k, v) => idb('readwrite', s => s.put(v, k));
const idbDel = k => idb('readwrite', s => s.delete(k));

async function initSync() {
  if (!canFile) return;
  try { sync.handle = await idbGet('syncFile'); } catch (e) { return; }
  if (!sync.handle) return;
  sync.state = (await sync.handle.queryPermission({ mode: 'readwrite' })) === 'granted' ? 'ok' : 'reconnect';
  if (sync.state === 'ok') await pullFile();
  renderSidebar();
}
async function readFile() {
  const text = await (await sync.handle.getFile()).text();
  try {
    const d = JSON.parse(text);
    return d && Array.isArray(d.dbs) && Array.isArray(d.pages) ? d : null;
  } catch (e) { return null; } // empty, or half-written by the cloud client
}
async function pullFile() {
  if (sync.state !== 'ok') return;
  try {
    const d = await readFile();
    if (!d || (d.savedAt || 0) <= (S.savedAt || 0)) return;
    S = migrate(d);
    localStorage.setItem(KEY, JSON.stringify(S));
    parseHash(); render(); notifyApps();
    toast('Loaded the latest data from ' + sync.handle.name);
  } catch (e) { syncError(e); }
}
function schedulePush() {
  if (sync.state !== 'ok') return;
  clearTimeout(sync.pushT);
  sync.pushT = setTimeout(pushFile, 800);
}
async function pushFile() {
  if (sync.state !== 'ok') return;
  try {
    const d = await readFile();
    if (d && (d.savedAt || 0) > (S.savedAt || 0)) return pullFile(); // another computer saved more recently
    const w = await sync.handle.createWritable();
    await w.write(JSON.stringify(S));
    await w.close();
  } catch (e) { syncError(e); }
}
function syncError(e) {
  sync.state = e?.name === 'NotAllowedError' ? 'reconnect' : 'error';
  renderSidebar();
}
const FILE_TYPES = [{ description: 'Braindead data', accept: { 'application/json': ['.json'] } }];
async function connectFile(create) {
  try {
    const handle = create
      ? await showSaveFilePicker({ suggestedName: 'braindead.json', types: FILE_TYPES })
      : (await showOpenFilePicker({ types: FILE_TYPES }))[0];
    if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return toast('Permission refused by the browser.');
    sync.handle = handle;
    sync.state = 'ok';
    await idbSet('syncFile', handle);
    const d = create ? null : await readFile();
    if (d && confirm(`Load the data from “${handle.name}”?\n\nOK: replace what is in this browser with the file.\nCancel: keep this browser's data and overwrite the file.`)) {
      S = migrate(d);
      localStorage.setItem(KEY, JSON.stringify(S));
      parseHash(); render();
    } else {
      S.savedAt = Date.now();
      const w = await handle.createWritable();
      await w.write(JSON.stringify(S));
      await w.close();
    }
    closeModal(); renderSidebar();
    toast(`Auto-saving to ${handle.name} ✓`);
  } catch (e) {
    if (e.name !== 'AbortError') toast('Could not use this file: ' + e.message);
  }
}
async function reconnectFile() {
  try {
    if ((await sync.handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
    sync.state = 'ok';
    await pullFile();
    schedulePush();
    renderSidebar();
    toast('Sync file reconnected ✓');
  } catch (e) { syncError(e); }
}
async function disconnectFile() {
  sync.handle = null;
  sync.state = 'off';
  await idbDel('syncFile').catch(() => {});
  closeModal(); renderSidebar();
  toast('Sync file disconnected — your data stays in this browser.');
}
function syncButton() {
  if (sync.state === 'reconnect') return h('button', { class: 'sb-item warn', onclick: reconnectFile }, h('span', { class: 'sb-ico' }, '⚠'), 'Reconnect sync file');
  if (sync.state === 'error') return h('button', { class: 'sb-item warn', onclick: openSyncModal }, h('span', { class: 'sb-ico' }, '⚠'), 'Sync file error');
  if (sync.state === 'ok') return h('button', { class: 'sb-item', onclick: openSyncModal, title: 'Auto-saving to this file' }, h('span', { class: 'sb-ico' }, '☁'), h('span', { class: 'sb-txt' }, 'Synced: ' + sync.handle.name));
  return h('button', { class: 'sb-item', onclick: openSyncModal }, h('span', { class: 'sb-ico' }, '☁'), 'Save to a file (Drive…)');
}
function openSyncModal() {
  modal('Save to a file', [
    h('p', { class: 'sync-p' }, 'Braindead always saves automatically in this browser. You can also auto-save to a file on your computer.'),
    h('p', { class: 'sync-p' }, 'Put that file in your ', h('b', null, 'Google Drive, Dropbox or OneDrive'), ' folder: it is then backed up online and shared between your computers. On your other computer, choose “Use an existing file” and pick the same one.'),
    !canFile
      ? h('div', { class: 'tip' }, 'This browser can’t write files. It works in Chrome and Edge on a computer — elsewhere, use “Back up (.json)”.')
      : [
        sync.handle ? h('div', { class: 'tip' }, sync.state === 'ok' ? '✓ Connected to ' : '⚠ Permission needed for ', h('b', null, sync.handle.name),
          sync.state !== 'ok' ? h('button', { class: 'btn', onclick: reconnectFile }, 'Reconnect') : null) : null,
        h('div', { class: 'modal-foot', style: { justifyContent: 'flex-start', flexWrap: 'wrap' } },
          h('button', { class: 'btn primary', onclick: () => connectFile(true) }, 'Create a new file'),
          h('button', { class: 'btn', onclick: () => connectFile(false) }, 'Use an existing file'),
          sync.handle ? h('button', { class: 'btn danger', onclick: disconnectFile }, 'Disconnect') : null),
      ],
  ]);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) pullFile(); });

/* ================= Keyboard & startup ================= */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openQuickFind(); return; }
  if (e.key === 'Escape') {
    if (pop) closePop();
    else if ($('#modal-root .overlay')) closeModal();
    else if (ui.peek) closePeek();
    else document.body.classList.remove('sb-open');
  }
});
// Keep simultaneously open tabs in sync.
window.addEventListener('storage', e => {
  if (e.key !== KEY || !e.newValue) return;
  try { S = migrate(JSON.parse(e.newValue)); parseHash(); render(); } catch (err) { /* ignored */ }
});

document.execCommand('defaultParagraphSeparator', false, 'p');
S = load();
parseHash();
render();
saveNow();
checkNotifs();
loadApps();
initSync();
// Ask the browser never to evict our data to free up space.
navigator.storage?.persist?.().catch(() => {});
setInterval(() => { checkNotifs(); updateTitle(); }, 15 * 60 * 1000);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
