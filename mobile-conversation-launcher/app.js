const STORAGE_KEY = 'whatsapp-focus-mobile-launcher-contacts';

const DEFAULT_CONTACTS = [];

const state = {
  contacts: loadContacts(),
  query: '',
};

const els = {
  searchInput: document.querySelector('#searchInput'),
  favoritesList: document.querySelector('#favoritesList'),
  contactsList: document.querySelector('#contactsList'),
  emptyState: document.querySelector('#emptyState'),
  addContactButton: document.querySelector('#addContactButton'),
  importButton: document.querySelector('#importButton'),
  exportButton: document.querySelector('#exportButton'),
  importFile: document.querySelector('#importFile'),
  dialog: document.querySelector('#contactDialog'),
  form: document.querySelector('#contactForm'),
  dialogTitle: document.querySelector('#dialogTitle'),
  contactId: document.querySelector('#contactId'),
  contactName: document.querySelector('#contactName'),
  contactPhone: document.querySelector('#contactPhone'),
  contactTags: document.querySelector('#contactTags'),
  contactFavorite: document.querySelector('#contactFavorite'),
  cancelDialogButton: document.querySelector('#cancelDialogButton'),
};

function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `contact-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadContacts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_CONTACTS;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_CONTACTS;
    return parsed.map(normalizeContact).filter(Boolean);
  } catch {
    return DEFAULT_CONTACTS;
  }
}

function saveContacts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.contacts));
}

function normalizeContact(contact) {
  const target = contact?.url || contact?.phone;
  if (!contact || !contact.name || !target) return null;

  const normalizedTarget = normalizeTarget(target);
  if (!normalizedTarget) return null;

  return {
    id: contact.id || createId(),
    name: String(contact.name).trim(),
    type: contact.type || normalizedTarget.type,
    phone: normalizedTarget.phone || '',
    url: normalizedTarget.url || '',
    tags: Array.isArray(contact.tags)
      ? contact.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : parseTags(contact.tags || ''),
    favorite: Boolean(contact.favorite),
  };
}

function normalizeTarget(target) {
  const value = String(target).trim();
  if (!value) return null;

  if (/chat\.whatsapp\.com\//i.test(value)) {
    const url = value.startsWith('http') ? value : `https://${value}`;
    return { type: 'group', url };
  }

  const phone = normalizePhone(value);
  if (!phone) return null;
  return { type: 'person', phone };
}

function normalizePhone(phone) {
  return String(phone).replace(/[^0-9]/g, '');
}

