[< Parent](../index.md)

# DS3.TS3 — Record the automatic expiry destination

**Status:** 🟡 Planned  
**Type:** Technical Story

---

## Technical Story

In order to keep Phase 2 evidence interpretable,
I want automatic timer events to distinguish focused-conversation expiry from blind-overlay expiry,
So that reopenings caused by the tool are not confused with impulsive checking.

## Acceptance Behavior

```text
Given normal mode expires automatically
When awareness records the expiry
Then the event identifies either focused-conversation or blind-overlay destination
And records no conversation-derived data
```

## Scope

- Extend the allowlisted expiry event schema with a destination enum.
- Preserve Phase 1 migration and Phase 2 separation.
- Add automated tests for both destinations and unknown-value rejection.

## Out Of Scope

- Draft/audio detection.
- Conversation identity or content.
- Retrospective reinterpretation of older expiry events.

## Validation

Node tests for schema/summary behavior plus manual Chrome evidence from both expiry routes.
