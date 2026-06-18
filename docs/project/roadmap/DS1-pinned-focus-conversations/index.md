[< Roadmap](../index.md)

# DS1 — Pinned Focus Conversations

**Status:** 🟡 Proposed

---

## Outcome

The user can keep a tiny active shelf of conversations found through search, allowing movement between 2–3 current conversations without reopening the full WhatsApp list and without repeating the full Foco → Buscar path every time.

This preserves the core product decision: the list remains an instrument, not an environment.

## Why this matters

The current prototype is good at opening one intentional conversation. The next friction appears when the user legitimately needs a small working set — for example, two collaborators or one active thread plus one reference thread. Repeating search every time adds friction to intentional use; opening the full list reintroduces distraction.

Pinned focus conversations are a middle path: a small, explicit, temporary shelf.

## Proposed MVP behavior

- After selecting a conversation from focus search, the focused state offers **Fixar conversa**.
- Up to 3 conversations can be pinned.
- Pinned conversations appear on the Modo Foco overlay as chips.
- Clicking a chip opens that conversation without exposing the full conversation list.
- Each chip has a small remove action.
- Pins are session-scoped for the first experiment: they survive mode changes in the current page session but do not need durable storage yet.

## Product constraints

- Pinned conversations must not become a second inbox.
- Maximum 3 pinned conversations.
- Do not show message previews, unread badges, timestamps, or recency signals in pinned chips.
- Do not show pinned conversations during native search mode; search should remain clean and intentional.
- Modo normal does not need pinned chips because the WhatsApp environment is already fully open.

## Technical hypothesis

The safest MVP may not have a stable WhatsApp conversation ID. If direct navigation is unavailable, clicking a pinned chip can reuse the native search path:

1. enter search mode internally;
2. type/search the stored conversation title;
3. select the first matching result;
4. return to focused conversation.

This is fragile but consistent with the prototype strategy and suitable for validation.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS1.US1 | Pin current searched conversation | User Story | User can pin the current focused conversation after selecting it from search. | Candidate |
| DS1.US2 | Show pinned conversations on focus overlay | User Story | User sees up to 3 pinned conversation chips in Modo Foco. | Candidate |
| DS1.US3 | Open pinned conversation without exposing full list | User Story | Clicking a pinned chip opens that conversation through the least-distracting available path. | Candidate |
| DS1.US4 | Remove pinned conversation | User Story | User can remove a pinned chip when it is no longer part of the current focus set. | Candidate |
| DS1.TS1 | Define pin storage and expiration boundary | Technical Story | Prototype uses session-scoped pin state and avoids accidental permanent favorites. | Candidate |

## Done Condition

DS1 is done when a user can pin up to 3 searched conversations, see them from Modo Foco, open them without viewing the general list, remove them, and validate whether this reduces repeated search/full-list exposure without creating a new distracting surface.

## Open validation questions

- Should pins survive reloads, or is session-only enough?
- Does opening by searching the stored title select the right conversation reliably?
- Should pinning happen automatically after search, or only through explicit “Fixar conversa”?
- Should pinned chips appear in focused conversation state too, or only on the overlay?
