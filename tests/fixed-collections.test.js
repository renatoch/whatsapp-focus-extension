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
      members: ['  Gatos  ', 'Gatos', 'gatos', 'Apartamento'],
      previews: ['private'],
      unread: true,
      jid: 'private',
    }],
    messages: ['private'],
    searchTerms: ['private'],
  });

  assert.deepEqual(state, {
    version: VERSION,
    collections: [{ name: 'Casa', members: ['Gatos', 'gatos', 'Apartamento'] }],
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

test('adds at most ten normalized-unique member titles and preserves them on reload', () => {
  assert.equal(MAX_MEMBERS, 10);
  let state = createCollection(createEmptyState(), 'Casa').state;
  for (let index = 1; index <= MAX_MEMBERS; index += 1) {
    const result = addMember(state, 'Casa', `Grupo ${index}`);
    assert.equal(result.status, 'added');
    state = result.state;
  }
  assert.equal(addMember(state, 'Casa', ' Grupo 1 ').status, 'exists');
  assert.equal(addMember(state, 'Casa', 'Grupo 11').status, 'member-limit');
  assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(state))), state);
  assert.equal(addMember(state, 'Ausente', 'Grupo').status, 'collection-not-found');
  assert.equal(addMember(state, 'Casa', '').status, 'invalid-title');
});

test('removes one member or collection without changing unrelated data', () => {
  let state = createCollection(createEmptyState(), 'Casa').state;
  state = createCollection(state, 'Trabalho').state;
  state = addMember(state, 'Casa', 'Gatos').state;
  state = addMember(state, 'Casa', 'Apartamento').state;
  state = addMember(state, 'Trabalho', 'Equipe').state;

  const withoutMember = removeMember(state, 'Casa', ' Gatos ');
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

test('case-distinct members survive reload and can be removed independently', () => {
  let state = createCollection(createEmptyState(), 'Trabalho').state;
  state = addMember(state, 'trabalho', 'Forja').state;
  const added = addMember(state, 'Trabalho', 'FORJA');
  assert.equal(added.status, 'added');
  state = sanitizeState(JSON.parse(JSON.stringify(added.state)));
  assert.deepEqual(state.collections[0].members, ['Forja', 'FORJA']);
  assert.equal(addMember(state, 'Trabalho', ' Forja ').status, 'exists');
  assert.deepEqual(removeMember(state, 'Trabalho', 'Forja').state.collections[0].members, ['FORJA']);
  assert.deepEqual(removeMember(state, 'Trabalho', 'FORJA').state.collections[0].members, ['Forja']);
  assert.equal(removeMember(state, 'Trabalho', 'forja').status, 'member-not-found');
});

test('rejects overlong values instead of truncating exact titles', () => {
  let state = createEmptyState();
  assert.equal(createCollection(state, 'x'.repeat(65)).status, 'invalid-name');
  state = createCollection(state, 'Casa').state;
  assert.equal(addMember(state, 'Casa', 'x'.repeat(513)).status, 'invalid-title');
});
