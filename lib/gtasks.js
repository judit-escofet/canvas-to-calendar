const API = "https://tasks.googleapis.com/tasks/v1";

// Each Google task carries this marker in its notes so re-syncing updates it instead of duplicating it.
const MARKER = /canvas-id:(\S+)/;

async function getToken(interactive) {
  const result = await chrome.identity.getAuthToken({ interactive });
  const token = typeof result === "string" ? result : result?.token;
  if (!token) throw new Error("Not signed in to Google. Open the popup and click Sync to sign in.");
  return token;
}

async function api(path, { method = "GET", body, interactive }, retried = false) {
  const token = await getToken(interactive);
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !retried) {
    await chrome.identity.removeCachedAuthToken({ token });
    return api(path, { method, body, interactive }, true);
  }
  if (!res.ok) throw new Error(`Google Tasks ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function getAll(path, interactive) {
  const items = [];
  let pageToken = "";
  do {
    const sep = path.includes("?") ? "&" : "?";
    const page = await api(`${path}${sep}maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`, {
      interactive,
    });
    items.push(...(page.items || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken);
  return items;
}

// Finds the task list with this name, creating it if needed. Empty name = "My Tasks".
async function getTaskListId(name, interactive) {
  if (!name) return "@default";
  const lists = await getAll("/users/@me/lists", interactive);
  const found = lists.find((l) => l.title === name);
  if (found) return found.id;
  const created = await api("/users/@me/lists", { method: "POST", body: { title: name }, interactive });
  return created.id;
}

const dueFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function taskBody(task) {
  // Google Tasks ignores the time of day, so send the local due date at midnight UTC.
  const d = task.due;
  const due = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}T00:00:00.000Z`;

  const notes = [
    `${task.typeLabel}${task.course ? ` · ${task.course}` : ""}`,
    `Due ${dueFmt.format(d)}`,
    task.points != null ? `Points: ${task.points}` : null,
    task.url,
    "",
    `canvas-id:${task.id}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { title: task.title, notes, due };
}

/**
 * Creates or updates one Google task per Canvas task.
 * - Tasks finished in Canvas (submitted / marked done) are checked off in Google Tasks.
 * - Tasks you delete in Google Tasks stay deleted; tasks you check off stay checked off.
 * Returns { created, updated, completed, skipped, failed }.
 */
export async function syncToGoogleTasks(tasks, settings, { interactive = true } = {}) {
  const listId = encodeURIComponent(await getTaskListId(settings.taskListName, interactive));
  const existing = await getAll(
    `/lists/${listId}/tasks?showCompleted=true&showHidden=true&showDeleted=true`,
    interactive
  );
  const byCanvasId = new Map();
  for (const t of existing) {
    const id = t.notes?.match(MARKER)?.[1];
    if (id) byCanvasId.set(id, t);
  }

  const counts = { created: 0, updated: 0, completed: 0, skipped: 0, failed: 0 };

  for (const task of tasks) {
    const match = byCanvasId.get(task.id);
    try {
      if (match?.deleted) {
        counts.skipped++;
      } else if (task.completed) {
        if (match && match.status !== "completed") {
          await api(`/lists/${listId}/tasks/${match.id}`, {
            method: "PATCH",
            body: { status: "completed" },
            interactive,
          });
          counts.completed++;
        }
      } else if (match) {
        await api(`/lists/${listId}/tasks/${match.id}`, {
          method: "PATCH",
          body: taskBody(task),
          interactive,
        });
        counts.updated++;
      } else {
        await api(`/lists/${listId}/tasks`, { method: "POST", body: taskBody(task), interactive });
        counts.created++;
      }
    } catch (err) {
      console.error(`Failed to sync "${task.title}"`, err);
      counts.failed++;
    }
  }
  return counts;
}
