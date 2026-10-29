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

test('surface-aware policy preserves native tasks and never uses a background conversation for lists', () => {
  const active={visibilityState:'visible',documentHasFocus:true,hasOpenConversation:true};
  for(const [surface,expected]of [['channel','focused-channel'],['status-player','status-player'],['status-list','blind-overlay'],['channel-list','blind-overlay'],['unknown','blind-overlay']]) {
    assert.equal(FocusState.chooseExpiryDestination({...active,surface}),expected);
    assert.equal(FocusState.chooseExpiryDestination({...active,surface,documentHasFocus:false}),'blind-overlay');
    assert.equal(FocusState.chooseExpiryDestination({...active,surface,visibilityState:'hidden'}),'blind-overlay');
  }
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
