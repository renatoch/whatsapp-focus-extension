# Bounded Astra continuation

Navigator authorized Astra-only refactors without Sol handoffs while away, allowing
multiple checked checkpoints and ordinary branch backups. The temporary quota
exception is 90% consumed in the provider's five-hour window (no separate daily
metric is exposed); the existing 70% weekly stop remains. Check fresh sanitized
readings between stages. No background scheduler or automatic eight-hour resume is
installed. Stop on unclear scope, unresolvable regression or required live acceptance.
Main/installed extension, .mirror, selectors, privacy schemas and user-facing behavior
remain untouched. No merge, release or packaging authority is added.

## Slice 1: intent and attempt lifecycle

From normal-mode checkpoint `7155a7b`, extract `scripts/intent-controller.js`:
prompt timestamp, pending declaration, attempt timestamp, association of attempt
outcomes, and prompt/proceed/decline/pre-declaration return orchestration. Inject
clock/ID generator, narrow UI hooks, existing awareness recorder and normal/mode
callbacks. Keep form selectors, markup, strings, storage, sanitization/280-character
note policy and awareness rendering in composition/existing pure modules.

Characterize before extraction: missing overlay/choice, prompt reset, durations,
proceed without recording outcome early, open/cancel/Continue outcome association,
decline, pre-declaration return, no duplicate association, mode cleanup, no authored
input leakage into aggregate attempt events. Migrate these assertions to the real
factory; retain UI/event bridges only for still-composed code. Add synchronous
reentrancy and dispose/start tests. No import-time DOM access, no second copy of
state in content.js, no new telemetry fields. Preserve normal-controller nested
cleanup and existing timestamps/route decisions.

Run full Node suite, JS syntax, manifest parse and diff checks; review actual diff,
update architecture/test evidence, then checkpoint and branch backup only if green.
Do not declare whole-application disposal or Chrome equivalence.

## Optional slice 2: development assets

Only after slice 1 is reviewed and quotas are checked, isolate existing CSS/config
refresh ownership without splitting CSS yet. Preserve configuration conversion,
fetch sequence, one-second cadence, URLs and fallback behavior; own interval and
reject stale async completions after disposal. Characterize before extraction;
add fake-fetch lifecycle tests and bootstrap contracts. Do not change manifest
resource permissions, introduce automatic JS reload, or redesign configuration.
Record actual outcomes; if quota or complexity prevents this slice, leave it planned.
