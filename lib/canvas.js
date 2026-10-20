import { normalizeCanvasUrl } from "./settings.js";

const TASK_TYPES = new Set([
  "assignment",
  "quiz",
  "discussion_topic",
  "wiki_page",
  "planner_note",
]);

const TYPE_LABELS = {
  assignment: "Assignment",
  quiz: "Quiz",
  discussion_topic: "Discussion",
  wiki_page: "Page",
  planner_note: "To-do",
};

/**
 * Fetches upcoming planner items from Canvas and returns them as simple task objects:
 * { id, type, typeLabel, title, course, due (Date), url, points, completed }
 */
export async function fetchCanvasTasks(settings) {
  const base = normalizeCanvasUrl(settings.canvasUrl);
  if (!base) throw new Error("Set your Canvas URL in Settings first.");

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + Number(settings.daysAhead || 30));

  const params = new URLSearchParams({
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    per_page: "100",
  });
  let url = `${base}/api/v1/planner/items?${params}`;

  const headers = { Accept: "application/json" };
  if (settings.canvasToken) headers.Authorization = `Bearer ${settings.canvasToken.trim()}`;

  const raw = [];
  while (url) {
    const res = await fetch(url, { headers, credentials: "include" });
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "Canvas refused the request. Log in to Canvas in this browser, or add an access token in Settings."
      );
    }
    if (!res.ok) throw new Error(`Canvas returned ${res.status} ${res.statusText}`);

    // Canvas prefixes JSON with "while(1);" for cookie-authenticated requests.
    const text = await res.text();
    raw.push(...JSON.parse(text.replace(/^while\(1\);/, "")));
    url = nextPageUrl(res.headers.get("Link"));
  }

  return raw
    .filter((item) => TASK_TYPES.has(item.plannable_type))
    .map((item) => toTask(item, base))
    .filter((task) => task.due && (settings.includeCompleted || !task.completed))
    .sort((a, b) => a.due - b.due);
}

function toTask(item, base) {
  const p = item.plannable || {};
  const dueStr = p.due_at || p.todo_date || item.plannable_date;
  const submissions = item.submissions || {};
  const completed =
    Boolean(submissions.submitted || submissions.excused || submissions.graded) ||
    Boolean(item.planner_override?.marked_complete);

  return {
    id: `${item.plannable_type}-${item.plannable_id}`,
    type: item.plannable_type,
    typeLabel: TYPE_LABELS[item.plannable_type] || item.plannable_type,
    title: p.title || p.name || "Untitled",
    course: item.context_name || "",
    due: dueStr ? new Date(dueStr) : null,
    url: item.html_url ? new URL(item.html_url, base).href : base,
    points: p.points_possible ?? null,
    completed,
  };
}

function nextPageUrl(linkHeader) {
  if (!linkHeader) return null;
  const match = linkHeader.split(",").find((part) => /rel="next"/.test(part));
  return match ? match.match(/<([^>]+)>/)[1] : null;
}
