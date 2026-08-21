[< Roadmap](../index.md)

# DS4 — Graceful Normal-Mode Expiry

**Status:** 🟡 Proposed

---

## Outcome

When the five-minute full-WhatsApp window expires, the extension removes the general environment without interrupting a legitimate conversation already in progress.

## Why this matters

The current timer always returns to the Modo Foco overlay. If the user is typing or recording audio when time expires, the overlay interrupts the active flow and teaches the user to execute whichever bypass restores the conversation fastest.

This also contaminates awareness data: a reopening caused by the extension interrupting ongoing work can look like impulsive checking.

## Proposed behavior

At normal-mode expiry:

- if the WhatsApp tab is visible, the document has focus, and a conversation is open, transition to the focused-conversation state and hide only the lateral/sidebar;
- if the tab is in the background, the document lacks focus, or no conversation is open, return to the blind Modo Foco overlay.

Do not inspect draft text, message contents, contact identity, or audio-recording DOM state in the first version. Page focus plus an open conversation is the simpler and less fragile proxy.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS4.US1 | Preserve an active conversation when normal mode expires | User Story | An active visible conversation remains usable while the full conversation environment closes. | Candidate |
| DS4.US2 | Return inactive sessions to blind focus | User Story | Background, unfocused, or conversationless sessions still return to the Modo Foco overlay. | Candidate |
| DS4.TS1 | Distinguish automatic expiry destinations in awareness data | Technical Story | Awareness records whether expiry returned to focused conversation or blind overlay, preventing misleading interpretation. | Candidate |

## Done Condition

DS4 is done when timer expiry preserves a visible focused conversation without exposing the lateral, returns inactive/no-conversation sessions to the blind overlay, and records the destination without inspecting conversation content or fragile composition/audio state.
