[< Roadmap](../index.md)

# DS1 — Focused Recent Conversations

**Status:** 🟠 Implemented — pending Navigator validation

---

## Outcome

The user can move among a tiny session working set of recently opened focused conversations without repeatedly typing names, reconstructing where they were, or opening the full WhatsApp list to reduce cognitive effort.

The conversation list remains an instrument, not an environment.

## Why this matters

The current prototype is effective when opening one intentional conversation. Real use exposed a different cost when work alternates among 3–4 active conversations: repeated search consumes time and working memory, and full mode can become the lower-effort path even when the general list is not wanted.

The DS3 evidence supports testing a navigation response rather than adding friction. In the retained validation window, six of seventeen focused-conversation expiries were followed by another full-mode opening within five minutes; all six carried the broad **see-whats-new** declaration. This does not establish motive, but it is consistent with the reported multi-conversation switching cost.

## Proposed MVP behavior

- After a conversation is selected through focus search, add its visible title automatically to a session-only recent set.
- Keep at most 4 unique conversations, ordered by the most recent focused opening.
- Show the small set on the Modo Foco overlay and while a focused conversation is open.
- Clicking an item reopens that conversation without revealing the full conversation list.
- Allow an item to be removed and the set to be cleared.
- Do not add conversations visited through full mode.
- Clear the set when the page/content script reloads or the tab closes.

## Privacy boundary

The Navigator explicitly accepted temporary retention of focused conversation names for this experiment.

- Keep titles only in JavaScript memory for the current tab session.
- Do not write titles to `chrome.storage.local`, page `localStorage`, awareness events, logs, exports, or project files.
- Do not capture previews, message content, unread state, badges, timestamps, phone numbers, JIDs, URLs, search history, or DOM snapshots.
- Render retained titles as plain text.
- Awareness may record only aggregate actions such as adding, opening, removing, or clearing a focused recent; it must never include the title.

## Product constraints

- The surface must not become a second inbox.
- Maximum 4 entries.
- Membership changes only through focused navigation or explicit removal; incoming activity never adds or reorders entries.
- No previews, unread badges, timestamps, or incoming-message signals.
- Do not show the shelf during manual native search; search remains clean and intentional.
- Full mode does not need the shelf because the WhatsApp environment is already open.

## Technical hypothesis

The prototype may not have a stable, privacy-safe WhatsApp conversation identifier. A technical spike should first establish whether the extension can:

1. read the visible conversation title after a focus-search selection;
2. retain it only in tab memory;
3. reuse the existing visually gated native-search path;
4. locate an exact title match and open it without exposing intermediate results;
5. fail safely when titles are duplicated, changed, absent, or found only in Arquivadas.

No implementation should silently select the first partial match when identity is ambiguous.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS1.TS1 | Validate private title capture and exact focused reopening | Technical Story | A small technical experiment determines whether session-only titles can reopen the intended conversation without exposing intermediate results or choosing ambiguous matches. | Implemented — validation pending |
| DS1.US1 | Build the automatic session recent set | User Story | Conversations selected through focus search enter a bounded, unique, in-memory set while full-mode visits remain excluded. | Implemented — validation pending |
| DS1.US2 | Show focused recents on focused surfaces | User Story | Up to 4 plain-title actions appear on the overlay and in focused-conversation state without inbox signals. | Implemented — validation pending |
| DS1.US3 | Reopen a focused recent without exposing the full list | User Story | Selecting a recent conversation navigates through the least-distracting validated path and fails safely when ambiguous. | Implemented — validation pending |
| DS1.US4 | Remove or clear focused recents | User Story | The user can remove one retained title or clear the entire temporary set. | Implemented — validation pending |
| DS1.TS2 | Record aggregate experiment outcomes | Technical Story | The experiment records only privacy-safe counts needed to compare shelf use, repeated search, and full-mode reopening. | Implemented — validation pending |

## Done Condition

DS1 is done when the user can build and use a session-only working set of up to 4 conversations opened through focus, switch among them without seeing the general list, remove them, and evaluate whether this reduces repeated search and full-mode reopening without creating a miniature inbox or persisting conversation-derived data.

## Validation questions

- Can the visible title be captured after search without storing unrelated DOM data?
- Can an exact conversation be reopened safely when two chats have the same or similar title?
- Do archived conversations work without changing archival state?
- Is the shelf useful both on the overlay and beside an open focused conversation?
- Does automatic membership feel lighter than explicit pinning without becoming a stimulus surface?
- Do full-mode openings and post-expiry reopenings decrease during real use?
- Is explicit pinning still needed as a later hybrid, or does the automatic session set solve the actual problem?
