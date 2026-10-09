# Native transient surfaces: side control bar

Navigator reported Foco/Lateral/Ajustar cópia overlapping WhatsApp Status.
Inspection found a concrete CSS omission: mwf-native-transient-open suppressed
shelf/search/add/chooser and the individual clipboard control, but not the whole
side controls container. The fix hides mirror-whatsapp-focus-controls under that
existing root class; the later !important rule wins over ordinary display:flex.
Closing the surface restores controls without mode changes or lost UI state.

Status-specific detection is NOT yet confirmed live. Current detection recognizes
visible native role=dialog + aria-modal=true or media-viewer-modal only, excluding
extension-owned controls. No speculative Status selectors were added.

Validation: reload or allow existing development CSS refresh, open a Status chosen
by Navigator, verify the whole side control bar disappears and returns on closing.
If still present, investigate structural selector/count evidence in the dedicated
debug profile. Do not open unseen statuses, export names/messages/media, copy normal
Chrome profile or claim fix of Status detection without evidence. See
local-browser-debugging.md. The CSS omission fix does not establish that Status
matches either existing selector. DS6 synchronization remains future deliberate work.
