const relativeTimeFormat = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});

export function formatRelativeTime(timestamp: string): string {
  const targetTime = new Date(timestamp).getTime();

  if (!Number.isFinite(targetTime)) return timestamp;

  const deltaSeconds = Math.round((targetTime - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(deltaSeconds);

  if (absoluteSeconds < 60) {
    return relativeTimeFormat.format(deltaSeconds, 'second');
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (Math.abs(deltaMinutes) < 60) {
    return relativeTimeFormat.format(deltaMinutes, 'minute');
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) {
    return relativeTimeFormat.format(deltaHours, 'hour');
  }

  const deltaDays = Math.round(deltaHours / 24);
  if (Math.abs(deltaDays) < 30) {
    return relativeTimeFormat.format(deltaDays, 'day');
  }

  return new Date(timestamp).toLocaleString();
}
