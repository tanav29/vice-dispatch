import { artwork, isHttps, platforms, streamStatuses } from './content.js';

const byId = id => document.getElementById(id);
const notice = byId('editor-notice');
const login = byId('sign-in');
const workspace = byId('workspace');
const form = byId('edit-form');
const fields = byId('fields');
const sections = byId('sections');
const recordPanel = byId('record-list');
const newRecord = byId('new-record');
const removeRecord = byId('delete-record');
const publishButton = byId('publish');
const signOut = byId('sign-out');
const titles = { updates: 'Updates', streams: 'Streams', media: 'Media', settings: 'Release info' };
const nouns = { updates: 'update', streams: 'stream', media: 'media link' };
const imageFields = [
  ['imageChoice', 'Artwork', ['No artwork', ...Object.values(artwork), 'Custom image URL']],
  ['image', 'Image URL', 'url', 2048, 'Use an HTTPS link to an image you have permission to use.'],
  ['imageAlt', 'Image description', 'text', 160]
];
const schemas = {
  updates: [
    ['title', 'Headline', 'text', 120], ['date', 'Date', 'date'], ['category', 'Category', 'text', 28],
    ['summary', 'Summary', 'textarea', 380], ['url', 'Source link', 'url', 2048], ...imageFields
  ],
  streams: [
    ['title', 'Listing title', 'text', 120], ['creator', 'Creator', 'text', 80],
    ['platform', 'Platform', platforms], ['status', 'Listing type', streamStatuses],
    ['startsAt', 'Start time', 'datetime-local', null, 'Enter your local time. Visitors see the time in their own time zone.'],
    ['url', 'Channel, broadcast, or replay link', 'url', 2048]
  ],
  media: [['title', 'Title', 'text', 120], ['type', 'Media type', 'text', 28], ['url', 'Link', 'url', 2048], ...imageFields],
  settings: [['releaseDate', 'Release date', 'date'], ['platforms', 'Platforms', 'text', 120], ['source', 'Official source', 'url', 2048]]
};
const artChoices = Object.keys(artwork);
let state;
let section = 'updates';
let selected = null;
let dirty = false;
let busy = false;

function tell(message = '', isError = false) {
  notice.textContent = message;
  notice.dataset.error = String(isError);
  notice.hidden = !message;
}

async function api(path, method = 'GET', body) {
  const response = await fetch('/api/' + path, {
    method, cache: 'no-store',
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not reach the editor. Try again.');
  return data;
}

function localTime(iso = new Date().toISOString()) {
  const actual = new Date(iso);
  return new Date(actual.getTime() - actual.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function makeField([name, label, type, max, hint], value) {
  const wrapper = document.createElement('label');
  const control = document.createElement(Array.isArray(type) ? 'select' : type === 'textarea' ? 'textarea' : 'input');
  control.name = name;
  control.required = true;
  if (Array.isArray(type)) {
    for (const choice of type) control.add(new Option(choice, choice));
  } else if (type === 'textarea') {
    control.rows = 4;
  } else {
    control.type = type;
  }
  if (max) control.maxLength = max;
  if (type === 'url') control.placeholder = 'https://';
  if (value) control.value = value;
  wrapper.append(label, control);
  if (hint) {
    const small = document.createElement('small');
    small.id = 'hint-' + name;
    small.textContent = hint;
    control.setAttribute('aria-describedby', small.id);
    wrapper.append(small);
  }
  return wrapper;
}

function syncConditionalFields() {
  const input = form.elements;
  if (input.status) {
    input.startsAt.disabled = input.status.value !== 'Scheduled';
    input.startsAt.closest('label').hidden = input.startsAt.disabled;
  }
  if (input.imageChoice) {
    input.image.disabled = input.imageChoice.value !== 'Custom image URL';
    input.imageAlt.disabled = input.imageChoice.value === 'No artwork';
    input.image.closest('label').hidden = input.image.disabled;
    input.imageAlt.closest('label').hidden = input.imageAlt.disabled;
  }
}

function sortedRecords() {
  const entries = state.data[section];
  return section === 'updates' ? [...entries].sort((a, b) => b.date.localeCompare(a.date)) : entries;
}

function renderEditor() {
  for (const button of sections.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.section === section));
  }
  const editingSettings = section === 'settings';
  const noun = nouns[section];
  recordPanel.hidden = editingSettings;
  removeRecord.hidden = !selected || editingSettings;
  byId('form-title').textContent = editingSettings ? titles[section] : (selected ? 'Edit ' : 'Add ') + noun;
  let values = state.data.settings;
  if (!editingSettings) {
    byId('records-title').textContent = titles[section];
    newRecord.textContent = 'Add ' + noun;
    const list = byId('records');
    const items = sortedRecords();
    const entries = items.map(entry => {
      const row = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.id = entry.id;
      button.setAttribute('aria-pressed', String(entry.id === selected));
      button.textContent = entry.title;
      row.append(button);
      return row;
    });
    if (!entries.length) {
      const empty = document.createElement('li');
      empty.className = 'subtle';
      empty.textContent = 'Nothing published here yet.';
      entries.push(empty);
    }
    list.replaceChildren(...entries);
    values = { ...items.find(entry => entry.id === selected) };
    if (section === 'updates' && !selected) values.date = localTime().slice(0, 10);
    if (values.startsAt) values.startsAt = localTime(values.startsAt);
    values.imageChoice = values.image ? (artwork[values.image] || 'Custom image URL') : 'No artwork';
    if (artwork[values.image]) values.image = '';
  }
  fields.replaceChildren(...schemas[section].map(spec => makeField(spec, values[spec[0]])));
  syncConditionalFields();
  dirty = false;
}

function switchTo(nextSection, nextRecord = null) {
  if (busy || (dirty && !confirm('Discard your unpublished changes?'))) return;
  section = nextSection;
  selected = nextRecord;
  tell();
  renderEditor();
  if (nextSection === 'settings' || nextRecord) fields.querySelector('input, select').focus();
}

form.addEventListener('input', event => {
  dirty = true;
  event.target.setCustomValidity('');
  if (event.target.name === 'imageChoice' && Object.values(artwork).includes(event.target.value)) {
    form.elements.imageAlt.value = event.target.value;
  }
  syncConditionalFields();
});
window.addEventListener('beforeunload', event => {
  if (dirty) event.preventDefault();
});
sections.addEventListener('click', event => {
  const next = event.target.dataset.section;
  if (next && next !== section) switchTo(next);
});
newRecord.addEventListener('click', () => {
  switchTo(section);
  if (!selected) fields.querySelector('input, select').focus();
});
byId('records').addEventListener('click', event => {
  if (event.target.dataset.id) switchTo(section, event.target.dataset.id);
});

function collect() {
  const values = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, value.trim()]));
  for (const control of form.querySelectorAll('input[type="url"]:not(:disabled)')) {
    if (!isHttps(control.value.trim())) {
      control.setCustomValidity('Enter an HTTPS URL.');
      control.reportValidity();
      return null;
    }
  }
  if (values.imageChoice) {
    const artIndex = Object.values(artwork).indexOf(values.imageChoice);
    values.image = artChoices[artIndex] || values.image || '';
    values.imageAlt ||= '';
    delete values.imageChoice;
  }
  if (section === 'streams') {
    const local = values.startsAt && new Date(values.startsAt);
    if (local && (!Number.isFinite(local.getTime()) || localTime(local.toISOString()) !== values.startsAt)) {
      form.elements.startsAt.setCustomValidity('Choose a valid local time.');
      form.elements.startsAt.reportValidity();
      return null;
    }
    values.startsAt = local ? local.toISOString() : '';
  }
  return values;
}

