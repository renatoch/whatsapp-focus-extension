[< Story](index.md)

# Test Guide — DS1

## Purpose

Validate that a bounded session-only set makes switching among focused conversations easier without exposing the full list or leaking conversation-derived titles into persistent or diagnostic data.

## Automated Checks

Run:

```bash
node --test tests/*.test.js
node --check awareness.js
node --check focus-state.js
node --check focused-recents.js
node --check content.js
python3 -m json.tool manifest.json >/dev/null
git diff --check
```

Required coverage:

- maximum four unique entries;
- existing entry moves to most-recent position;
- deterministic remove and clear;
- empty/invalid titles are rejected;
- exact-result classification returns one of `match`, `not-found`, or `ambiguous`;
- no partial or ambiguous result can be auto-selected;
- internal recent navigation hides native results before entering search;
- title fields are stripped from aggregate awareness events;
- existing focus, intent, expiry, and sidebar regressions remain green.

## Navigator Validation

Reload the unpacked extension after implementation.

### 1. Build the working set

1. Start from Modo Foco.
2. Open four synthetic/non-sensitive test conversations through **Buscar conversa**.
3. Confirm **Conversas em andamento** appears with four plain titles.
4. Confirm no preview, timestamp, badge, or unread state appears.

Pass: only the four focused-opened titles appear.  
Fail: full-mode visits appear, extra metadata appears, or more than four entries remain.

### 2. Switch without exposure

1. While one focused conversation is open, select another shelf entry.
2. Observe the entire transition.
3. Repeat among three or four entries.

Pass: the intended conversation opens and neither the general list nor native search results flash visibly.  
Fail: results/list appear, the wrong conversation opens, or manual search is required on the successful exact path.

### 3. Recency and capacity

1. Reopen an existing shelf conversation.
2. Confirm it moves to the most-recent position without duplication.
3. Open a fifth unique conversation through focus search.

Pass: the set remains unique and bounded at four, evicting the oldest entry.  
Fail: duplicate entries or more than four remain.

### 4. Failure safety

Exercise, when safely reproducible, a missing title and duplicate/similar title case.

Pass: no result is auto-opened, the full list remains hidden, and a neutral recovery path appears.  
Fail: the first partial/duplicate match opens or intermediate content is exposed.

Deliberate repetitive testing is not required when the same already-validated state transition is reused. One representative observation per distinct failure branch is sufficient.

### 5. Archived conversation

Open an archived conversation through focused search, retain it, then reopen it from the shelf.

Pass: it opens without changing archival state, or fails safely if WhatsApp does not provide one unambiguous exact result.  
Fail: archival state changes, the wrong chat opens, or the list becomes visible.

### 6. Removal, clear, and lifecycle

1. Remove one entry.
2. Clear the remaining set.
3. Build the set again and reload the page.

Pass: both shelf surfaces update immediately and reload restores no title.  
Fail: removed titles remain in memory/UI or survive reload.

### 7. Privacy inspection

After using synthetic test titles, inspect:

- `chrome.storage.local`;
- page `localStorage`;
- exported awareness JSON;
- DevTools console output.

Pass: no synthetic title appears in any inspected persistent or diagnostic surface. Aggregate route/failure events may appear.  
Fail: any conversation title is persisted, exported, or logged.

### 8. Regression pass

Confirm once:

- blind start;
- three-character manual-search gate and one-second settle;
- focus search selection;
- focused conversation and **Buscar**;
- sidebar normalization including Arquivadas;
- full-mode declaration/barrier;
- five-minute graceful expiry;
- awareness summary and historical DS3 events.

## Aggregate Experiment Validation

After several days of natural use, export awareness and report the actual retained time range. Compare:

- full-mode openings;
- openings soon after focused expiry;
- focused navigation through search versus shelf;
- shelf navigation failures;
- remove/clear use;
- qualitative working-memory cost.

DS1 passes experimentally when the shelf is used to switch among active conversations, full-mode navigation pressure appears lower, failures remain understandable and safe, and the shelf does not feel like a miniature inbox.

## Boundary

Manual Chrome E2E and later natural-use evidence are required. Automated checks alone cannot establish selector compatibility, absence of visible result flashes, correct Archived behavior, or reduced cognitive effort.
