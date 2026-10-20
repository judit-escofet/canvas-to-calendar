import { getSettings } from "./settings.js";
import { fetchCanvasTasks } from "./canvas.js";
import { syncToGoogleTasks } from "./gtasks.js";

export async function runSync({ interactive }) {
  const settings = await getSettings();
  // Always fetch finished work too, so it can be checked off in Google Tasks.
  const tasks = await fetchCanvasTasks({ ...settings, includeCompleted: true });
  const counts = await syncToGoogleTasks(tasks, settings, { interactive });
  const lastSync = { at: Date.now(), total: tasks.length, ...counts };
  await chrome.storage.local.set({ lastSync, lastError: null });
  return lastSync;
}
