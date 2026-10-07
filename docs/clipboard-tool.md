# Clipboard conversation labels

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
network. Permission additions are clipboardRead and clipboardWrite; neither is
used by content.js or ZIP extraction. No background polling or listeners on copy.

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
