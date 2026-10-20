# Canvas to Calendar (Chrome extension)

Fetches your upcoming Canvas assignments, quizzes, discussions and to-dos from the
Canvas Planner API and adds them to Google Tasks, which shows them in Google Calendar.

- **Google Tasks sync**: creates one task per Canvas item in a "Canvas" task list (you can change
  the list in Settings). Re-syncing updates tasks instead of duplicating them. Work you submit in
  Canvas gets checked off automatically, and tasks you delete in Google stay deleted. Auto-sync is optional.
  Google Tasks only stores a due *date*, so the exact due time is in each task's notes.
- **.ics download**: a no-setup fallback that exports the same items as calendar *events*
  for any calendar app.

## 1. Load the extension

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and pick the `canvas-to-calendar` folder.
3. The Settings page opens. Enter your Canvas URL (e.g. `https://yourschool.instructure.com`)
   and click **Save**. Chrome asks for permission to read that site.

If you're logged in to Canvas in Chrome, that's all you need. If fetching fails, create an access
token in Canvas (Account → Settings → **New Access Token**) and paste it into Settings.

## 2. Turn on Google Tasks sync (one-time setup)

Google requires every extension to have its own OAuth client ID:

1. Copy the extension's **ID** from `chrome://extensions`.
2. In the [Google Cloud Console](https://console.cloud.google.com/), create a project, then
   go to **APIs & Services → Library** and enable the **Google Tasks API**.
3. **OAuth consent screen**: choose *External*, fill in the required fields, and add your own
   Google account under **Test users**.
4. **Credentials → Create credentials → OAuth client ID**. For application type choose
   **Chrome extension** and paste the extension ID as the item ID.
5. Copy the client ID into `manifest.json` in place of `YOUR_CLIENT_ID.apps.googleusercontent.com`.
6. Click the reload icon on the extension in `chrome://extensions`.

The first time you click **Add to Google Tasks**, Google asks you to sign in and approve access.
To see the tasks in Google Calendar, make sure **Tasks** is ticked under "My calendars".

> The extension ID stays the same as long as you load it from the same folder. If you move the
> folder, the ID changes and you need to update the OAuth client.
>
> `chrome.identity.getAuthToken` works in Google Chrome only, not in Edge or Brave.

## Files

| File | Purpose |
| --- | --- |
| `lib/canvas.js` | Fetches and paginates `/api/v1/planner/items`, normalizes tasks |
| `lib/gtasks.js` | Google Tasks create/update/check-off, matched by a `canvas-id:` marker in the notes |
| `lib/ics.js` | Builds the `.ics` export |
| `lib/sync.js` | Fetch from Canvas, then push to Google Tasks |
| `background.js` | Auto-sync alarm and sync requests from the popup |
| `popup.*` | Preview list and buttons |
| `options.*` | Settings page |