function parseTags(value) {
  return String(value)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function contactSearchText(contact) {
  return [contact.name, contact.type, contact.phone, contact.url, ...contact.tags].join(' ').toLowerCase();
}

function filteredContacts() {
  const query = state.query.trim().toLowerCase();
  const contacts = [...state.contacts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  if (!query) return contacts;
  return contacts.filter((contact) => contactSearchText(contact).includes(query));
}

function whatsappUrl(contact) {
  if (contact.type === 'group') return contact.url;
  return `https://wa.me/${contact.phone}`;
}

function render() {
  const contacts = filteredContacts();
  const favorites = contacts.filter((contact) => contact.favorite);

  els.emptyState.hidden = state.contacts.length > 0;
  renderList(els.favoritesList, favorites, 'Nenhuma favorita encontrada.');
  renderList(els.contactsList, contacts, 'Nenhuma conversa encontrada.');
}

function renderList(container, contacts, emptyText) {
  container.replaceChildren();

  if (contacts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-message';
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  for (const contact of contacts) {
    container.append(createContactCard(contact));
  }
}

function createContactCard(contact) {
  const card = document.createElement('article');
  card.className = 'contact-card';

  const main = document.createElement('div');
  main.className = 'contact-main';

  const info = document.createElement('div');
  const name = document.createElement('h3');
  name.className = 'contact-name';
  name.textContent = contact.name;

  const meta = document.createElement('p');
  meta.className = 'contact-meta';
  meta.textContent = formatTarget(contact);

  const tags = document.createElement('div');
  tags.className = 'tags';
  for (const tag of contact.tags) {
    const tagEl = document.createElement('span');
    tagEl.className = 'tag';
    tagEl.textContent = tag;
    tags.append(tagEl);
  }

  info.append(name, meta, tags);

  const star = document.createElement('button');
  star.type = 'button';
  star.className = 'ghost';
  star.textContent = contact.favorite ? '★' : '☆';
  star.ariaLabel = contact.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  star.addEventListener('click', () => toggleFavorite(contact.id));

  main.append(info, star);

  const actions = document.createElement('div');
  actions.className = 'contact-actions';

  const open = document.createElement('a');
  open.href = whatsappUrl(contact);
  open.className = 'button primary';
  open.textContent = 'Abrir no WhatsApp';
  open.rel = 'noreferrer';
  open.addEventListener('click', () => recordLastOpened(contact));

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.textContent = 'Editar';
  edit.addEventListener('click', () => openDialog(contact));

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'danger';
  remove.textContent = 'Remover';
  remove.addEventListener('click', () => removeContact(contact.id));

  actions.append(open, edit, remove);
  card.append(main, actions);
  return card;
}

function formatTarget(contact) {
  if (contact.type === 'group') return 'Grupo · link de convite';
  return maskPhone(contact.phone);
}

function maskPhone(phone) {
  if (phone.length <= 4) return '••••';
  return `${phone.slice(0, 4)}••••${phone.slice(-4)}`;
}

function toggleFavorite(id) {
  state.contacts = state.contacts.map((contact) =>
    contact.id === id ? { ...contact, favorite: !contact.favorite } : contact,
  );
  saveContacts();
  render();
}

function removeContact(id) {
  const contact = state.contacts.find((item) => item.id === id);
  if (!contact) return;
  if (!confirm(`Remover ${contact.name}?`)) return;
  state.contacts = state.contacts.filter((item) => item.id !== id);
  saveContacts();
  render();
}

function openDialog(contact = null) {
  els.dialogTitle.textContent = contact ? 'Editar conversa' : 'Adicionar conversa';
  els.contactId.value = contact?.id || '';
  els.contactName.value = contact?.name || '';
  els.contactPhone.value = contact?.url || contact?.phone || '';
  els.contactTags.value = contact?.tags?.join(', ') || '';
  els.contactFavorite.checked = Boolean(contact?.favorite);
  els.dialog.showModal();
  els.contactName.focus();
}

function closeDialog() {
  els.dialog.close();
  els.form.reset();
}

function saveContactFromForm(event) {
  event.preventDefault();

  const contact = normalizeContact({
    id: els.contactId.value || createId(),
    name: els.contactName.value,
    phone: els.contactPhone.value,
    tags: parseTags(els.contactTags.value),
    favorite: els.contactFavorite.checked,
  });

  if (!contact) return;

  const existing = state.contacts.some((item) => item.id === contact.id);
  state.contacts = existing
    ? state.contacts.map((item) => (item.id === contact.id ? contact : item))
    : [...state.contacts, contact];

  saveContacts();
  closeDialog();
  render();
}

function exportContacts() {
  const blob = new Blob([JSON.stringify(state.contacts, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'whatsapp-focus-contacts.json';
  link.click();
  URL.revokeObjectURL(url);
}

async function importContacts(file) {
  if (!file) return;
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('JSON precisa ser uma lista de contatos.');
  const contacts = parsed.map(normalizeContact).filter(Boolean);
  state.contacts = contacts;
  saveContacts();
  render();
}

function recordLastOpened(contact) {
  localStorage.setItem(
    'whatsapp-focus-mobile-launcher-last-opened',
    JSON.stringify({ id: contact.id, name: contact.name, openedAt: new Date().toISOString() }),
  );
}

els.searchInput.addEventListener('input', (event) => {
  state.query = event.target.value;
  render();
});

els.addContactButton.addEventListener('click', () => openDialog());
els.cancelDialogButton.addEventListener('click', closeDialog);
els.form.addEventListener('submit', saveContactFromForm);
els.exportButton.addEventListener('click', exportContacts);
els.importButton.addEventListener('click', () => els.importFile.click());
els.importFile.addEventListener('change', async (event) => {
  try {
    await importContacts(event.target.files[0]);
  } catch (error) {
    alert(error.message || 'Não foi possível importar contatos.');
  } finally {
    event.target.value = '';
  }
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}

render();
