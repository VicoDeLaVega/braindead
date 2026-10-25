# Writing into Braindead — guide for AI agents

You are working in a **Braindead vault**: the data of a personal Notion-like app, stored as plain files.
It lives either in a private GitHub repository (usually `braindead-data`) or in a folder synced by
Google Drive / Dropbox / OneDrive. Braindead reads these files back on its own: when it opens, every
10 minutes, and when the user clicks **Sync now**. You never need the app itself — just edit files.

## Layout

```
_braindead.json              ← databases, their properties, views, settings (read it first)
Tasks/                       ← one folder per database
  Call the plumber.md.html   ← one file per page
Bills & reminders/
  Rent.md.html
AGENTS.md, CLAUDE.md, README.md   ← documentation, ignored by Braindead
```

Pages are `.md.html` (default) or `.md` — check `vaultFormat` in `_braindead.json` (`"mdhtml"` or `"md"`) and use the same extension as the existing files.

## Before writing: learn the schema

Read `_braindead.json`. Each entry of `dbs` is a database:

- `name` and `folder` — the folder its pages live in;
- `tpl` — what it was created from: `taches` (tasks), `projets` (projects), `courses` (groceries), `admin` (paperwork), `paiements` (bills & reminders), `vide` (blank), `app:<id>` (created by an app). Users rename databases, so find them by `tpl` or by looking at the folders;
- `props` — its properties: `name`, `type`, and for selects the allowed `options` (`name`, `done: true` = this option means "completed"). A date property with `due: true` is the due date; a checkbox with `done: true` means "completed".

Open one or two existing pages of the same database to copy their style.

## Page file format

```markdown
---
Status: To do
Priority: High
Due date: 2026-11-03
Category: [Home, Health]
---

# Book a dentist appointment

Call before noon. Ask about:

- [ ] Cleaning
- [ ] Wisdom tooth
```

1. Front matter between `---` lines: one `Property name: value` per line, using the **exact property names** from `_braindead.json`.
2. Then the title on a `# ` line.
3. Then the notes in Markdown: paragraphs, `## Heading` / `### Sub-heading` / `#### Small heading`, `- bullets`, `1. numbered`, `- [ ] task` / `- [x] done task`, `> quote`, `**bold**`, `*italic*`, `~~strike~~`, `[link](https://…)`, `---`.

In a `.md.html` file, everything after the line starting with `<!-- ─── Braindead viewer` is display code: **never edit or copy it**. For a new page, write only the text part — Braindead adds the viewer itself.

### Property values

| Type | Write | Example |
|---|---|---|
| text | plain text (quote with `"…"` if it starts with a symbol or contains `: `) | `Organisation: Town hall` |
| number | a number, `.` as decimal separator | `Amount: 74.5` |
| select | one option name (an unknown name creates a new option) | `Status: In progress` |
| multi | `[A, B]` (quote items that contain commas) | `Category: [Home, "Health, dental"]` |
| date | `YYYY-MM-DD` | `Due date: 2026-11-03` |
| checkbox | `true` / `false` | `Paid: true` |
| url | the full link | `Link: https://www.impots.gouv.fr` |
| relation | `[Title of a page in the target database]` | `Project: [Renovate the bathroom]` |
| recur | `weekly`, `monthly`, `quarterly` or `yearly` | `Recurrence: monthly` |

Leave a property out when it has no value. A line with a property name that does not exist yet creates a new property (its type is guessed from the value: list → multi, number → number, `true`/`false` → checkbox, `YYYY-MM-DD` → date, otherwise text).

Lines Braindead manages itself: `id`, `icon` (one emoji), `created`, `updated`, `order`. Keep them as they are when editing; omit them (except optionally `icon`) when creating.

## Recipes

**Add a page** — create `<Database folder>/<Title>.md.html` (or `.md`). The file name is not important: Braindead uses the `# ` title and renames the file to match. Do not invent an `id`; Braindead assigns one on its next sync.

**Edit a page** — change the lines you need, keep `id`, and set `updated:` to the current time in ISO format (`2026-10-25T14:30:00.000Z`) so your edit wins over an older one.

**Mark something done** — tasks/projects/paperwork: set the status to the option flagged `done: true` (usually `Done`); groceries: `Bought: true`; bills: `Paid: true`. For a bill with a `Recurrence`, Braindead then moves the due date to the next period automatically.

**Delete a page** — delete its file.

**New database** — prefer asking the user to create it in Braindead (button **+** next to DATABASES), then add pages to its folder.

### Examples

`Groceries/Oat milk.md.html`
```markdown
---
Aisle: Fresh
Quantity: 2 L
Store: Supermarket
---

# Oat milk
```

`Bills & reminders/Gym membership.md.html`
```markdown
---
icon: 🏋️
Amount: 34.9
Due date: 2026-11-05
Recurrence: monthly
Category: Subscription
Method: Card
---

# Gym membership
```

`Tasks/Renew passport.md.html`
```markdown
---
Status: To do
Priority: High
Due date: 2026-12-01
Category: [Personal]
Link: https://ants.gouv.fr
---

# Renew passport

- [ ] Book an appointment at the town hall
- [ ] Get ID photos
- [ ] Find the old passport
```

## Sending your changes

**GitHub repository** — `git pull` first, edit, then commit and push:

```bash
git pull --rebase
git add -A
git commit -m "Add 3 groceries and the gym bill"
git push
```

Braindead picks the commit up on its next sync. If the app pushed in between, pull again and retry.

**Synced folder** — just save the files; Braindead re-reads the folder every 20 seconds while it is open.

## Good to know

- Braindead rewrites files in its own canonical form on the next sync (adds `id`, the viewer, timestamps, may re-order lines or rename the file to match the title). That is expected.
- If the same page is edited in the app and in the files, the most recent edit wins.
- Never write secrets (passwords, card numbers, tokens) into pages.
- Ignore `AGENTS.md`, `CLAUDE.md` and `README.md`: Braindead does not read them.
