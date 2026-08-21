# Delivery Story Plan — DS3

**Journey:** extensao-chrome-foco-whatsapp-web  
**Method:** ariad  
**Navigator Flow Unit:** delivery_story

## Delivery Story

In-the-Moment Intent Declaration

## Objective

Migrar awareness para armazenamento isolado da extensão e iniciar a Fase 2: coletar intenção estruturada e nota livre opcional no momento de abrir o WhatsApp normal, registrar a decisão final e preservar dados comportamentais para avaliar padrões e futura habituação à própria pergunta.

## Child Work Packages

- DS3.TS1
- DS3.US1
- DS3.US2
- DS3.US3
- DS3.US4
- DS3.TS2
- DS3.US5
- DS3.TS3

## Scope

1. Add the minimum Chrome `storage` permission.
2. Convert the awareness persistence boundary to an asynchronous adapter backed by `chrome.storage.local`.
3. Perform a one-time safe migration of the allowlisted Phase 1 awareness record:
   - read only `mirror-whatsapp-focus-awareness-v1` from page-origin storage;
   - normalize it through the allowlist;
   - write and verify the extension-isolated record;
   - remove the old awareness key only after successful persistence;
   - leave unrelated localStorage keys untouched.
4. Evolve the awareness schema to preserve explicit phase boundaries:
   - migrated events are Phase 1;
   - new intent-prompt events are Phase 2;
   - existing timing/action collection continues.
5. Before the existing normal-mode pause, show a neutral intent declaration:
   - fazer algo específico;
   - checar se alguém respondeu;
   - ver se apareceu algo, sem objetivo específico;
   - pausar/escapar do que estou fazendo ou sentindo;
   - misto / não sei.
6. Allow an optional free-text note with a clear local-storage disclosure and a defensive length limit.
7. Require a structured choice before proceeding; free text remains optional.
8. Offer **Abrir WhatsApp** and **Não abrir agora**.
9. When the user chooses to open, continue through the existing 8-second/recent-use barrier unchanged.
10. Associate the declared intention and note with the final outcome:
    - opened after countdown/immediate/recent confirmation;
    - cancelled;
    - continued in the focused conversation;
    - chose not to open at the declaration step.
11. Extend the usage mirror with:
    - intent category distribution;
    - open/not-open outcome by intent;
    - user-authored notes in chronological order;
    - prompt timing/repetition signals for future habituation analysis.
12. Preserve pause, clear, retention, and privacy controls.
13. Before validating Phase 2, change five-minute expiry so a visible, focused tab with an open conversation transitions to focused-conversation mode instead of the blind overlay.
14. Keep the blind overlay as the expiry destination when the tab is hidden/unfocused or no conversation is open, and record which destination was chosen.

## Storage And Migration Contract

- Use `chrome.storage.local` for the full awareness record.
- Keep the existing last-normal-open timestamp separate for now; it contains no free text and remains outside DS3 migration scope.
- Migration must be idempotent.
- If isolated storage already contains a valid record, never overwrite it with page-origin data.
- If isolated persistence fails, retain the old Phase 1 record and keep the core focus experience working.
- After successful migration, remove only the old awareness key.
- Notes are user-authored and may contain sensitive material by choice. They must never be inserted through unsafe HTML, logged, exported automatically, or exposed to WhatsApp page scripts.
- Enforce the existing 14-day retention and event cap; cap each note at 280 characters for the MVP.

## Interaction Flow

1. User chooses **Ver WhatsApp normal por 5 min**.
2. Extension shows **Estou abrindo o WhatsApp normal para…**.
3. User selects one category and may write a note.
4. User chooses:
   - **Abrir WhatsApp** → existing mindful pause/recent confirmation continues;
   - **Não abrir agora** → return to Modo Foco and record the non-opening outcome.
5. If the user proceeds but later cancels or continues in the focused conversation, retain the originally declared intent with that final outcome.

The question is observational, not accusatory. It must not claim that a category is healthier or worse.

## Technical Shape

- Keep `awareness.js` as the pure schema, migration, retention, summary, and storage boundary.
- Introduce async storage adapters with test doubles for Node tests.
- Initialize/migrate awareness before enabling the intent UI, without delaying the blind-start protection.
- Queue or safely ignore awareness writes during initialization; never block core focus actions on storage failure.
- Keep DOM rendering/event wiring in `content.js`.
- Use `textContent` for notes and dynamic summaries.
- Preserve a stable attempt identifier only for joining local events from the same opening flow; it must not derive from WhatsApp data.

