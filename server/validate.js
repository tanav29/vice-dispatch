import { artwork, isDate, isHttps, platforms, streamStatuses } from '../public/content.js';

class InvalidContent extends Error {}

function string(value, label, limit, optional = false) {
  if (typeof value !== 'string' || value.trim().length > limit || (!optional && !value.trim())) {
    throw new InvalidContent(label + ' must ' + (optional ? 'have at most ' : 'contain 1 to ') + limit + ' characters.');
  }
  return value.trim();
}

function date(value, label) {
  const clean = string(value, label, 10);
  if (!isDate(clean)) throw new InvalidContent(label + ' must be a valid date.');
  return clean;
}

function url(value, label) {
  const clean = string(value, label, 2048);
  if (!isHttps(clean)) throw new InvalidContent(label + ' must be a valid HTTPS URL.');
  return clean;
}

function option(value, label, choices) {
  if (!choices.includes(value)) throw new InvalidContent('Choose a valid ' + label + '.');
  return value;
}

function image(record) {
  const image = string(record.image, 'Image', 2048, true);
  if (image && !Object.hasOwn(artwork, image) && !isHttps(image)) {
    throw new InvalidContent('Use a bundled image or enter an HTTPS image URL.');
  }
  return { image, imageAlt: image ? string(record.imageAlt, 'Image description', 160) : '' };
}

function records(entries, label, parse) {
  if (!Array.isArray(entries) || entries.length > 100) {
    throw new InvalidContent('A section can contain up to 100 ' + label + '.');
  }
  const ids = new Set();
  return entries.map(entry => {
    if (!entry || typeof entry !== 'object') throw new InvalidContent('Invalid ' + label + ' entry.');
    const id = string(entry.id, 'Entry ID', 80);
    if (!/^[a-z0-9-]+$/.test(id) || ids.has(id)) throw new InvalidContent('Invalid or duplicate entry ID.');
    ids.add(id);
    return { id, title: string(entry.title, 'Title', 120), url: url(entry.url, 'Link'), ...parse(entry) };
  });
}

export function validateContent(data) {
  if (!data?.settings) throw new InvalidContent('Release information is required.');
  return {
    settings: {
      releaseDate: date(data.settings.releaseDate, 'Release date'),
      platforms: string(data.settings.platforms, 'Platforms', 120),
      source: url(data.settings.source, 'Official source')
    },
    updates: records(data.updates, 'updates', entry => ({
      date: date(entry.date, 'Update date'),
      category: string(entry.category, 'Category', 28),
      summary: string(entry.summary, 'Summary', 380),
      ...image(entry)
    })),
    streams: records(data.streams, 'streams', entry => {
      const status = option(entry.status, 'stream type', streamStatuses);
      let startsAt = '';
      if (status === 'Scheduled') {
        startsAt = string(entry.startsAt, 'Start time', 30);
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(startsAt) ||
            !isDate(startsAt.slice(0, 10)) || !Number.isFinite(Date.parse(startsAt))) {
          throw new InvalidContent('Enter a valid start time for the scheduled stream.');
        }
      }
      return {
        creator: string(entry.creator, 'Creator', 80),
        platform: option(entry.platform, 'platform', platforms), status, startsAt
      };
    }),
    media: records(data.media, 'media links', entry => ({
      type: string(entry.type, 'Media type', 28),
      ...image(entry)
    }))
  };
}

export { InvalidContent };
