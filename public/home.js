import { dateLabel } from './content.js';

const byId = id => document.getElementById(id);
const filters = byId('stream-filters');
let streamEntries = [];
let selectedPlatform = 'All';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(className, url) {
  const anchor = element('a', '', className);
  anchor.href = url;
  return anchor;
}

function image(record) {
  const img = element('img');
  img.alt = record.imageAlt;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.src = record.image;
  img.addEventListener('error', () => img.remove(), { once: true });
  return img;
}

function story(record) {
  const anchor = link('story', record.url);
  if (record.image) anchor.append(image(record));
  const copy = element('div', '', 'story-copy');
  const meta = element('p', '', 'meta');
  const date = element('time', dateLabel(record.date));
  date.dateTime = record.date;
  meta.append(element('strong', record.category), document.createTextNode('/'), date);
  copy.append(meta, element('h3', record.title), element('p', record.summary));
  anchor.append(copy);
  return anchor;
}

function mediaTile(record) {
  const anchor = link('media-tile', record.url);
  if (record.image) anchor.append(image(record));
  const copy = element('div');
  copy.append(element('p', record.type, 'meta'), element('h3', record.title));
  anchor.append(copy);
  return anchor;
}

function streamRow(record) {
  const row = link('stream-row', record.url);
  const copy = element('div');
  const meta = element('p', record.platform + ' / ' + record.status, 'meta');
  copy.append(meta, element('h3', record.title), element('p', record.creator, 'subtle'));
  if (record.startsAt) {
    const date = new Date(record.startsAt);
    const time = element('time', new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium', timeStyle: 'short'
    }).format(date));
    time.dateTime = record.startsAt;
    copy.lastChild.append(document.createTextNode(' · '), time);
  }
  const arrow = element('span', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  row.append(copy, arrow);
  return row;
}

function renderList(id, entries, render, empty) {
  const list = byId(id);
  list.replaceChildren(...(entries.length ? entries.map(render) : [element('p', empty, 'subtle')]));
  list.setAttribute('aria-busy', 'false');
}

function renderStreams() {
  const entries = selectedPlatform === 'All' ? streamEntries :
    streamEntries.filter(entry => entry.platform === selectedPlatform);
  renderList('stream-list', entries, streamRow, streamEntries.length
    ? 'No listings for ' + selectedPlatform + '.'
    : 'No featured streams yet. Browse current broadcasts below.');
}

filters.addEventListener('click', event => {
  const button = event.target.closest('[data-platform]');
  if (!button) return;
  selectedPlatform = button.dataset.platform;
  for (const filter of filters.querySelectorAll('button')) {
    filter.setAttribute('aria-pressed', String(filter === button));
  }
  renderStreams();
});

function render(data) {
  const date = byId('release-date');
  date.dateTime = data.settings.releaseDate;
  date.textContent = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' })
    .format(new Date(data.settings.releaseDate + 'T00:00:00Z'));
  byId('release-platforms').textContent = data.settings.platforms;
  byId('release-source').href = data.settings.source;
  renderList('update-list', [...data.updates].sort((a, b) => b.date.localeCompare(a.date)), story, 'No updates have been published yet.');
  renderList('media-list', data.media, mediaTile, 'No media links have been published yet.');
  streamEntries = data.streams;
  filters.hidden = !streamEntries.length;
  renderStreams();
}

async function load() {
  try {
    const response = await fetch('/api/content', { cache: 'no-store' });
    if (!response.ok) throw new Error();
    render((await response.json()).data);
  } catch {
    const notice = byId('feed-notice');
    notice.hidden = false;
    try {
      const fallback = await fetch('/data/seed.json');
      if (!fallback.ok) throw new Error();
      render(await fallback.json());
      notice.textContent = 'Showing starter stories while the published feed is unavailable.';
    } catch {
      notice.textContent = 'The feed is unavailable. Reload to try again.';
      for (const id of ['update-list', 'stream-list', 'media-list']) {
        byId(id).replaceChildren();
        byId(id).setAttribute('aria-busy', 'false');
      }
    }
  }
}

load();
