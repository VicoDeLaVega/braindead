# Braindead

A tiny personal Notion/Coda clone in plain HTML, CSS and JavaScript — no server, no build step, no dependencies.
Built to keep track of tasks, projects, groceries, paperwork and recurring bills.

**Live demo:** https://vicodelavega.github.io/braindead/

## Features

- **Databases** with typed **properties**: text, number (€, %), select, multi-select, date, checkbox, URL, **relation** to another database, and **recurrence**.
- **Pages**: every item opens in a side panel with its properties and rich notes (headings, lists, checklists, quotes, links).
  Line-start shortcuts: `# ` heading, `- ` bullet list, `1. ` numbered list, `[] ` checklist, `> ` quote.
- **Multiple views** per database:
  - **Table** — inline editing, click a column to sort, € totals.
  - **Kanban** — grouped by any Select or Checkbox property, drag and drop.
  - **List** — great for groceries.
  - **Calendar** — drag items to reschedule.

  Each view keeps its own filters, sort, visible properties and a “Hide done” toggle.
- **Home dashboard**: overdue / today / this week / next 30 days, total to pay, quick add.
- **Recurring bills**: ticking “Paid” moves the due date to the next week, month, quarter or year and logs the payment in the page.
- **Reminders**: browser notifications (while the app is open) and **.ics export** to Google / Apple / Outlook calendar, with alerts the day before and on the day.
- **9 themes**: Snow, Sand, Mint, Lavender, Peach, Sky, Paper, Night, Ink.
- **Apps**: extra HTML pages (budget tracker, habit tracker…) that live in `apps/`, show up in the sidebar and can read and write your databases. Ask Claude Code to build one — see below.
- **Vault folder** (Chrome / Edge desktop), like Obsidian: every page is also saved as a readable file — one folder per database, one file per page. Put the folder in Google Drive, Dropbox or OneDrive to back it up online and share it between computers. Edits made in the files come back into Braindead.
- **Back up to GitHub or GitLab**: sync everything into a private repository (gitlab.com or your own GitLab) — every sync is a commit, so you keep the full history of every page, and it works on phones too.
- **AI agents can write into it**: vaults, zips and data repos include an `AGENTS.md` ([guide](plugins/braindead/skills/braindead/agent-guide.md)) explaining the file format, so Claude Code or any agent can add or edit pages — “add these 5 groceries”, “create a task for each email I need to answer”.
- Global search with `Ctrl+K`, mobile layout, installable as an app (PWA), works offline.

Starter templates: Tasks, Projects, Groceries, Paperwork, Bills & reminders (with sample items you can delete).

## Make it yours

1. Click **Use this template → Create a new repository** (it can have any name).
2. In your new repo: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`** → Save.
3. A minute later your Braindead is live at `https://<your-username>.github.io/<repo-name>/`.

**On GitLab instead:** fork the project (or create a project from it with **Import project → Repository by URL**). The included `.gitlab-ci.yml` publishes it with GitLab Pages on every push to the default branch: it is live at `https://<your-username>.gitlab.io/<project-name>/` (see **Deploy → Pages**). If the project is private, set **Settings → General → Visibility → Pages** to *Everyone* so the app itself is reachable — your data never lives there anyway.

Then, to add your own tools, clone your repo, open it in [Claude Code](https://claude.com/claude-code) and ask, for example:

> Make me a habit tracker app for Braindead.

Claude reads [`CLAUDE.md`](CLAUDE.md), creates the app in `apps/`, registers it and pushes. It appears under **Apps** in the sidebar, matches your theme, and stores its data in your Braindead databases.

## Use it with Claude Code

Let Claude read and write your pages from any Claude Code session — no server, no git.

1. In Braindead (Chrome or Edge on a computer), click **Save to a folder (Drive…)** and pick a folder — ideally in Google Drive, Dropbox or OneDrive.
2. In Claude Code, install the plugin:

   ```
   /plugin marketplace add VicoDeLaVega/braindead
   /plugin install braindead@braindead
   ```

   From a copy hosted on GitLab, add it by URL instead: `/plugin marketplace add https://gitlab.com/<you>/<project>.git`.

3. Run `/braindead:setup` once: Claude finds your vault folder, checks the link with the app and remembers it.

Then just ask, in any session:

> Add eggs, butter and flour to my groceries
> Create a task to call Alex on Friday, high priority
> What do I have to pay this month?

Claude writes the files in your vault folder and the pages show up in Braindead within a few seconds (keep the tab open). Other AI agents can do the same by following [`AGENTS.md`](plugins/braindead/skills/braindead/agent-guide.md), which Braindead also drops into your vault.

## Your data

Everything is saved **automatically in your browser** (localStorage) after every change. Nothing is sent anywhere — your repository only contains code.

- Each browser / device has its own data. Clearing your browser's site data erases it.
- On iPhone, add Braindead to your home screen (Share → Add to Home Screen) so Safari keeps the data.
- **Save to a folder (Drive…)** (Chrome / Edge on a computer): Braindead mirrors everything into a folder you choose — your *vault*. Choose a folder inside Google Drive, Dropbox or OneDrive and it is backed up online; on another computer, choose the same folder. On a conflict, the most recent edit wins.
### Vault format

```
Braindead/
  _braindead.json              ← databases, views, settings
  Tasks/
    Call the plumber.md.html   ← one file per page
  Bills & reminders/
    Rent.md.html
```

Each page is Markdown with its properties on top:

```markdown
---
id: 182jp3p8l36
Status: In progress
Priority: High
Due date: 2026-10-26
Category: [Home]
---

# Call the plumber

Ask for a quote for:

- [x] Shower
- [ ] Sink
```

- **`.md.html`** (default): the text above is followed by a small built-in viewer. Open the file in a text editor and you read the text; double-click it and your browser shows a formatted page — even offline, even without Braindead.
- **`.md`**: plain Markdown files, so the folder also opens as an [Obsidian](https://obsidian.md) vault.

You can edit the files by hand: change a property, tick a checkbox, add a new property line or even create a new file — Braindead picks it up.

- **Back up to GitHub or GitLab** (any browser, phones included): create a private repository (GitHub, gitlab.com or a self-hosted GitLab) and a token limited to it, paste them in Braindead (the app shows the exact steps). Braindead then commits the vault files when it opens and every 10 minutes, and pulls changes made on your other devices. Each commit lists what changed; GitHub's history lets you see or restore any version of a page. The token is stored only in your browser — never in your data, your vault, your zip or any repository.
- **Export (.zip)** downloads your whole vault as a zip — works in every browser, phones included. Unzip it and you get the same readable folder. **Import (.zip)** loads one back (any vault folder zipped by hand works too, as do older `.json` backups) — handy to move your data to a phone or another browser.

## Run locally

Opening `index.html` directly works, but apps, offline mode and notifications need a local server:

```bash
python -m http.server 8000
```

then open http://localhost:8000.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page skeleton |
| `styles.css` | Themes and layout |
| `app.js` | All the logic: data model, views, editor, reminders |
| `apps/` | Apps: `apps.json` (list), `braindead-sdk.js` (API for apps), `finances.html` (example) |
| `CLAUDE.md` | How Claude Code should build apps and work on the code |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline mode and installability |

## License

[MIT](LICENSE)
