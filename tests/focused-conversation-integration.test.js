const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(projectRoot, 'content.js'), 'utf8');
const css = fs.readFileSync(path.join(projectRoot, 'focus.css'), 'utf8');

test('focused conversation state explicitly enforces the hidden-sidebar invariant', () => {
  assert.match(
    content,
    /classList\.add\(ROOT_ACTIVE, ROOT_SEARCH_FOCUSED, ROOT_SIDEBAR_HIDDEN\)/
  );
  assert.match(css, /html\.mwf-sidebar-hidden #side\s*{\s*display: none !important;/);
});

test('focused expiry normalizes nested views before applying focused state', () => {
  assert.match(
    content,
    /if \(expiryDestination === "focused-conversation"\) \{\s*goToMainChatsThen\("expiry", \(\) => setSearchFocusedConversation\(\)\);/
  );
});

test('intent prompt keeps focused exit independent and preserves agreed search delay', () => {
  assert.match(content, /const SEARCH_SETTLE_MS = 1000;/);
  assert.match(content, /data-mwf-action="intent-return-focus">← Voltar ao modo foco/);
  assert.match(content, /value="process-pending"> Processar mensagens pendentes\/não lidas/);
  assert.doesNotMatch(content, /name="mwf-intent" value="specific-task"/);
  assert.match(content, /value="mixed-unclear"> Outro \/ ainda não sei/);
  assert.match(content, /recordAwareness\("intent_prompt_exited", \{ durationMs, destination: "focus-overlay" \}\)/);
  assert.match(content, /const NORMAL_DELAY_MS = 8000;/);
});
