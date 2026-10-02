# Astra → Sol → Astra: normal confirmation timers and temporary access

## Authority

Navigator authorized the next DS6 refactor. This is the next bounded execution
handoff under the approved DS6 plan, not a replacement DS plan or DS6 completion.

- Worktree: `/mnt/e/renato/mirror/focus-lab/whatsapp-focus-extension-ds6`.
- Branch: `refactor/ds6-modular-architecture`; inspected production base `2304811`.
- Previous `next-extraction-handoff.md` is completed historical mode-controller work.
- Astra plans; Navigator switches to Sol for implementation; Sol stops BEFORE
  commit/push. Astra reviews and resolves findings before a checkpoint/backup.
- Main, its installed extension and runtime `.mirror/` remain untouched.
- No merge, release, package, new feature, CSS, selector or storage-schema changes.
- Read fresh sanitized quota fields before starting and between substantial stages.
  Both consumed percentages must be <70%. Hourly >=70% requires stopping and asking
  for an explicit exception with reset time; weekly >=70% suspends refactor.
  Missing/stale data does not establish available margin. Planning observation:
  Astra, 17% hourly / 47% weekly; this is historical, not execution permission.

Read `implementation-notes.md`, `plan.md`, `test-guide.md` in this directory and
`docs/architecture.md` at project root before implementation. Current baseline is
147 tests, content.js 1,763 lines, mode-controller.js 213 lines. Re-run to verify.

## Decision: smaller than the entire normal/intent controller

Extract countdown, recent-use confirmation and temporary-normal-access lifecycle
first. Do NOT simultaneously move the intent form, authored declarations, awareness
outcome association or overlay markup. Those have separate state and privacy
contracts; moving them together would enlarge the review and quota risk.

New `scripts/normal-mode.js` factory with browser namespace/CommonJS exports, no
import-time DOM access, explicitly loaded before content.js. No extra timer library.

Move orchestration currently in:

- `startNormalDelay` — readiness of the extension confirmation surface, recent-use
  branch, attempt-start callback, countdown scheduling;
- `clearNormalDelay` — timer cancellation plus existing confirmation reset;
- `setNormalTemporarily` — finish attempt, cancel old work, record opening, transition
  to normal, schedule five-minute expiry;
- manual bypass cancellation in the Foco button and Alt+Shift+F handler.

The factory owns the timeout/interval handles, countdown/bypass generations and the
recent-attempt flag needed to choose `recent-explicit` versus `immediate`.
Remove the corresponding timer variables and recent flag from content.js. Do not
retain duplicate authoritative values there. Small delegating wrappers are fine.

## Dependencies and boundaries

Use narrow injected callbacks, not a mutable application context:

- scheduler with set/clearTimeout and set/clearInterval; clock `now`;
- existing constants (8,000 ms barrier, 200 ms display tick, 300,000 ms bypass,
  existing recent-use window);
- readLastNormalOpenedAt, recordNormalOpenedAt;
- attempt-start callback (sets existing attempt timestamp and emits attempt_started),
  finishNormalAttempt, recordAwareness;
- setNormal, setActive, setFocused, isNormalMode;
- chooseExpiryDestination and normalizeChats(callback) bound to existing expiry route;
- cohesive UI hooks for preparation, pending/recent state, warning, countdown text
  and resetting confirmation state. Keep DOM selectors/markup and Portuguese copy
  in content.js for now. Document exact hook signatures after implementation.

Suggested public operations: beginConfirmation, clearConfirmation, openNow,
openTemporarily(route), cancelBypass, dispose, start. Names can be refined, but
ownership and the distinctions below cannot be collapsed.

Intent-related `normalAttemptStartedAt`, `pendingIntent`, `intentPromptStartedAt`,
readIntentDeclaration, finishNormalAttempt and intent handlers remain composition
owned in this slice. The timestamp has no scheduled work of its own. If the old
normalAttemptRecent reset in finishNormalAttempt is replaced, preserve the effective
next-attempt route behavior with a controller-local reset; don't duplicate state.

UI callbacks render; they must not decide whether the delay or bypass should run.
Native expiry policy stays in MirrorFocusState through the existing wrapper.
Storage and awareness sanitization remain unchanged.

## Ordering and compatibility contract

Characterize BEFORE moving production code. Do not repeat the previous cycle's
retrospective-only characterization. The current two VM tests are not enough.

1. No overlay: starting confirmation is a no-op (no attempt, timers or UI writes).
2. Prepare confirmation → clear prior countdown/reset UI → mark pending → read last
   opening and clock → mark attempt started/emit attempt_started → update warning.
3. Recent use uses existing truthiness and strict `< RECENT_NORMAL_OPEN_MS` boundary;
   show `Abrir mesmo assim`, schedule no countdown. Exactly at the window boundary
   follows normal countdown. Do not silently repair future timestamps or zero-time
   truthiness quirks during this extraction; use realistic nonzero fixture epochs.
4. Non-recent: immediately display 8, update every 200 ms using elapsed wall time,
   ceil/max as today, open with route `countdown` at 8,000 ms. Don't count ticks.
