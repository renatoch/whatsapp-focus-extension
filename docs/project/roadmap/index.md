# Roadmap — WhatsApp Focus Mode

Ariad-governed roadmap for the WhatsApp Focus Mode prototype.

## Current product decisions to preserve

- WhatsApp Web opens in a blind focus state by default.
- The user should see WhatsApp content only after declaring intent.
- The conversation list is an instrument, not an environment; it appears only when needed.
- Search is intentional and should not expose recent conversations before enough input.
- Focused conversation view should hide the lateral/sidebar after selection.
- Opening full WhatsApp normal is an escape valve, not the default path.
- Friction should interrupt automatic behavior without becoming punitive or blocking legitimate use.
- Prototype speed is acceptable, but distribution requires privacy/security hardening.

## Active release state

- Latest release tag: `v10`
- Current validated features:
  - blind start overlay;
  - native search with reduced visual noise;
  - gated search results before 3 letters;
  - contextual search-again button;
  - native loading progress mirrored in the overlay;
  - mindful normal-mode delay and recent-use confirmation;
  - sidebar normalization through Conversas/Chats.

## Delivery Story candidates

### DS1 — Pinned Focus Conversations

Status: proposed

Enable the user to keep a tiny active shelf of 2–3 conversations found through search, so they can move between current work conversations without reopening the full WhatsApp list or repeating the full search flow.

See: [`DS1-pinned-focus-conversations/index.md`](DS1-pinned-focus-conversations/index.md)

### DS2 — Adaptive Friction Awareness

Status: done — Phase 1 closed early after decisive real-use evidence

Detected that the fixed normal-mode barrier had become automatic choreography and added a private behavioral baseline plus a provisional usage mirror.

See: [`DS2-adaptive-friction-awareness/index.md`](DS2-adaptive-friction-awareness/index.md)

### DS3 — In-the-Moment Intent Declaration

Status: implementing — isolated storage and intent declaration ready for manual validation

Capture structured self-reported intent and an optional private note before opening full WhatsApp, then compare intention, final decision, and continued choreography signals without inferring motive from clicks.

See: [`DS3-in-the-moment-intent-declaration/index.md`](DS3-in-the-moment-intent-declaration/index.md)

### DS4 — Graceful Normal-Mode Expiry

Status: proposed — next item after the current DS3 validation/work boundary

When the five-minute full-mode window expires, preserve a visible active conversation in focused mode while returning inactive or conversationless sessions to the blind overlay. This prevents interruption of typing/audio flow and avoids contaminating awareness data with tool-induced reopenings.

See: [`DS4-graceful-normal-mode-expiry/index.md`](DS4-graceful-normal-mode-expiry/index.md)

### Later candidates

- Archived unread filter: replicate the main chat unread filter inside Arquivadas.
- Configuration and toggles: allow sensitive parameters like delay duration, normal-mode duration, and search minimum letters to be adjusted.
- Dev ergonomics: local Chrome remote-debugging workflow to reload extension and WhatsApp tab automatically.
- Hardening: remove/gate development hot-refresh and review privacy/security before public distribution.
