[< Story](index.md)

# Test Guide — DS6

## Aggregate Validation

Prove behavior and privacy equivalence across the module extraction, not merely reduced line counts. Planning baseline: 77 tests last passed before Navigator acceptance of stabilized reopening. No DS6 implementation tests have been executed yet.

## Automated Matrix

- Adapter: synthetic DOM for current selectors, exact title normalization, main/archived normalization, native input/clear, mousedown activation and empty-search sibling isolation. No real contacts, message content or DOM snapshots.
- Search: zero/one/two/three characters, initial one-second gate, clear-to-known-navigation, no Enter leakage from extension controls.
- Navigation: transient ambiguity → two stable unique samples → one click; persistent ambiguity and missing results → bounded failure; target replacement/query mismatch → no click; cancellation → stale callbacks inert; header confirmation remains mandatory.
- Recency: five unique session-only titles for supported entry routes, no incoming-message capture, no false search telemetry for other routes.
- Collections: five collections × ten members, unchanged sanitized schema, create/add/remove/delete, reload persistence, missing storage/failure handling, no expansion persistence.
- UI continuity: same member node retained during unrelated updates, expansion preserved across member openings, scroll offset preserved, fixed recent-slot geometry including zero entries, opaque panel and native empty-search isolation.
- Normal/intent: deterministic clocks for eight-second barrier, recent-use explicit confirmation, declaration versus pre-declaration return, five-minute expiry destinations and nested-view normalization. Exact event association/allowlists and authored-note handling remain compatible.
- Lifecycle: start once, dispose, restart; no duplicate listeners, observers, intervals or deferred navigation; no delayed callback mutates a disposed controller.
- Composition: all modules loaded in dependency order before bootstrap, no circular wiring, no import-time DOM effects; CSS manifest order matches the development concatenation order, and partial asset refresh failures retain the previous complete styles.
- Privacy: titles stay out of awareness/diagnostics/logs; only explicit collection data and existing authored inputs persist. Diagnostic samples remain bounded and structural.

## Commands After Each Extraction Boundary

From the extension project directory:

```bash
node --test tests/*.test.js
find . -path './.git' -prune -o -path './node_modules' -prune -o -path './releases' -prune -o -path './mobile-conversation-launcher' -prune -o -path './tmp' -prune -o -name '*.js' -print0 | xargs -0 -n1 node --check
node -e 'JSON.parse(require("fs").readFileSync("manifest.json", "utf8"))'
git diff --check
```

Prefer targeted checks while developing, then the complete suite before each functional commit. Check any configured CI before declaring Done; no push is authorized by this plan. If local-only verification leaves a CI gate unavailable, report it rather than claim it passed.

## Child Work Packages

- DS6.TS1
- DS6.TS2
- DS6.TS3
- DS6.TS4
- DS6.TS5
- DS6.TS6

## Navigator Validation

One compact Chrome smoke route after automated checks:

1. Manually reload extension and tab. Confirm blind entry, no content flash, existing collections preserved and session recents reset.
2. Choose **Buscar**. With an existing collection, confirm native clutter is absent, collections are initially collapsed and the search field/controls remain usable. Type and clear: known navigation disappears/returns; the native three-character/one-second gate still applies.
3. Open a collection, then switch two members in sequence (one archived when available). Confirm no general-list flash, unchanged expansion and pointer/scroll position as recent membership grows.
4. Return through **Continuar conversa**; confirm focused navigation remains available. Open one conversation in full mode and confirm it joins recents without another search.
5. Check one normal-mode/intent return/expiry path if its orchestration changed. Use deterministic automated coverage for the remaining timing combinations; do not request repeated waits for each extracted module.
6. Spot-check create/remove/delete and reload persistence only if the store/chooser seam needs live verification. Do not repeat all 5×10 limit combinations manually when domain tests establish them.

**Pass:** same visible behavior, no newly exposed native signals, equivalent persistence/events, stable exact navigation, and modular ownership documented.

**Fail:** wrong or partial conversation opens, transient native inbox exposure, moving/collapsing collection panel, duplicate event handling/timers, broken CSS refresh or storage, new content collection, or behavior hidden behind weakened tests.

Missing/ambiguous-title failures are primarily synthetic automated tests; if a live failure occurs, use only its structural diagnostic. No real title needs to be copied into project artifacts.

## Validation Evidence

Pending plan approval, implementation, automated verification, targeted Chrome acceptance and Debt Review. Existing Navigator acceptance belongs to the pre-refactor baseline, not to DS6 results.
