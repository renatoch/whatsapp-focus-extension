const test = require('node:test');
const assert = require('node:assert/strict');

const {
  VERSION,
  MAX_COLLECTIONS,
  MAX_MEMBERS,
  createEmptyState,
  sanitizeState,
  createCollection,
  addMember,
  removeMember,
  deleteCollection,
} = require('../fixed-collections.js');

test('sanitizes persisted collections to the allowlisted schema', () => {
  const state = sanitizeState({
    version: VERSION,
    collections: [{
      name: '  Casa  ',
      members: ['  Gatos  ', 'gatos', 'Apartamento'],
      previews: ['private'],
      unread: true,
      jid: 'private',
    }],
    messages: ['private'],
    searchTerms: ['private'],
  });

  assert.deepEqual(state, {
    version: VERSION,
    collections: [{ name: 'Casa', members: ['Gatos', 'Apartamento'] }],
  });
  assert.equal(JSON.stringify(state).includes('private'), false);
});

test('rejects unsupported or malformed persisted state safely', () => {
  assert.deepEqual(sanitizeState(null), createEmptyState());
  assert.deepEqual(sanitizeState({ version: 99, collections: [{ name: 'Casa', members: ['Gatos'] }] }), createEmptyState());
  assert.deepEqual(sanitizeState({ version: VERSION, collections: 'not-an-array' }), createEmptyState());
});

test('creates at most five normalized-unique collections', () => {
  let state = createEmptyState();
  for (const name of ['Casa', 'Trabalho', 'Família', 'Amigos', 'Projetos']) {
    const result = createCollection(state, name);
    assert.equal(result.status, 'created');
    state = result.state;
  }
  assert.equal(state.collections.length, MAX_COLLECTIONS);
  assert.equal(createCollection(state, '  casa ').status, 'exists');
  assert.equal(createCollection(state, 'Extra').status, 'collection-limit');
  assert.equal(createCollection(state, '   ').status, 'invalid-name');
});

test('adds at most eight normalized-unique member titles', () => {
  let state = createCollection(createEmptyState(), 'Casa').state;
  for (let index = 1; index <= MAX_MEMBERS; index += 1) {
    const result = addMember(state, 'Casa', `Grupo ${index}`);
    assert.equal(result.status, 'added');
    state = result.state;
  }
  assert.equal(addMember(state, 'Casa', ' grupo 1 ').status, 'exists');
  assert.equal(addMember(state, 'Casa', 'Grupo 9').status, 'member-limit');
  assert.equal(addMember(state, 'Ausente', 'Grupo').status, 'collection-not-found');
  assert.equal(addMember(state, 'Casa', '').status, 'invalid-title');
});

test('removes one member or collection without changing unrelated data', () => {
  let state = createCollection(createEmptyState(), 'Casa').state;
  state = createCollection(state, 'Trabalho').state;
  state = addMember(state, 'Casa', 'Gatos').state;
  state = addMember(state, 'Casa', 'Apartamento').state;
  state = addMember(state, 'Trabalho', 'Equipe').state;

  const withoutMember = removeMember(state, 'Casa', ' gatos ');
  assert.equal(withoutMember.status, 'removed');
  assert.deepEqual(withoutMember.state.collections, [
    { name: 'Casa', members: ['Apartamento'] },
    { name: 'Trabalho', members: ['Equipe'] },
  ]);

  const withoutCollection = deleteCollection(withoutMember.state, 'Casa');
  assert.equal(withoutCollection.status, 'deleted');
  assert.deepEqual(withoutCollection.state.collections, [
    { name: 'Trabalho', members: ['Equipe'] },
  ]);
});

test('rejects overlong values instead of truncating exact titles', () => {
  let state = createEmptyState();
  assert.equal(createCollection(state, 'x'.repeat(65)).status, 'invalid-name');
  state = createCollection(state, 'Casa').state;
  assert.equal(addMember(state, 'Casa', 'x'.repeat(513)).status, 'invalid-title');
});
