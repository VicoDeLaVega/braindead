/*
 * Braindead SDK — include in any app under apps/:
 *   <script src="braindead-sdk.js"></script>
 *
 * Apps run in a sandboxed iframe: no localStorage, no access to the parent page.
 * Everything goes through window.Braindead (all methods return Promises):
 *
 *   getDatabases()                     → [{ id, name, icon, template, properties: [{ name, type, options?, format?, due?, done?, target? }] }]
 *   getPages(database)                 → [{ id, database, title, icon, done, created, updated, props: { "Property name": value } }]
 *   getPage(id)                        → page | null
 *   createPage(database, { title, icon, props })   → page
 *   updatePage(id, { title?, icon?, props? })      → page
 *   deletePage(id)                     → true | false
 *   ensureDatabase({ name, icon, properties: [{ name, type, options?, format?, due?, done?, target? }] }) → database
 *   store.get(key) / store.set(key, value)          → small private storage for this app (JSON values)
 *   onChange(callback)                 → called when any Braindead data changes
 *   onTheme(callback)                  → called with { name, dark, vars } when the theme changes
 *
 * `database` is a database name (case-insensitive) or id. Property values use plain names:
 * select → "Option name" (created if missing), multi → ["A", "B"], date → "YYYY-MM-DD",
 * number → 12.5, checkbox → true, relation → [page id or title], recur → "monthly" | "weekly" | "quarterly" | "yearly".
 * Theme colours are applied as CSS variables on :root (--bg, --surface, --text, --muted, --accent, --border, ...).
 */
(function () {
  const inBraindead = window.parent !== window;
  const pending = new Map();
  const listeners = { change: [], theme: [] };
  let seq = 0;

  function call(method, ...args) {
    return new Promise((resolve, reject) => {
      if (!inBraindead) return reject(new Error('Open this app from the Braindead sidebar.'));
      const id = ++seq;
      pending.set(id, { resolve, reject });
      window.parent.postMessage({ bd: 1, id, method, args }, '*');
    });
  }

  function applyTheme(t) {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(t.vars || {})) if (v) root.style.setProperty(k, v);
    root.style.colorScheme = t.dark ? 'dark' : 'light';
    root.dataset.theme = t.name;
  }

  window.addEventListener('message', e => {
    if (e.source !== window.parent) return;
    const m = e.data;
    if (!m || m.bd !== 1) return;
    if (m.event) {
      if (m.event === 'theme') applyTheme(m.data);
      (listeners[m.event] || []).forEach(fn => { try { fn(m.data); } catch (err) { console.error(err); } });
      return;
    }
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    'error' in m ? p.reject(new Error(m.error)) : p.resolve(m.result);
  });

  window.Braindead = {
    inBraindead,
    getDatabases: () => call('getDatabases'),
    getPages: database => call('getPages', database),
    getPage: id => call('getPage', id),
    createPage: (database, data) => call('createPage', database, data),
    updatePage: (id, data) => call('updatePage', id, data),
    deletePage: id => call('deletePage', id),
    ensureDatabase: spec => call('ensureDatabase', spec),
    store: { get: key => call('storeGet', key), set: (key, value) => call('storeSet', key, value) },
    onChange: fn => listeners.change.push(fn),
    onTheme: fn => listeners.theme.push(fn),
  };

  if (!inBraindead) {
    document.addEventListener('DOMContentLoaded', () => document.body.insertAdjacentHTML('afterbegin',
      '<div style="padding:12px 16px;background:#fde2e1;color:#7a1d1a;font:14px system-ui">This app runs inside Braindead — open it from the Braindead sidebar.</div>'));
  }
})();
