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

### DS1 — Focused Recent Conversations

Status: done — Navigator accepted as good for now

DS1 originally delivered four session-only conversations opened through focused search. A subsequent Navigator-approved experiment now keeps the five most recently opened conversations across full-mode selection, search, collections, recents, and Continue. Titles remain only in tab memory; exact reopening uses a visually hidden native-search route and fails closed on missing or ambiguous matches. The new capture rule awaits live validation; DS1's original closure remains historical evidence.

See: [`DS1-pinned-focus-conversations/index.md`](DS1-pinned-focus-conversations/index.md)

### DS2 — Adaptive Friction Awareness

Status: done — Phase 1 closed early after decisive real-use evidence

Detected that the fixed normal-mode barrier had become automatic choreography and added a private behavioral baseline plus a provisional usage mirror.

See: [`DS2-adaptive-friction-awareness/index.md`](DS2-adaptive-friction-awareness/index.md)

### DS3 — In-the-Moment Intent Declaration

Status: done — extended real-use validation completed

Captured structured self-reported intent and final outcomes without inferring motive. Phase 2 established that the declaration and fixed delay had become choreography: 103/106 declarations ended in opening and 102/106 prompts were answered within five seconds. The next experiment should lower focused-navigation cost rather than add mechanical friction.

See: [`DS3-in-the-moment-intent-declaration/index.md`](DS3-in-the-moment-intent-declaration/index.md)

### DS4 — Graceful Normal-Mode Expiry

Status: absorbed into DS3 as a prerequisite; do not pull independently

This scope now blocks DS3 validation because forced timer expiry interrupts active work and contaminates Phase 2 evidence. The separate package remains only as decision history.

See: [`DS4-graceful-normal-mode-expiry/index.md`](DS4-graceful-normal-mode-expiry/index.md)

### DS5 — Focused Fixed Collections

Status: implemented — Navigator validation pending

Provides collapsed, user-curated collections such as “Casa” across conversations in the main list and Arquivadas. Only explicitly selected display titles and user-authored collection names may persist locally; exact reopening remains ambiguity-safe.

See: [`DS5-focused-fixed-collections/index.md`](DS5-focused-fixed-collections/index.md)

### DS6 — Modular Extension Architecture

Status: implementing approved plan on refactor/ds6-modular-architecture in an isolated worktree

Separates WhatsApp DOM access, navigation/state ownership, UI surfaces, and styles into cohesive modules while preserving current behavior and privacy. Includes behavioral characterization and targeted live regression validation rather than a file-size-only split. DS6 is the active implementation item. Accepted navigation fixes form its regression baseline; DS5's aggregate closure evidence remains separate.

See: [`DS6-modular-extension-architecture/index.md`](DS6-modular-extension-architecture/index.md)

### Later candidates

- Native mark-unread shortcut: allow an open conversation to be marked as unread without manually searching for it again. This is independent from collections, must mutate WhatsApp's native unread state rather than create an extension-only reminder, and requires real Web-to-mobile synchronization validation.
- Archived unread filter: replicate the main chat unread filter inside Arquivadas.
- Configuration and toggles: allow sensitive parameters like delay duration, normal-mode duration, and search minimum letters to be adjusted.
- Dev ergonomics: local Chrome remote-debugging workflow to reload extension and WhatsApp tab automatically.
- Hardening: remove/gate development hot-refresh and review privacy/security before public distribution.
