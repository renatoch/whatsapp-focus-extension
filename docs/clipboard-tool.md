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

Chrome acceptance pending: reload extension/accept new permissions if Chrome asks;
copy provided-format synthetic or real text, open popup, click Adjust, paste into a
local editor; verify Eu/Pessoa N and continuations. Repeat with Remove date/time on
and a quoted author. Verify arbitrary non-chat text is refused. Do not share real
messages for debugging. Existing ZIP action should still work.

DS6 synchronization remains deliberate future work; feature lives on main.
