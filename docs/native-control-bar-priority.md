# Native transient surfaces: side control bar

## Status drawer follow-up

Navigator accepted the player fix, then reported focused search/add/shelf overlapping
Status list. Dedicated structural inspection confirmed visible `status-drawer` and
`status-list-drawer`, without dialog/media-player markers. Add only the observed
visible `status-drawer` surface to detection; status thumbnails alone do not suspend.
No row text/names/media was read or clicked. Existing transient policy temporarily
hides shelf, search, add, chooser and side controls without clearing expansion/state.

A temporary class toggle in the selected live drawer verified all four present
surfaces (search, add, recents shelf, side controls) computed display none while
suspended, and restored prior displays after the original root state was restored.
Tests: 151/151, syntax/diff checks passed. This is structural/CSS evidence, not
acceptance of the reloaded script. Reload extension + tab; click Status icon (without
opening unseen statuses), verify clean drawer, then Chats: focused surfaces return.
Chrome manual acceptance of drawer fix remains pending. The prior player correction
is user-accepted. DS6 synchronization is still pending deliberate reconciliation.

## Earlier investigation

Navigator reported Foco/Lateral/Ajustar cópia overlapping WhatsApp Status.
Inspection found a concrete CSS omission: mwf-native-transient-open suppressed
shelf/search/add/chooser and the individual clipboard control, but not the whole
side controls container. The fix hides mirror-whatsapp-focus-controls under that
existing root class; the later !important rule wins over ordinary display:flex.
Closing the surface restores controls without mode changes or lost UI state.

Follow-up live structural inspection in the dedicated loopback debug profile confirmed
Status has no visible native dialog/aria-modal/media-viewer marker; the transient
root class was false while controls displayed flex. A visible structural marker
`[data-testid="status-player-contact-name"]` was observed in the player, without
reading its text. Add that marker to the existing visibility/exclusion detector.
Thumbnail-only Status elements must not suspend controls. The selector reads no
name or message. Native dialog/media behavior is otherwise unchanged.

A temporary root-class toggle in the selected live Status verified CSS suppression:
controls display none with mwf-native-transient-open, flex when removed; original
root state was restored. This verifies the structural marker + CSS seam, not live
acceptance of the reloaded content script. Tests: 150/150, syntax/diff checks passed.
Navigator should reload extension and WhatsApp tab, reopen an already-viewed Status
and verify hide/restore. No screenshots/content export or native clicks occurred.

Validation: reload or allow existing development CSS refresh, open a Status chosen
by Navigator, verify the whole side control bar disappears and returns on closing.
If still present, investigate structural selector/count evidence in the dedicated
debug profile. Do not open unseen statuses, export names/messages/media, copy normal
Chrome profile or claim fix of Status detection without evidence. See
local-browser-debugging.md. The original CSS-only fix did not establish Status detection; the later observed
player-marker addition addresses that separate gap. Reloaded user acceptance is
still pending. DS6 synchronization remains future deliberate work.
