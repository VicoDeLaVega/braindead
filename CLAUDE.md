# Braindead — notes for Claude

Braindead is a static, local-first Notion-like app (plain HTML/CSS/JS, no build, no dependencies) served by GitHub Pages.
User data lives only in the browser (localStorage), optionally mirrored to a file the user picks. **This repository is public: never commit personal data.**

## Adding an app (the most common request)

When the user asks for a new page/tool ("make me a budget tracker", "add a habit tracker to Braindead"…), build it as an **app**:

1. Create `apps/<id>.html` — one self-contained HTML file (inline CSS and JS).
2. Include the SDK: `<script src="braindead-sdk.js"></script>` and use `window.Braindead`.
3. Register it in `apps/apps.json`: `{ "id": "<id>", "name": "...", "icon": "<one emoji>", "file": "<id>.html", "description": "..." }`.
4. Test locally (see below), then commit and push. GitHub Pages redeploys in about a minute; the app appears under **APPS** in the sidebar.

Use `apps/finances.html` as the reference example.

### Rules for apps

- Apps run in a **sandboxed iframe** (opaque origin): `localStorage`, `sessionStorage`, `indexedDB` and cookies **throw**. Persist everything through the SDK.
- Prefer storing records in a **Braindead database** (`ensureDatabase` + `createPage`/`updatePage`): the user can then also see and edit them as a normal table/kanban/calendar. Use `store.get/set` only for small app settings.
- Reuse existing databases when it makes sense (e.g. read the user's bills from the database whose `template` is `"paiements"`; tasks are `"taches"`, projects `"projets"`, groceries `"courses"`, paperwork `"admin"`). Find them by `template`, not by name — users rename things.
- Style with the theme CSS variables so the app matches all 9 themes, and declare fallback values in `:root`:
  `--bg --surface --surface2 --col --hover --border --border2 --text --muted --faint --accent --accent-fg --accent-soft --danger --warn --ok --shadow --radius --font --title-font`, plus chip colours `--{gray,brown,orange,yellow,green,blue,purple,pink,red}-{bg,fg}`.
- Must work at phone width (360px) as well as desktop.
- Build DOM with `textContent` (not `innerHTML` with user data).
- Parse `YYYY-MM-DD` dates as local dates (`new Date(y, m - 1, d)`), not `new Date(string)` (UTC shift).
- External libraries: only if really useful, from cdnjs/jsdelivr with an exact pinned version.
- Never hardcode the user's real data (amounts, names, accounts) in the HTML — the repo is public.

### SDK reference (`apps/braindead-sdk.js`, all methods return Promises)

```js
const bd = window.Braindead;
await bd.ensureDatabase({ name: 'Habits', icon: '🔁', properties: [
  { name: 'Date', type: 'date' },
  { name: 'Status', type: 'select', options: [{ name: 'Todo', color: 'gray' }, { name: 'Done', color: 'green', done: true }] },
  { name: 'Minutes', type: 'number' },             // format: 'euro' | 'percent' for money / progress
]});                                                // creates the database, or adds missing properties
await bd.getDatabases();                            // [{ id, name, icon, template, properties: [{ name, type, options, format, due, done, target }] }]
await bd.getPages('Habits');                        // [{ id, database, title, icon, done, created, updated, props: { Date: '2026-10-25', Status: 'Done', ... } }]
await bd.createPage('Habits', { title: 'Run', icon: '🏃', props: { Date: '2026-10-25', Status: 'Todo', Minutes: 30 } });
await bd.updatePage(id, { props: { Status: 'Done' } });
await bd.deletePage(id);
await bd.store.get('settings'); await bd.store.set('settings', { goal: 5 });
bd.onChange(() => reload());                        // any Braindead data changed (debounce it; don't write from inside it)
bd.onTheme(({ name, dark, vars }) => {});           // theme vars are already applied to :root
```

Property types: `text`, `number`, `select`, `multi`, `date`, `checkbox`, `url`, `relation` (`target`: database name), `recur` (`weekly|monthly|quarterly|yearly`).
Values use plain names: select → option name (auto-created if new), multi → array of names, relation → array of page ids or titles.
`done: true` on a select option or checkbox property means "completed" (hidden by "Hide done", ignored by reminders).
`due: true` on a date property makes it the due date (home dashboard, reminders, recurrence).

## Testing locally

```bash
python -m http.server 8000
```

Open http://localhost:8000 — apps need `http://` (they are listed via `fetch('apps/apps.json')`).

## Core app layout

- `index.html` — shell; `styles.css` — themes (`[data-theme=...]` CSS variables) and layout.
- `app.js` — everything else, in sections: state & storage (`S`, `save()`), templates/seed (`makeDb`, `seed`), sidebar, home, database views (table, kanban, list, calendar), popovers/menus, modals, page side panel and editor, reminders/export/import, apps bridge (`APP_API`), sync file, startup.
- UI is built with the tiny `h(tag, attrs, ...children)` helper; all user-facing text is English.
- Vault folder (`vaultSync`, `vaultPull`, `vaultPush`): mirrors `S` into a user-picked folder — `_braindead.json` plus one `<Database>/<Page>.md.html` (or `.md`) per page. localStorage stays the working copy; `vault.files` remembers what was last written/read so only changes are synced, and the most recent edit wins on conflicts.
- Backup to GitHub or GitLab (`ghSync`, `ghPull`, `ghPush`, provider adapters in `PROVIDERS`): same vault files committed to a private repo through the REST API — one commit per sync, only changed blobs, compared by git blob SHA. GitHub uses the Git Data API (tree + commit + ref update); GitLab uses `POST /projects/:id/repository/commits` with actions, with a head check just before committing. Self-hosted GitLab via a full project URL (`gh.host`). Config and token live in `localStorage['braindead.github']`, deliberately outside `S` — never put the token in `S`, the vault, the zip or a repo.
- Claude Code plugin: `.claude-plugin/marketplace.json` (marketplace `braindead`) → `plugins/braindead/` with two skills: `setup` (user-invoked, remembers the vault path in `${CLAUDE_PLUGIN_DATA}/config.json`) and `braindead` (auto-invoked, reads/writes pages). Bump `version` in `plugins/braindead/.claude-plugin/plugin.json` when the skills change so users get the update.
- `plugins/braindead/skills/braindead/agent-guide.md` (single copy, also shipped in the Claude Code plugin) tells AI agents how to write pages directly into a vault or data repo; `agentDocs()` drops it as `AGENTS.md` (+ a `CLAUDE.md` that imports it) at the root of vault folders, zips and data repos. Keep it in sync with the file format.
- Page files are produced by `pageToFile` / parsed by `fileToPage`. `bdMarkdown`, `bdYaml`, `bdFrontmatter` and `bdView` are **copied into every .md.html file** via `Function.toString()`: keep them self-contained (no outside references, no `</script>` in their source). Round-trip page → file → page must be lossless; re-test it after touching `htmlToMd` or `bdMarkdown`.
- `.gitlab-ci.yml` publishes the app on GitLab Pages (copies the static files into `public/`); keep its file list in sync when adding top-level files.
- `sw.js` is network-first; bump its `CACHE` name only if caching behaviour changes.
