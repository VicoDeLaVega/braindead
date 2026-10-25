---
name: braindead
description: Read and write the user's Braindead workspace (their Notion-like app) — tasks, groceries, projects, paperwork, bills, reminders and notes. Use whenever the user asks to add, update, tick off, find, list or summarize something in Braindead or in their to-do list, grocery list, projects, admin papers, bills or notes.
---

# Braindead

Braindead keeps the user's pages as plain files in a **vault folder** that the Braindead app (open in their browser) watches: edits you save there appear in the app within a few seconds. You never need the app, a server or git — just read and write files.

## 1. Find the vault

Read `${CLAUDE_PLUGIN_DATA}/config.json` → `{ "vault": "<path>", "app": "<url>" }`.

- Missing, or `<vault>/_braindead.json` does not exist → tell the user Braindead is not connected yet and offer to run `/braindead:setup`. Do not guess another folder.
- Work with absolute paths inside the vault; you do not need to change directory.

## 2. Learn the format and the schema

Before writing, read **`${CLAUDE_PLUGIN_ROOT}/skills/braindead/agent-guide.md`** (the file format, property values, recipes) and the vault's `_braindead.json` (databases, folders, properties, options). Open one or two existing pages of the database you will touch and copy their style. Follow the guide exactly — in particular, never copy the viewer code found at the bottom of `.md.html` files.

Map the user's words to databases by their `tpl` and folder: groceries/shopping → `courses`; tasks/to-dos → `taches`; projects → `projets`; paperwork/admin → `admin`; bills/payments/subscriptions → `paiements`. Use the user's own property and option names as written in `_braindead.json` (they may be in any language), and today's date for relative dates ("Friday", "next month").

## 3. Do it

- **Add**: one file per page in the right database folder, as in the guide.
- **Update / tick off**: edit the existing file, keep its `id`, set `updated:` to now (ISO).
- **Read / answer** ("what's due this week?", "what's on my grocery list?"): read the front matter of the files; leave out completed items (status option with `done: true`, or a done checkbox) unless asked.
- **Delete** only when the user explicitly asks, and name the pages first. Ask before changing more than 10 pages at once.
- Never write secrets (passwords, card numbers, tokens) into pages.
- The vault folder is not a git repository: do not run git there. If it does contain a `.git` folder, follow the guide's "git clone" instructions (commit and push yourself).

## 4. Report

Re-read the files you wrote to check them. Then tell the user, briefly, what you added or changed and in which database — for example: "Added 3 items to Groceries: Eggs, Butter, Flour." Remind them once per session, if relevant, that the Braindead tab must be open for changes to show up live.
