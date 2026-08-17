# Delivery Story Plan — DS2

**Journey:** extensao-chrome-foco-whatsapp-web  
**Method:** ariad  
**Navigator Flow Unit:** delivery_story

## Delivery Story

Adaptive Friction Awareness

## Objective

Executar um experimento local de 7 dias que registre a coreografia de abertura do WhatsApp normal sem dados de conversas, apresente uma síntese não moralizante fora do impulso e permita ao usuário interpretar os padrões antes de qualquer fricção adaptativa.

## Child Work Packages

- DS2.TS1
- DS2.US1
- DS2.US2
- DS2.US3
- DS2.TS2

## Scope

1. Create a small, testable awareness module separate from WhatsApp DOM behavior.
2. Persist a versioned local experiment state with:
   - experiment start timestamp;
   - normal-mode attempt and outcome events;
   - optional aggregate user reflections;
   - enabled/disabled state.
3. Record only interaction with the extension:
   - attempt start;
   - elapsed time until action;
   - countdown completion, **Abrir agora**, or recent-use **Abrir mesmo assim**;
   - cancellation or continuation in the focused conversation;
   - manual return to focus or automatic 5-minute expiry.
4. Calculate a rolling baseline summary:
   - normal-mode openings today and during the observation window;
   - short re-opening intervals;
   - fast completed sequences;
   - countdown versus immediate/explicit opening;
   - cancellations and returns to focus;
   - elapsed observation days.
5. Add a low-salience **Ver padrão de uso** action to Modo Foco. It must not interrupt every opening attempt.
6. Show an explicitly descriptive, non-diagnostic summary. Metrics may suggest a pattern but must not label an event as impulse, boredom, or anguish.
7. After seven days, invite an optional aggregate reflection: specific intent, waiting for a reply, anguish/boredom, automatism, or mixed/unclear.
8. Provide controls in the summary to disable collection and clear all awareness data.
9. Keep the existing normal-mode barrier behavior unchanged during the baseline.

## Data Contract

Use a versioned localStorage record under a new extension-specific key. The record may contain timestamps, durations, action enums, and aggregate reflection enums only.

It must never contain:

- message content;
- contact or conversation names;
- phone numbers;
- search terms;
- WhatsApp chat IDs/JIDs;
- DOM snapshots;
- URLs related to a conversation.

Retain at most 14 days of events and enforce a defensive event-count cap. Clearing must remove the complete awareness record. Disabling collection must stop new event writes without changing the core focus behavior.

## Technical Shape

- Add `awareness.js` as a pure/testable module loaded before `content.js`.
- Keep event normalization, pruning, summary calculation, and storage boundaries in that module.
- Keep WhatsApp DOM event wiring and summary UI integration in `content.js`.
- Add summary/dialog styling in `focus.css`.
- Load `awareness.js` from `manifest.json` before `content.js`.
- Use `textContent` or hardcoded markup only; never interpolate collected values through unsafe HTML.

## Non-Goals

- No adaptive or randomized friction in DS2.
- No inference or diagnosis of the user's emotional state.
- No message, contact, conversation, or search instrumentation.
- No backend, telemetry, synchronization, or cross-device data.
- No Chrome notification behavior.
- No release, tag, public distribution, or migration of historical v10 data.
- No broad refactor of the existing extension state machine.

## Acceptance Behavior

1. **Given** awareness collection is enabled, **when** the user enters and exits the normal-mode decision flow, **then** the relevant timing/action events are stored locally without conversation-level fields.
2. **Given** fewer than seven days have elapsed, **when** the user opens the summary voluntarily, **then** current descriptive metrics and baseline progress are visible without requesting a conclusion.
3. **Given** seven days have elapsed, **when** the summary is opened, **then** the user can optionally characterize the aggregate pattern without linking a label to an individual event.
4. **Given** collection is disabled, **when** normal mode is used, **then** no new awareness events are added and focus behavior still works.
5. **Given** the user clears awareness data, **when** the summary is reopened, **then** the experiment starts from an empty state.
6. **Given** malformed or old local state, **when** the extension loads, **then** it fails safely into a fresh/disabled-compatible state without breaking WhatsApp Focus.
7. **Given** events older than 14 days or beyond the cap, **when** state is read or written, **then** they are pruned.

## Validation Route

### Automated

Use Node's built-in test runner for the pure awareness module:

```bash
node --test tests/awareness.test.js
```

Cover normalization, safe schema, event pruning/cap, summary calculations, disabled collection, reset behavior, malformed storage, and reflection persistence.

Also run:

```bash
node --check awareness.js
node --check content.js
```

### Manual Chrome E2E

E2E is required because event wiring depends on WhatsApp DOM and real interaction timing. Load the unpacked extension, exercise each normal-mode path, inspect the voluntary summary, disable/re-enable collection, clear data, and verify the core focus/search/sidebar behavior remains intact.

For seven-day UI validation, use a documented local test procedure that seeds only synthetic timestamps in awareness storage; do not shorten the production baseline.

## Implementation Order

1. DS2.TS1 — test-first event schema, local storage adapter, retention and pure summary contract.
2. DS2.US1 — wire existing normal-mode actions and return paths to event recording.
3. DS2.US2 — render voluntary baseline progress and concise metrics.
4. DS2.US3 — add optional post-baseline aggregate interpretation.
5. DS2.TS2 — disable/clear controls, malformed-state safety, privacy inspection, regression pass.

## Implementation Contract

- TDD for awareness-module behavior.
- Keep changes scoped to DS2 children; do not absorb adaptive friction.
- Do not change existing barrier timing or normal-mode copy as part of instrumentation.
- Do not include sensitive WhatsApp-derived values in events, logs, tests, or docs.
- Stop for Navigator validation before release/tagging.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
