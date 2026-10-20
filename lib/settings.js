export const DEFAULTS = {
  canvasUrl: "",          // e.g. https://myschool.instructure.com
  canvasToken: "",        // optional; otherwise your logged-in browser session is used
  daysAhead: 30,
  eventMinutes: 30,       // .ics export only: event length, ending at the due time
  includeCompleted: false,
  taskListName: "Canvas", // Google Tasks list; empty = "My Tasks"
  autoSync: false,
  autoSyncHours: 6,
};

export async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...stored };
}

export function saveSettings(settings) {
  return chrome.storage.sync.set(settings);
}

export function normalizeCanvasUrl(url) {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withScheme).origin;
}