5. Explicit open route is `recent-explicit` for the current recent confirmation,
   `immediate` otherwise. Route must be captured before finishNormalAttempt resets
   state. Existing event order: finish attempt/intent outcome → clear confirmation
   → cancel prior bypass → record opening → setNormal → schedule bypass.
6. setNormal in mode-controller invokes clearNormalDelay again. This nested cleanup
   is deliberate: it must NOT cancel the new opening operation or prevent scheduling
   its bypass. Use separate confirmation and bypass generations/internal apply steps.
7. Manual Foco/shortcut retains existing conditional `focus_returned: manual` event,
   cancels bypass, then setActive(true). Don't emit an extra intent outcome from
   cancelBypass or dispose. Keep event listeners where they are.
8. Continue preserves current finish attempt (only when pending), clear delay,
   normalize → active(false) → focused → capture. Normal-cancel retains finish then
   clear. Search and arbitrary mode changes must not gain new attempt telemetry or
   new bypass cancellation policy as an incidental refactor.
9. Expiry: clear owned handle, compute destination at expiry time (not opening),
   record focus_returned with reason expiry and destination, then either blind
   overlay or normalize Chats with route expiry before focused transition. Do not
   add recent capture/search telemetry to expiry.

## Cancellation and lifecycle hazards

- Clearing confirmation cancels BOTH its timeout and interval and rejects queued
  callbacks even if invoked after clear. It does not cancel an unrelated bypass.
- Repeated confirmation supersedes old confirmation. Reopening normal supersedes
  old bypass. Manual bypass cancel, disposal and restart invalidate old expiry and
  its late normalization completion. No timer-handle truthiness assumptions (0 is
  a valid synthetic handle); use explicit absence checks.
- A late expiry normalization must not override a newer explicit mode choice.
  Guard operation generation and check isNormalMode before applying focused expiry.
  This guard only rejects obsolete completion; do not change the ordinary five-minute
  expiry policy or undo native normalization already performed.
- Injected callbacks can reenter cancel/dispose/new requests. Validate ownership
  between effectful callbacks; don't resurrect a cancelled timer after rendering.
  Distinguish intentional nested clearConfirmation from supersession of bypass.
- Dispose clears both timer families, invalidates late work and rejects requests
  until start. Repeated lifecycle calls are safe. Start does not install timers,
  emit events, resume old countdowns or restore previous mode.
- This is local controller lifecycle, not application-wide disposal. Outer listeners,
  observers, intent state, streak tick and native 260/360 ms helper delays remain.

## TDD and integration acceptance

First add/run baseline behavioral characterization using the existing VM bridge;
then move equivalent assertions to the real public factory. Tests must establish
actual behavior, not regex presence or mocks that reimplement the policy.

Required deterministic cases:

- absent overlay; fresh/recent/at-window-boundary opening; exact effect order;
- display at start and 200 ms ticks; no opening at 7,999, one opening at 8,000;
- explicit early open cancels countdown and interval; all three route values;
- clear, supersession and forced cancelled timeout/interval invocation;
- bypass active at 299,999, exactly one expiry at 300,000; reopening resets deadline;
- both expiry destinations, delayed normalization, manual cancel/dispose/restart
  while normalization is pending, newer mode chosen before late completion;
- Foco button AND shortcut: correct manual event count and cancelled bypass;
- real mode-controller + normal factory integration: setNormal's nested confirmation
  cleanup cannot cancel its own bypass, setActive cleanup cancels countdown;
- reentrant UI/event callback cancels or replaces work without revived effects;
- dispose/restart and timer handle 0; no duplicate interval or expiry events;
- unchanged intent association/attempt duration and Continue event order with real
  normal factory wired through existing bridges; no persistence/title telemetry;
- manifest order and pre-body bootstrap. Existing tests must stay equally strong.

Tests using VM extraction of moved functions must migrate to the public factory;
retain bridges only for the still-composed event/intent wiring. Use synthetic data.
No live Chrome inspection is required for this intermediate checkpoint; final DS6
Chrome equivalence remains pending and cannot be inferred from Node tests.

## Files, checks and handback

Expected changes: new scripts/normal-mode.js and tests/normal-mode.test.js;
content.js composition/hooks/delegates; manifest and loader contracts; existing
normal characterization/intent/Continue tests as required; docs/architecture.md,
implementation-notes.md and test-guide.md with actual evidence.

Do not modify mode-controller semantics to hide circular initialization. Construct
both factories before boot, defer cross-controller calls through closures, and keep
constructors inert. A narrow wiring-only change is acceptable; if a new generic mode
notification/event bus seems necessary, stop for Astra rather than expanding scope.

Run full `node --test tests/*.test.js`, syntax-check content.js and scripts/*.js,
parse manifest, run git diff --check. Report commands/results, exact before/after
production LOC separately from tests/docs, ownership still in composition, deviations,
and fresh quota readings. Do not claim checks not run or green remote CI.

Stop uncommitted and unpushed for Astra review. No next extraction. Astra must
inspect nested cleanup, telemetry order, lifecycle reentrancy, expired normalization
and integration tests before commit/backup under the existing limited authorization.
