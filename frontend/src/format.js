export function formatDateTime(dateTimeStr) {
  const date = new Date(dateTimeStr);
  const dateLabel = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dateLabel} · ${timeLabel}`;
}

export function formatDateOnly(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTimeOnly(date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}