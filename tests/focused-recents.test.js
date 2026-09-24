const test = require('node:test');
const assert = require('node:assert/strict');

const {
  addRecent,
  removeRecent,
  clearRecents,
  classifyExactTitleMatches,
  createNavigationDiagnostic,
  updateNavigationDiagnostic,
  normalizeTitle,
  visibleRecents,
  hiddenRecentCount,
} = require('../focused-recents.js');

test('normalizes titles only for equality', () => {
  assert.equal(normalizeTitle('  Equipe   Produto  '), 'Equipe Produto');
  assert.equal(normalizeTitle(''), '');
  assert.equal(normalizeTitle(null), '');
});

test('keeps ten unique titles in most-recent-first order', () => {
  let recents = [];
  for (const title of ['Alpha', 'Beta', 'Gamma', 'Delta']) recents = addRecent(recents, title);
  assert.deepEqual(recents, ['Delta', 'Gamma', 'Beta', 'Alpha']);

  recents = addRecent(recents, 'Beta');
  assert.deepEqual(recents, ['Beta', 'Delta', 'Gamma', 'Alpha']);

  recents = addRecent(recents, 'Epsilon');
  assert.deepEqual(recents, ['Epsilon', 'Beta', 'Delta', 'Gamma', 'Alpha']);
  for (const title of ['Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda']) recents = addRecent(recents, title);
  assert.deepEqual(recents, ['Lambda', 'Kappa', 'Iota', 'Theta', 'Eta', 'Zeta', 'Epsilon', 'Beta', 'Delta', 'Gamma']);
});

test('shows five recents by default and up to ten after explicit expansion', () => {
  const recents = Array.from({ length: 10 }, (_, index) => `Chat ${index + 1}`);
  assert.deepEqual(visibleRecents(recents, false), recents.slice(0, 5));
  assert.deepEqual(visibleRecents(recents, true), recents);
  assert.equal(hiddenRecentCount(recents, false), 5);
  assert.equal(hiddenRecentCount(recents.slice(0, 8), false), 3);
  assert.equal(hiddenRecentCount(recents, true), 0);
});

test('deduplicates normalized titles while preserving the latest display text', () => {
  const recents = addRecent(['Equipe Produto', 'Outra'], '  Equipe   Produto ');
  assert.deepEqual(recents, ['Equipe Produto', 'Outra']);
});

test('rejects empty titles and supports remove and clear', () => {
  assert.deepEqual(addRecent(['Alpha'], '   '), ['Alpha']);
  assert.deepEqual(removeRecent(['Alpha', 'Beta'], ' Alpha '), ['Beta']);
  assert.deepEqual(clearRecents(), []);
});

test('case-distinct titles remain independently selectable and removable', () => {
  const recents = addRecent(addRecent([], 'Forja'), 'FORJA');
  assert.deepEqual(recents, ['FORJA', 'Forja']);
  assert.deepEqual(removeRecent(recents, 'Forja'), ['FORJA']);
  assert.deepEqual(classifyExactTitleMatches('Forja', ['FORJA', 'Forja']), { status: 'match', index: 1 });
  assert.deepEqual(classifyExactTitleMatches('FORJA', ['FORJA', 'Forja']), { status: 'match', index: 0 });
  assert.deepEqual(classifyExactTitleMatches('Forja', ['FORJA']), { status: 'not-found', index: null });
  assert.deepEqual(classifyExactTitleMatches('Forja', ['Forja', 'Forja', 'FORJA']), { status: 'ambiguous', index: null });
});

test('keeps navigation diagnostics structural and strips conversation data', () => {
  const diagnostic = updateNavigationDiagnostic(createNavigationDiagnostic(), {
    stage: 'results-inspected',
    searchFieldFound: true,
    searchTextAccepted: false,
    candidateRows: 7,
    candidateTitles: 3,
    exactMatches: 0,
    title: 'Private title',
    searchText: 'Private title',
    dom: '<div>Private title</div>',
  });

  assert.deepEqual(diagnostic, {
    version: 1,
    stage: 'results-inspected',
    searchFieldFound: true,
    searchTextAccepted: false,
    candidateRows: 7,
    candidateTitles: 3,
    exactMatches: 0,
    clickDispatched: false,
    headerMatched: false,
    failureReason: null,
    elapsedMs: 0,
    resultSamples: [],
  });
  assert.equal(JSON.stringify(diagnostic).includes('Private title'), false);
});

test('classifies exact title matches without accepting partial matches', () => {
  assert.deepEqual(classifyExactTitleMatches('Equipe', ['Equipe Norte', 'Equipe']), {
    status: 'match',
    index: 1,
  });
  assert.deepEqual(classifyExactTitleMatches('Equipe', ['Equipe Norte']), {
    status: 'not-found',
    index: null,
  });
  assert.deepEqual(classifyExactTitleMatches('Equipe', ['Equipe', ' Equipe ']), {
    status: 'ambiguous',
    index: null,
  });
});
