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
} = require('../focused-recents.js');

test('normalizes titles only for equality', () => {
  assert.equal(normalizeTitle('  Equipe   Produto  '), 'equipe produto');
  assert.equal(normalizeTitle(''), '');
  assert.equal(normalizeTitle(null), '');
});

test('keeps five unique titles in most-recent-first order', () => {
  let recents = [];
  for (const title of ['Alpha', 'Beta', 'Gamma', 'Delta']) recents = addRecent(recents, title);
  assert.deepEqual(recents, ['Delta', 'Gamma', 'Beta', 'Alpha']);

  recents = addRecent(recents, 'Beta');
  assert.deepEqual(recents, ['Beta', 'Delta', 'Gamma', 'Alpha']);

  recents = addRecent(recents, 'Epsilon');
  assert.deepEqual(recents, ['Epsilon', 'Beta', 'Delta', 'Gamma', 'Alpha']);
  recents = addRecent(recents, 'Zeta');
  assert.deepEqual(recents, ['Zeta', 'Epsilon', 'Beta', 'Delta', 'Gamma']);
});

test('deduplicates normalized titles while preserving the latest display text', () => {
  const recents = addRecent(['Equipe Produto', 'Outra'], '  equipe   produto ');
  assert.deepEqual(recents, ['equipe produto', 'Outra']);
});

test('rejects empty titles and supports remove and clear', () => {
  assert.deepEqual(addRecent(['Alpha'], '   '), ['Alpha']);
  assert.deepEqual(removeRecent(['Alpha', 'Beta'], ' alpha '), ['Beta']);
  assert.deepEqual(clearRecents(), []);
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
  assert.deepEqual(classifyExactTitleMatches('Equipe', ['Equipe', ' equipe ']), {
    status: 'ambiguous',
    index: null,
  });
});
