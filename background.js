import { getSettings } from "./lib/settings.js";
import { runSync } from "./lib/sync.js";

const ALARM = "canvas-auto-sync";

async function scheduleAlarm() {
  const { autoSync, autoSyncHours } = await getSettings();
  await chrome.alarms.clear(ALARM);
  if (autoSync) {
    chrome.alarms.create(ALARM, {
      delayInMinutes: 1,
      periodInMinutes: Math.max(1, Number(autoSyncHours)) * 60,
    });
  }
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await scheduleAlarm();
  if (reason === "install") chrome.runtime.openOptionsPage();
});

chrome.runtime.onStartup.addListener(scheduleAlarm);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && (changes.autoSync || changes.autoSyncHours)) scheduleAlarm();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM) return;
  try {
    await runSync({ interactive: false });
  } catch (err) {
    await chrome.storage.local.set({ lastError: { at: Date.now(), message: err.message } });
  }
});

// The popup asks the service worker to sync, so the sync finishes even if the popup closes.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "sync") return;
  runSync({ interactive: true })
    .then((result) => sendResponse({ ok: true, result }))
    .catch(async (err) => {
      await chrome.storage.local.set({ lastError: { at: Date.now(), message: err.message } });
      sendResponse({ ok: false, error: err.message });
    });
  return true; // keep the message channel open for the async response
});
