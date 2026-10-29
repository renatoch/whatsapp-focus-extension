# Clipboard conversation labels

## Current fast-path UI

Navigator rejected review as mandatory friction and explicitly authorized the
Explorer proposal: side Ajustar cópia opens a compact menu, not a window. Actions:
Trocar nomes; Trocar nomes e tirar datas; Tirar datas; Revisar texto…; ZIP → Markdown…. Dates-only was subsequently requested explicitly: remove only recognized line-start
[time, date] prefixes and separator whitespace, never authors/self/quotes/body text.
The removeNames=false flag bypasses the name-mapping and single-person label omission
entirely. This also handles previously label-stripped timestamped excerpts. Both flags
are validated booleans at worker/offscreen boundaries; no new permission or payload.
The offscreen quick path previously received provisional user confirmation (“Agora
parece que foi”); dates-only still awaits manual Chrome confirmation.
The three quick actions now dispatch action metadata to the background worker, which creates
an internal offscreen document (CLIPBOARD reason) for read/transform/write. Only
trusted clicks dispatch; no content preview, confirmation, text message, telemetry
or persistence. Unknown format does not write. User reported the previous direct
content-script read failed while extension-window review worked; exact browser
exception was not collected. This change removes dependency on page clipboard
policy/focus rather than claiming a specific exception was proven.

New explicit offscreen permission accompanies existing clipboardRead/Write. The
invisible document uses execCommand paste/copy in its own textarea: Async Clipboard
focus requirements are unsuitable for an offscreen document. Field is wiped/removed
in finally; background attempts closeDocument after every owned operation. If close
fails, the remaining empty internal document does not poll/read anything. Clipboard
payload/maps never traverse runtime messages or worker; only action and bounded
success/error enums do. Worker validates same-extension WhatsApp tab senders,
serializes requests across tabs, and checks ownership before reusing/closing an
existing document. Offscreen receiver rejects tab senders; no page-accessible
resources. Permission/focus/platform restrictions remain a manual Chrome check.
Errors distinguish read, format, oversize, write, busy and internal unavailable.

Review remains an internal extension window; all actions are sticky above previews.
ZIP opens its own private window without clipboard scripts. A native chooser click
is attempted on entry, but Chrome may require clicking the visible file input;
there is no hidden broad filesystem access. No additional web-accessible resource; the offscreen correction adds the named
permission described above. Background receives only route metadata, restricted to existing WhatsApp
content-script sender. The old toolbar conversion popup has been removed at Navigator request; the Chrome
icon now opens a static information/shortcut reference (including Alt+Shift+T test
duration). Copy tools remain in the side menu. clipboard-popup.js and its obsolete
UI tests were removed; ZIP controllers and offscreen pipeline remain tested.

Generated Eu/Pessoa N labels are preserved on repeat names adjustment when source
still has recognizable author headers. Date-less or label-less unsupported text is
refused, not treated as a new implicit format. Pseudonymization still only changes
recognized author/quote labels, never all body identifiers.

Validation: offscreen integration tests cover action/result-only routing,
temporary-field wipe, document closure, ownership, concurrent requests, denied paste,
failed copy, invalid format, oversize and document-creation failures. No real clipboard
or private content is used by tests. User must reload extension/tab and test both
fast paths; if Chrome asks, approve the new offscreen permission. Review stays
unchanged. Native execCommand behavior has not been live-validated by these mocks.

Menu tests cover trusted click gate, quick actions, no window
on fast path, no writes on malformed/failed reads, failure/success feedback, duplicate
submissions, disposal and routing. Chrome acceptance is pending: reload extension
and tab; copy synthetic example; choose names then paste; repeat names+dates; verify
review actions visible without scrolling and ZIP has no clipboard side effects.
Builder runtime load failed with provider HTTP 429 during conversation extraction;
no runtime lifecycle completion was claimed. Navigator's explicit Builder+implement
authority was used for local code work only. DS6 was not resumed or modified.

## Earlier design history (superseded by current fast path)

