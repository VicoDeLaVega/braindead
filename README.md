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
- Global search with `Ctrl+K`, mobile layout, installable as an app (PWA), works offline.

Starter templates: Tasks, Projects, Groceries, Paperwork, Bills & reminders (with sample items you can delete).

## Your data

Everything is stored **in your browser** (localStorage). Nothing is sent anywhere.
That means:
- each browser / device has its own data;
- use **Back up (.json)** in the sidebar regularly — **Restore a backup** loads it again, or moves your data to another device.

## Run locally

Opening `index.html` directly works. For offline mode and notifications, serve the folder:

```bash
python -m http.server 8000
```

then open http://localhost:8000.

## Deploy your own copy on GitHub Pages

1. Fork this repository (or push the files to a new repo).
2. **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.
3. Your app will be at `https://<your-username>.github.io/<repo-name>/`.

The repository only contains code — your data stays in your browser.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page skeleton |
| `styles.css` | Themes and layout |
| `app.js` | All the logic: data model, views, editor, reminders |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline mode and installability |

## License

[MIT](LICENSE)
