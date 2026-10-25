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
- **Auto-save to a file** (Chrome / Edge desktop): put it in your Google Drive, Dropbox or OneDrive folder to back up online and share between computers.
- Global search with `Ctrl+K`, mobile layout, installable as an app (PWA), works offline.

Starter templates: Tasks, Projects, Groceries, Paperwork, Bills & reminders (with sample items you can delete).

## Make it yours

1. Click **Use this template → Create a new repository** (it can have any name).
2. In your new repo: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`** → Save.
3. A minute later your Braindead is live at `https://<your-username>.github.io/<repo-name>/`.

Then, to add your own tools, clone your repo, open it in [Claude Code](https://claude.com/claude-code) and ask, for example:

> Make me a habit tracker app for Braindead.

Claude reads [`CLAUDE.md`](CLAUDE.md), creates the app in `apps/`, registers it and pushes. It appears under **Apps** in the sidebar, matches your theme, and stores its data in your Braindead databases.

## Your data

Everything is saved **automatically in your browser** (localStorage) after every change. Nothing is sent anywhere — your repository only contains code.

- Each browser / device has its own data. Clearing your browser's site data erases it.
- On iPhone, add Braindead to your home screen (Share → Add to Home Screen) so Safari keeps the data.
- **Save to a file (Drive…)** (Chrome / Edge on a computer): Braindead also auto-saves to a file you choose. Put it in your Google Drive, Dropbox or OneDrive folder and it is backed up online; on another computer, pick **Use an existing file** to share the same data. The newest copy always wins.
- **Back up (.json)** downloads a snapshot at any time; **Restore a backup** loads one (or moves your data to a phone).

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
