# Next activity — do not cover WhatsApp login/linking

Navigator requested this immediately after resolving the Status/channel expiry
regression: the dedicated browser had the extension disabled because Focus covered
its logged-out linking screen. Existing product backlog already contains this item.

Desired behavior: when an evidenced native login/QR/linking surface is visible,
hide extension overlay/controls so linking is usable. Do not remove blind protection
from authenticated loading/session content or infer authentication from a timer.
When login gives way to authenticated UI, retain/reapply blind entry before showing
private content. Cancel obsolete normal-mode continuations on authentication loss.

No permission to log out/unlink the real or dedicated linked account, remove/copy
profiles, capture QR, scan account data or weaken startup globally. Investigate an
isolated logged-out session without disturbing the existing linked profile; agree
any new dedicated session setup before performing it. Collect only structural
marker/visibility evidence, not QR data, names, tokens or snapshots. No auth
selectors have been validated yet; do not guess them from text/localization.

Tests to prepare: logged-out QR/linking screen (overlay absent); authenticated
loading with no #side yet (blind protection stays); login→loading→ready transition;
auth loss during bypass; restoration of normal blind entry after reload. Use fake
DOM/clock fixtures, then one short manual route. This plan is queued, not implemented;
finish the current channel regression and settle any focus-policy ambiguity first.
