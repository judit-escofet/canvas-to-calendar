import { getSettings, saveSettings, normalizeCanvasUrl } from "./lib/settings.js";

const form = document.getElementById("form");
const saved = document.getElementById("saved");

async function load() {
  const settings = await getSettings();
  for (const [key, value] of Object.entries(settings)) {
    const input = form.elements[key];
    if (!input) continue;
    if (input.type === "checkbox") input.checked = Boolean(value);
    else input.value = value;
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  saved.textContent = "";

  let canvasUrl;
  try {
    canvasUrl = normalizeCanvasUrl(form.elements.canvasUrl.value);
  } catch {
    saved.textContent = "That Canvas URL doesn't look right.";
    return;
  }

  // Ask for access to just this Canvas site (must happen inside the click handler).
  const granted = await chrome.permissions.request({ origins: [`${canvasUrl}/*`] });
  if (!granted) {
    saved.textContent = "Permission to read your Canvas site is needed.";
    return;
  }

  await saveSettings({
    canvasUrl,
    canvasToken: form.elements.canvasToken.value.trim(),
    daysAhead: Number(form.elements.daysAhead.value) || 30,
    includeCompleted: form.elements.includeCompleted.checked,
    eventMinutes: Number(form.elements.eventMinutes.value) || 30,
    taskListName: form.elements.taskListName.value.trim(),
    autoSync: form.elements.autoSync.checked,
    autoSyncHours: Number(form.elements.autoSyncHours.value) || 6,
  });
  form.elements.canvasUrl.value = canvasUrl;
  saved.textContent = "Saved ✓";
});

load();
