export const platforms = ['Twitch', 'YouTube', 'Kick'];
export const streamStatuses = ['Channel', 'Scheduled', 'Replay'];
export const artwork = {
  '/assets/ocean-drive.webp': 'Neon-lit art deco hotel at dusk',
  '/assets/leonida.webp': 'Tropical island and blue coastline from above',
  '/assets/after-hours.webp': 'Red sports car on a tropical road at sunset',
  '/assets/vice-city.webp': 'Vintage car on a waterfront boulevard at sunset'
};

export function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const dateLabel = value => new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium', timeZone: 'UTC'
}).format(new Date(value + 'T00:00:00Z'));

export function isHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}
