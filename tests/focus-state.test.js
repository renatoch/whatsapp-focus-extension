const test = require('node:test');
const assert = require('node:assert/strict');
const FocusState = require('../focus-state.js');

test('preserves a visible focused open conversation when full mode expires', () => {
  assert.equal(
    FocusState.chooseExpiryDestination({
      visibilityState: 'visible',
      documentHasFocus: true,
      hasOpenConversation: true,
    }),
    'focused-conversation'
  );
});

test('returns to blind overlay when the document is not focused', () => {
  assert.equal(
    FocusState.chooseExpiryDestination({
      visibilityState: 'visible',
      documentHasFocus: false,
      hasOpenConversation: true,
    }),
    'blind-overlay'
  );
});

test('returns to blind overlay for hidden or conversationless sessions', () => {
  assert.equal(
    FocusState.chooseExpiryDestination({
      visibilityState: 'hidden',
      documentHasFocus: true,
      hasOpenConversation: true,
    }),
    'blind-overlay'
  );
  assert.equal(
    FocusState.chooseExpiryDestination({
      visibilityState: 'visible',
      documentHasFocus: true,
      hasOpenConversation: false,
    }),
    'blind-overlay'
  );
});