async function publish(data, id, message) {
  busy = true;
  publishButton.disabled = removeRecord.disabled = signOut.disabled = true;
  for (const control of fields.querySelectorAll('input, textarea, select')) control.disabled = true;
  tell('Publishing…');
  try {
    state = await api('content', 'PUT', { revision: state.revision, data });
    selected = id;
    renderEditor();
    tell(message);
  } catch (error) {
    for (const control of fields.querySelectorAll('input, textarea, select')) control.disabled = false;
    syncConditionalFields();
    tell(error.message, true);
  } finally {
    publishButton.disabled = removeRecord.disabled = signOut.disabled = busy = false;
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (busy) return;
  const values = collect();
  if (!values) return;
  const data = structuredClone(state.data);
  let id = selected;
  if (section === 'settings') {
    data.settings = values;
  } else if (selected) {
    const index = data[section].findIndex(entry => entry.id === selected);
    data[section][index] = { id, ...values };
  } else {
    id = crypto.randomUUID();
    data[section].unshift({ id, ...values });
  }
  publish(data, id, 'Published. The site now shows your changes.');
});

removeRecord.addEventListener('click', () => {
  if (busy || !selected || !confirm('Delete this ' + nouns[section] + ' from the site?')) return;
  const data = structuredClone(state.data);
  data[section] = data[section].filter(entry => entry.id !== selected);
  publish(data, null, 'Deleted from the site.');
});

async function openWorkspace() {
  state = await api('content');
  renderEditor();
  login.hidden = true;
  workspace.hidden = false;
  tell();
}

login.addEventListener('submit', async event => {
  event.preventDefault();
  const button = login.querySelector('button');
  button.disabled = true;
  tell('Signing in…');
  try {
    await api('session', 'POST', { password: login.elements.password.value });
    login.reset();
    await openWorkspace();
    sections.querySelector('button').focus();
  } catch (error) {
    tell(error.message, true);
  } finally {
    button.disabled = false;
  }
});

signOut.addEventListener('click', async () => {
  if (busy || (dirty && !confirm('Sign out and discard your unpublished changes?'))) return;
  signOut.disabled = true;
  try {
    await api('session', 'DELETE');
    dirty = false;
    section = 'updates';
    selected = null;
    workspace.hidden = true;
    login.hidden = false;
    tell('Signed out.');
    login.elements.password.focus();
  } catch (error) {
    tell(error.message, true);
  } finally {
    signOut.disabled = false;
  }
});

try {
  const { signedIn } = await api('session');
  if (signedIn) await openWorkspace();
  else {
    login.hidden = false;
    tell();
  }
} catch (error) {
  tell(error.message, true);
}
