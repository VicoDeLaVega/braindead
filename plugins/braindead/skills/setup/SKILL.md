---
name: setup
description: Connect Claude to the user's Braindead workspace — pick or create the vault folder, have the user link it in the Braindead app, and remember it. Run once per computer.
disable-model-invocation: true
---

# Set up Braindead for Claude

Goal: find the folder where the user's Braindead app saves its pages (the **vault folder**), make sure the app is linked to it, and remember its path in `${CLAUDE_PLUGIN_DATA}/config.json` so the `braindead` skill can read and write pages from any session.

Talk to the user in their language. Keep each message short and tell them exactly what to click.

## 1. Already set up?

Read `${CLAUDE_PLUGIN_DATA}/config.json` if it exists. If it holds a `vault` path and `<vault>/_braindead.json` exists, tell the user Braindead is already connected to that folder and ask whether they want to keep it or choose another one. Stop if they keep it.

## 2. Choose the folder

The vault must be a plain folder on this computer — **not** a git clone. Look for a cloud-synced folder, so the pages are backed up and shared between computers:

- Google Drive: `G:/My Drive`, `G:/Mon Drive` (or another drive letter), `~/Google Drive`, `~/Library/CloudStorage/GoogleDrive-*/My Drive`
- Dropbox: `~/Dropbox`, OneDrive: `~/OneDrive*`, iCloud: `~/Library/Mobile Documents/com~apple~CloudDocs`

Propose `<cloud folder>/Braindead` if you found one, otherwise `~/Braindead`, and let the user pick another path. If they already connected a folder in the Braindead app, use that one. Create the folder if it does not exist. Use forward slashes in paths.

## 3. Link it in the Braindead app

Ask which Braindead they use: the public one at https://vicodelavega.github.io/braindead/ or their own copy (`https://<user>.github.io/<repo>/`). Then give these steps — the browser requires the user to do them, Claude cannot:

1. Open Braindead in **Chrome or Edge on this computer** (folder access is not available in Firefox, Safari or on phones).
2. In the left sidebar, click **Save to a folder (Drive…)**, then **Choose a folder**.
3. Select `<vault path>` and allow Braindead to edit it.
4. If Braindead says the folder already contains a vault, choose **OK** to open it.

Ask them to tell you when it is done. Then check that `<vault>/_braindead.json` exists (Braindead writes it within a second). If it is missing, help: same folder? Chrome or Edge? Was a "Vault sync error" shown in the sidebar? Try again.

## 4. Remember it

Write `${CLAUDE_PLUGIN_DATA}/config.json` (create the directory if needed):

```json
{ "vault": "<absolute vault path, forward slashes>", "app": "<Braindead URL>" }
```

## 5. Show it working

Read `_braindead.json` and list the user's databases in one line. Offer a quick test: add a page titled "Hello from Claude 👋" to their tasks database (follow the `braindead` skill). Ask them to look at Braindead — it appears within a few seconds while the tab is open — then offer to delete the test page.

Finish with three example requests they can now make in any Claude Code session, for example:

- "Add eggs, butter and flour to my groceries"
- "Create a task to call Alex on Friday, high priority"
- "What do I have to pay this month?"

Also mention: keep the Braindead tab open to see changes live; for history and phone sync, they can enable **Back up to GitHub** in the app.
