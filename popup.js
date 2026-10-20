import { getSettings } from "./lib/settings.js";
import { fetchCanvasTasks } from "./lib/canvas.js";
import { buildIcs } from "./lib/ics.js";

const $ = (id) => document.getElementById(id);
let settings;
let tasks = [];

const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function setStatus(text, isError = false) {
  $("status").textContent = text;
  $("status").classList.toggle("error", isError);
}

function setBusy(busy) {
  for (const id of ["sync", "ics", "refresh"]) $(id).disabled = busy;
}

function renderTasks() {
  const list = $("tasks");
  list.replaceChildren();
  for (const task of tasks) {
    const li = document.createElement("li");
    if (task.completed) li.classList.add("done");

    const title = document.createElement("a");
    title.href = task.url;
    title.target = "_blank";
    title.textContent = task.title;

    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = [task.typeLabel, task.course, dateFmt.format(task.due)]
      .filter(Boolean)
      .join(" · ");

    li.append(title, meta);
    list.append(li);
  }
}

async function renderLastSync() {
  const { lastSync, lastError } = await chrome.storage.local.get(["lastSync", "lastError"]);
  if (lastError && (!lastSync || lastError.at > lastSync.at)) {
    $("last-sync").textContent = `Last sync failed: ${lastError.message}`;
  } else if (lastSync) {
    const when = new Date(lastSync.at).toLocaleString();
    $("last-sync").textContent =
      `Last Google Tasks sync ${when}: ${lastSync.created} added, ${lastSync.updated} updated` +
      (lastSync.failed ? `, ${lastSync.failed} failed` : "");
  }
}

async function load() {
  settings = await getSettings();
  if (!settings.canvasUrl) {
    setStatus("Set your Canvas URL in Settings to get started.");
    setBusy(true);
    $("refresh").disabled = true;
    return;
  }
  setBusy(true);
  setStatus("Fetching from Canvas…");
  try {
    tasks = await fetchCanvasTasks(settings);
    renderTasks();
    setStatus(
      tasks.length
        ? `${tasks.length} task${tasks.length === 1 ? "" : "s"} due in the next ${settings.daysAhead} days`
        : `Nothing due in the next ${settings.daysAhead} days 🎉`
    );
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    setBusy(false);
    $("sync").disabled = $("ics").disabled = tasks.length === 0;
  }
}

$("open-options").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

$("refresh").addEventListener("click", load);

$("ics").addEventListener("click", () => {
  const blob = new Blob([buildIcs(tasks, settings)], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `canvas-tasks-${new Date().toISOString().slice(0, 10)}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$("sync").addEventListener("click", async () => {
  setBusy(true);
  setStatus("Adding to Google Tasks…");
  const res = await chrome.runtime.sendMessage({ type: "sync" });
  setBusy(false);
  if (res?.ok) {
    const r = res.result;
    setStatus(
      `Done: ${r.created} added, ${r.updated} updated, ${r.completed} checked off` +
        (r.failed ? `, ${r.failed} failed.` : ".")
    );
  } else {
    setStatus(res?.error || "Sync failed.", true);
  }
  renderLastSync();
});

load();
renderLastSync();
