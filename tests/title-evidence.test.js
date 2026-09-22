const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const rules = require('../focused-recents.js');
function inspect(row) {
  const adapterPath = path.join(__dirname, '../scripts/whatsapp-dom.js');
  if (fs.existsSync(adapterPath)) return require(adapterPath).createWhatsAppDom({ document: {}, window: {} }).readConversationRowTitleDetails(row);
  const source = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
  const context = vm.createContext({});
  for (const name of ['readTitle', 'readConversationRowTitleDetails']) {
    const start = source.indexOf(`  function ${name}(`);
    assert.notEqual(start, -1);
    vm.runInContext(source.slice(start, source.indexOf('\n  function ', start + 1)), context);
  }
  return context.readConversationRowTitleDetails(row);
}
function element(title, text = title) { return { getAttribute: () => title, textContent: text }; }
test('evidence notices a fragment without changing the selected title', () => {
  const selected = element('Example');
  const row = { querySelectorAll: (selector) => selector === '[data-testid="cell-frame-title"] [title]' ? [selected] : [],
    querySelector: () => element('', 'Example - extended') };
  const evidence = inspect(row);
  assert.equal(evidence.title, 'Example');
  assert.equal(evidence.titleSource, 'frameChildTitle');
  assert.equal(evidence.containerTextRelation, 'different');
  assert.equal(evidence.selectedTextDifferent, false);
});
test('fallback source and title attribute/text differences are structural evidence', () => {
  const row = { querySelectorAll: (selector) => selector === 'span[title]' ? [element('Example', 'Other Example')] : [], querySelector: () => null };
  const evidence = inspect(row);
  assert.equal(evidence.title, 'Example');
  assert.equal(evidence.titleSource, 'spanTitle');
  assert.equal(evidence.containerTextRelation, 'missing');
  assert.equal(evidence.selectedTextDifferent, true);
});
test('only exact matches contribute to bounded title-free diagnostics', () => {
  const target = {};
  const candidates = [
    { title: 'Example', clickTarget: target, titleSource: 'frameTitle', containerTextRelation: 'same' },
    { title: 'Example', clickTarget: target, titleSource: 'spanTitle', containerTextRelation: 'different', selectedTextDifferent: true },
    { title: 'Example', clickTarget: {}, titleSource: 'autoSpanTitle', containerTextRelation: 'missing' },
    { title: 'Example - extended', clickTarget: {} },
    { title: 'EXAMPLE', clickTarget: {} },
  ];
  const structure = rules.describeExactMatches('Example', candidates);
  assert.deepEqual(structure, { uniqueTargets: 2, frameChildTitle: 0, frameTitle: 1, autoSpanTitle: 1, spanTitle: 1, unknownSource: 0, selectedTextDifferent: 1, containerTextDifferent: 1, containerMissing: 1 });
  const diagnostic = rules.updateNavigationDiagnostic(null, { matchStructure: { ...structure, title: 'Private', dom: 'Private', uniqueTargets: 999999, frameTitle: -2 } });
  assert.equal(diagnostic.matchStructure.uniqueTargets, 1000);
  assert.equal(diagnostic.matchStructure.frameTitle, 0);
  assert.equal(JSON.stringify(diagnostic).includes('Private'), false);
  assert.equal(JSON.stringify(diagnostic).includes('Example'), false);
});
