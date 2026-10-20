import { eventTimes, eventSummary, eventDescription } from "./events.js";

// Builds an iCalendar (.ics) file, importable into Google, Outlook, Apple Calendar, etc.
export function buildIcs(tasks, settings) {
  const now = formatDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Canvas to Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Canvas",
  ];

  for (const task of tasks) {
    const { start, end } = eventTimes(task, settings.eventMinutes);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${task.id}@canvas-to-calendar`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:${escapeText(eventSummary(task))}`,
      `DESCRIPTION:${escapeText(eventDescription(task))}`,
      `URL:${task.url}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

function formatDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// RFC 5545: lines longer than 75 characters are folded with CRLF + space.
function fold(line) {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(" " + line.slice(i, i + 74));
  return parts.join("\r\n");
}