## Non-Goals

- No automatic extraction of conversation, contact, message, search, or WhatsApp identifiers.
- No NLP, sentiment analysis, diagnosis, or automatic classification of free text.
- No backend, synchronization, export, cloud backup, or cross-device behavior.
- No decision yet about keeping the prompt permanently.
- No randomized/adaptive prompt behavior in this Delivery Story.
- No release, push, or public distribution without a later explicit gate.
- No migration of unrelated localStorage keys.

## Acceptance Behavior

1. **Given** valid Phase 1 localStorage data and empty extension storage, **when** DS3 initializes, **then** sanitized data is preserved as Phase 1 in `chrome.storage.local` and the old awareness key is removed.
2. **Given** isolated storage already has valid data, **when** initialization runs again, **then** migration is idempotent and does not overwrite it.
3. **Given** migration persistence fails, **when** initialization runs, **then** old data remains and WhatsApp Focus still works.
4. **Given** the user requests normal mode, **when** no intent is selected, **then** the extension does not proceed and asks neutrally for one choice.
5. **Given** an intent and optional note, **when** the user chooses **Abrir WhatsApp**, **then** the existing normal-mode barrier continues and the eventual outcome remains linked to that intent.
6. **Given** an intent, **when** the user chooses **Não abrir agora**, **then** normal mode does not open and the outcome is recorded.
7. **Given** a free-text note, **when** it is later displayed, **then** it appears as text only from extension-isolated storage.
8. **Given** Phase 1 and Phase 2 events, **when** the mirror is opened, **then** the phases and their metrics are not silently mixed.
9. **Given** repeated prompt use, **when** data accumulates, **then** prompt response timing and repeated choices remain available for later habituation evaluation.
10. **Given** collection is paused or cleared, **when** the intent flow is used, **then** controls retain their documented behavior without breaking focus.
11. **Given** full mode expires while the tab is visible/focused and a conversation is open, **when** the timer completes, **then** the lateral closes but the active conversation remains visible.
12. **Given** full mode expires in a background/unfocused tab or without an open conversation, **when** the timer completes, **then** the blind overlay returns.
13. **Given** either expiry route, **when** awareness records the event, **then** focused-conversation and blind-overlay destinations remain distinguishable.

## Validation Route

### Automated

Use Node's built-in test runner:

```bash
node --test tests/awareness.test.js
node --check awareness.js
node --check content.js
python3 -m json.tool manifest.json >/dev/null
```

Cover async adapter behavior, successful/idempotent/failed migration, v1-to-v2 phase conversion, note allowlisting and length cap, intent/outcome association, phase-separated summaries, prompt timing signals, retention, pause, clear, malformed state, and storage failure safety.

### Manual Chrome E2E

Reload the extension because the manifest permission and content-script storage initialization change. Validate:

- Phase 1 counters survive migration;
- the old awareness key disappears from `localStorage` only after migration;
- intent category is required;
- note is optional and displayed safely;
- **Abrir WhatsApp** continues into the existing pause;
- **Não abrir agora**, cancel, and continue-focused outcomes are distinct;
- the mirror separates Phase 1 baseline from Phase 2 intention data;
- pause/clear controls work;
- blind start, search, sidebar, recent confirmation, and five-minute expiry regressions remain green.

## Implementation Order

1. **Prerequisite scope correction:** DS3.US5 + DS3.TS3 — graceful expiry and destination instrumentation, completed before further Phase 2 validation so tool-induced reopenings do not contaminate evidence.
2. DS3.TS1 — async isolated storage adapter, migration, v2 schema, tests.
3. DS3.US1 — structured declaration UI and required category.
4. DS3.US2 — optional note and safe rendering.
5. DS3.US3 — final outcome association across all existing paths.
6. DS3.US4 — intent/outcome/note reflection UI.
7. DS3.TS2 — phase separation, prompt timing/habituation signals, failure/privacy/regression pass.

The first six original packages have an implementation commit, but DS3 validation remains blocked until the newly absorbed prerequisite packages are planned/approved by Ariad and implemented.

## Implementation Contract

- TDD for storage, migration, schema, and summary behavior.
- Do not persist free text until isolated storage migration is complete.
- Never delete Phase 1 data before verified isolated persistence.
- Do not absorb adaptive friction or text analysis into DS3.
- Stop for Navigator validation before release/tagging.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