Navigator supplied the exact copy format `[HH:MM, DD/MM/YYYY] Name: Text` and
requested Renato C → Eu, distinct other labels → Pessoa N, consistent quotes, and
an option to remove date/time. This is a separate popup action, not background
capture and not an extension of DS6.

Pure clipboard-conversation.js owns a per-call map, exact trimmed NFC label matching
(case-sensitive), author/quote replacements, optional timestamp removal. Blank
lines, continuation lines and other message text are untouched. Unsupported formats
are refused rather than silently returning private text as successfully transformed.
A quote uses `> Name:` or `> _Name:`. Labels first seen in quotes receive a number
shared by later author headers. Identical labels cannot identify distinct humans.

clipboard-popup.js reads only after Adjust click, disables duplicate submissions,
processes <=4 Mi characters locally, writes only after successful transform and
reports success only after writeText resolves. Failures do not display clipboard
content. Checkbox defaults off. No console, telemetry, storage, DOM chat access or
network. Permission additions are clipboardRead and clipboardWrite; ZIP extraction does
not use them. The later fast path also uses them via isolated content-script code. No background polling or listeners on copy.

Privacy caveat: only author/quote labels are pseudonymized. Names/phones/links/body
references remain. Original clipboard text is overwritten, not backed up; user can
copy again from origin. An OS clipboard manager may independently retain history.
ZIP keeps its own separate Pessoa N mapping; Renato C → Eu is clipboard-only.

User accepted the original quick popup action (“Funcionou”). A new review panel
is accessible by an Ajustar texto copiado button in the focus overlay. background.js
opens a focused extension-owned popup window only for messages from a same-extension
WhatsApp tab; no clipboard content is transferred through runtime messages.
The panel is NOT web-accessible or embedded in the WhatsApp DOM. Opening reads once
when focused, with an explicit reread button if permissions/focus prevent it. Two
readonly scrollable textareas show original and transformed text. Checkbox updates
preview without clipboard writes. Replace is the sole write action; duplicate writes
are blocked while pending. Closing clears preview state and invalidates old read
completions; it cannot retract an OS clipboard write already in progress. No history,
network, logging, persistence or automatic clipboard monitoring. No new permission
beyond those already granted for the quick popup. Original-format assumptions and
pseudonymization caveats remain unchanged.

Review-panel Chrome acceptance pending: reload extension and WhatsApp tab; open
Modo foco → Ajustar texto copiado; check both previews, checkbox, reread after copying
another selection, then Replace and paste once for verification. Close and reopen:
old previews must not persist. Ensure original clipboard remains unchanged until
Replace. If initial auto-read fails, focus the window and click reread.

Original quick-popup route: reload extension/accept new permissions if Chrome asks;
copy provided-format synthetic or real text, open popup, click Adjust, paste into a
local editor; verify Eu/Pessoa N and continuations. Repeat with Remove date/time on
and a quoted author. Verify arbitrary non-chat text is refused. Do not share real
messages for debugging. Existing ZIP action should still work.

Follow-up Navigator requested single-participant label omission and easier access.
Recognized author and quote labels are collected before rewriting; only when that
union has one identity are Eu/Pessoa N labels omitted (including their colon/spacing).
Body mentions remain out of scope. Markdown ZIP transform follows the same rule.
A new vertical Texto button in the Foco/Lateral controls opens the same private
extension window without a mode transition, search or awareness event. It is hidden
with the controls under focus overlay (where original action remains) and suppressed
under native transient modal/media surfaces. Single-person behavior and side-button
Chrome acceptance pending. No new permission or clipboard-background monitoring.

Latest UI correction: side button is Ajustar cópia (not Texto). Focus-overlay
button/action was removed at Navigator request. The same private panel now includes
an expandable ZIP → Markdown section, reusing ZIP extraction/pseudonymization and
explicit Save click. ZIP status has its own DOM ID; it cannot overwrite clipboard
preview/status. ZIP file processing and clipboard writes remain independent. The
extension-toolbar popup also remains available. Verify side label and both tools
in Chrome; prior side-button/panel acceptance was not reported as complete.

DS6 synchronization remains deliberate future work; feature lives on main.
