// Shared helpers for turning a Canvas task into a calendar event.

export function eventTimes(task, minutes) {
  const end = new Date(task.due);
  const start = new Date(end.getTime() - Number(minutes || 30) * 60_000);
  return { start, end };
}

export function eventSummary(task) {
  return task.course ? `${task.title} (${task.course})` : task.title;
}

export function eventDescription(task) {
  const lines = [`${task.typeLabel} due on Canvas`];
  if (task.points != null) lines.push(`Points: ${task.points}`);
  lines.push(task.url);
  return lines.join("\n");
}
