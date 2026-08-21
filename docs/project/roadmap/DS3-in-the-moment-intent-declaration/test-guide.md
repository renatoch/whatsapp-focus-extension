[< Story](index.md)

# Test Guide — DS3

## Automated Validation

Run:

```bash
node --test tests/awareness.test.js
node --check awareness.js
node --check content.js
python3 -m json.tool manifest.json >/dev/null
```

Expected coverage:

- asynchronous storage adapter reads/writes/removes safely;
- successful migration preserves sanitized Phase 1 data;
- migration is idempotent;
- failed isolated write does not delete old data;
- v1 events become Phase 1 and new intent events are Phase 2;
- structured categories are allowlisted;
- unknown categories and fields are rejected;
- optional notes are capped at 280 characters;
- notes are retained only as intentionally authored text;
- final outcomes remain associated with the declaration attempt;
- summaries separate Phase 1 and Phase 2;
- prompt timing/repetition signals remain available;
- retention, event cap, pause, clear, malformed state, and storage failure remain safe.

## Manual Chrome E2E

### Migration

1. Before reloading the updated extension, confirm Phase 1 data is visible.
2. Reload the extension and WhatsApp Web.
3. Confirm the Phase 1 summary still exists.
4. In DevTools, confirm this old page-origin key is absent after successful migration:

```js
localStorage.getItem("mirror-whatsapp-focus-awareness-v1")
```

Pass condition: it returns `null`, while the extension UI still shows the migrated baseline.

### Intent declaration

1. Choose **Ver WhatsApp normal por 5 min**.
2. Try proceeding without a category.
3. Select each category in separate attempts.
4. Add a short note in one attempt and leave it empty in another.
5. Test **Não abrir agora**.
6. Test **Abrir WhatsApp**, then:
   - wait for countdown;
   - use **Abrir agora**;
   - use recent **Abrir mesmo assim**;
   - cancel;
   - continue in the focused conversation.

Pass condition: the declaration is neutral, category is required, note is optional, and each final outcome remains distinct.

### Notes and mirror

1. Open **Ver padrão de uso**.
2. Confirm Phase 1 baseline and Phase 2 intent data are visibly distinct.
3. Confirm the primary Phase 2 cards show declarations, openings, decisions not to open, and later changes of path.
4. Confirm timing/reopening metrics are secondary under **Coreografia dos cliques**.
5. Confirm authored notes are visible as plain text and do not render markup.
6. Enter a note containing `<img src=x onerror=alert(1)>` for a controlled safety test.

Pass condition: the literal text appears and no HTML/script executes.

### Graceful expiry prerequisite

1. Open full mode with a conversation visible and keep the WhatsApp tab focused until the five-minute timer expires.
2. Confirm the lateral closes while the active conversation remains visible and usable.
3. Repeat with the tab in the background or without an open conversation.
4. Confirm those cases return to the blind overlay.
5. Confirm awareness distinguishes both expiry destinations.

Pass condition: active work is not covered by the overlay, inactive sessions remain blind, and tool-induced transitions are not recorded as indistinguishable expiry events.

### Data controls and regressions

1. Pause collection and exercise the intent/open flow.
2. Resume collection.
3. Clear awareness data and confirm both phases/notes disappear.
4. Verify blind start, gated search, focused conversation, sidebar, recent confirmation, manual focus return, and five-minute expiry.

Pass condition: data controls and existing WhatsApp Focus behavior remain intact.

## Aggregate Delivery Story Pass Condition

DS3 passes when Phase 1 data migrates safely to extension-isolated storage, real-time intent and optional notes can be captured without page exposure, all final decisions are represented, the mirror separates phases and creates a recognizable reflection, automated checks pass, and the Navigator accepts the lived interaction.

## Validation Evidence

Pending implementation and Navigator validation.
