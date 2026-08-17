[< Story](index.md)

# Test Guide — DS2

## Automated Validation

Run:

```bash
node --test tests/awareness.test.js
node --check awareness.js
node --check content.js
```

Expected coverage:

- valid empty state and schema version;
- safe handling of malformed/unsupported stored state;
- event allowlist rejects or strips unknown/sensitive fields;
- collection disabled means no new events;
- 14-day retention and defensive event cap;
- intervals and elapsed action timing;
- opening-path counts: countdown, immediate, recent explicit confirmation;
- cancellation, continue-conversation, manual focus return, and automatic expiry counts;
- baseline progress before seven days;
- reflection availability after seven days;
- aggregate reflection persistence and complete reset.

## Manual Chrome E2E

### Setup

1. Load the repository folder as an unpacked Chrome extension.
2. Reload `https://web.whatsapp.com`.
3. Open DevTools only when inspecting local awareness state; do not paste real conversation data into tests or docs.

### Baseline recording

1. From Modo Foco, open the normal-mode pause and cancel.
2. Repeat and choose **Abrir agora**.
3. Return manually to focus.
4. Open normal mode again within 10 minutes and use **Abrir mesmo assim**.
5. Allow one normal-mode session to expire automatically.
6. Continue in the focused conversation from the pause when a conversation exists.

Pass condition: the summary reflects extension-interaction counts and timings only. Stored events contain no names, phones, messages, searches, JIDs, URLs, or DOM content.

### Summary before seven days

1. Open **Ver padrão de uso** voluntarily.
2. Confirm it shows observation progress and descriptive metrics.
3. Confirm it does not demand interpretation or interrupt the normal-mode opening flow.

Pass condition: the summary acts as a low-pressure mirror and existing friction remains unchanged.

### Seven-day state

In WhatsApp Web DevTools, seed only the experiment start timestamp and reload:

```js
const key = "mirror-whatsapp-focus-awareness-v1";
const state = JSON.parse(localStorage.getItem(key));
state.startedAt = Date.now() - (8 * 24 * 60 * 60 * 1000);
localStorage.setItem(key, JSON.stringify(state));
location.reload();
```

Pass condition: the summary offers optional aggregate interpretation with the agreed categories and stores no event-level emotional label.

### Data controls

1. Disable collection.
2. Exercise normal mode and verify event count does not increase.
3. Re-enable collection and verify recording resumes.
4. Clear all awareness data.

Pass condition: controls work without breaking focus, search, sidebar, or normal mode.

### Regression

Verify:

- blind start still appears;
- search remains gated until three letters;
- selecting a conversation hides the lateral;
- contextual search and Foco controls still work;
- 8-second normal-mode pause remains unchanged;
- recent-use explicit confirmation remains unchanged;
- five-minute expiry still returns to focus.

## Aggregate Delivery Story Pass Condition

DS2 passes when automated tests are green, manual Chrome E2E confirms the complete event paths and controls, stored data is demonstrably conversation-agnostic, and the Navigator confirms that the summary feels like a mirror rather than surveillance or moral judgment.

## Validation Evidence

Pending implementation and Navigator validation.
