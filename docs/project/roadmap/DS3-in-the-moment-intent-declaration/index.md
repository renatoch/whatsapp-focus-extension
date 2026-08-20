[< Roadmap](../index.md)

# DS3 — In-the-Moment Intent Declaration

**Status:** 🟡 Proposed

---

## Outcome

Before opening full WhatsApp, the user can declare what is bringing them there through a lightweight choice and optional free-text note, then either continue or not open. The extension preserves that declared intention alongside the existing behavioral events so later reflection can compare stated motives, final choices, and signs that the new question itself may be becoming choreography.

## Why this matters

Phase 1 established through real use that the fixed pause had become automatic: 18 of 18 openings were completed in at most two seconds, none waited for the countdown, and no attempt ended in cancellation or continuation in the focused conversation.

Behavioral events can establish choreography but cannot reliably infer motive. Asking the user to reconstruct motives later introduces forgetting and hindsight bias. Phase 2 therefore captures self-reported intention in the moment without framing the question as a challenge or accusation.

## Product behavior

Before the existing normal-mode opening action completes, ask:

> Estou abrindo o WhatsApp normal para…

Initial choices:

- fazer algo específico;
- checar se alguém respondeu;
- ver se apareceu algo, sem objetivo específico;
- pausar/escapar do que estou fazendo ou sentindo;
- misto / não sei.

The user may add an optional free-text note, then choose:

- **Abrir WhatsApp**;
- **Não abrir agora**.

The note is intentionally part of the MVP so the experiment can reveal missing standard choices. It is user-authored private material and must be stored in extension-isolated storage, shown back to the user, and removable.

## Privacy boundary

Before persisting free text, migrate awareness state from page-origin `localStorage` to `chrome.storage.local`.

- Add the minimum Chrome `storage` permission.
- Migrate the existing allowlisted Phase 1 state once, then delete its old awareness key from page-origin storage.
- Do not migrate unrelated WhatsApp or extension keys.
- Store no message content, contact/conversation name, phone, search term, JID, DOM snapshot, or conversation URL automatically.
- Free text may contain whatever the user intentionally writes; communicate that it remains local to the extension and can be cleared.
- Preserve data pause and clear controls.

## Experiment boundary

- Preserve Phase 1 behavioral collection so prompt habituation can be evaluated later without a new collection stage.
- Mark Phase 2 events explicitly so Phase 1 and Phase 2 remain analytically distinct.
- Treat declared intention as self-report, not objective truth.
- Do not infer a psychological diagnosis from a selected category or note.
- Do not decide now whether the prompt is permanent; collect evidence and evaluate later.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS3.TS1 | Migrate awareness data to extension-isolated storage | Technical Story | Existing allowlisted Phase 1 data moves once to `chrome.storage.local`, page-origin awareness data is removed, and the awareness API becomes safely asynchronous. | Candidate |
| DS3.US1 | Declare intent before opening full WhatsApp | User Story | Each normal-mode attempt offers neutral structured intent choices before the final open/not-open decision. | Candidate |
| DS3.US2 | Add an optional private note | User Story | The user can add free text to reveal missing categories and see that note in later reflection without exposing it to page scripts. | Candidate |
| DS3.US3 | Record the final decision with declared intent | User Story | The extension associates the self-reported intent with opening or not opening while preserving Phase 1 behavioral signals. | Candidate |
| DS3.US4 | Reflect on intent patterns and notes | User Story | The usage mirror summarizes intent distribution, outcomes, and user-authored notes without diagnosing motivation. | Candidate |
| DS3.TS2 | Preserve phase boundaries and prompt-habituation signals | Technical Story | Phase 1 and Phase 2 remain distinguishable, and timing/repetition data can later show whether the declaration prompt became choreography. | Candidate |

## Done Condition

DS3 is done when existing awareness data has migrated to extension-isolated storage, the user can declare structured intent and an optional note before choosing to open or not open, the usage mirror can show intention/outcome patterns and notes, and continued behavioral collection can support a later evaluation of prompt habituation. No automatically derived WhatsApp conversation data is collected.

## Validation questions

- Can the user answer without feeling accused or delayed by a form?
- Which free-text notes reveal a missing standard category?
- Does declaring intent change the final decision?
- Do particular intentions correlate with rapid repeated openings?
- How quickly does the declaration sequence itself become automatic?
- Does seeing notes later produce recognition rather than surveillance or shame?
