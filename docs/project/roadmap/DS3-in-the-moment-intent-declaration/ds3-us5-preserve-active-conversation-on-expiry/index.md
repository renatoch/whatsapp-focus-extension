[< Parent](../index.md)

# DS3.US5 — Preserve active conversation when full mode expires

**Status:** 🟠 Implemented — awaiting manual validation
**Type:** User Story

---

## User Story

As a user actively working in a conversation,
I want the full-mode timer to remove the general environment without covering my conversation,
So that typing, thinking, and recording flow are not interrupted.

## Acceptance Behavior

```text
Given full WhatsApp mode is active
And the tab is visible and focused
And a conversation is open
When the five-minute timer expires
Then the extension transitions to focused-conversation mode
And hides the lateral/sidebar
And keeps the active conversation visible
```

```text
Given the tab is hidden or unfocused, or no conversation is open
When the five-minute timer expires
Then the blind Modo Foco overlay returns
```

## Scope

- Use page visibility, document focus, and existing open-conversation detection.
- Do not inspect draft text, message content, contact identity, or audio-recording DOM state.

## Validation

Manual Chrome validation of active typing/recording-adjacent flow plus inactive/background fallback.
