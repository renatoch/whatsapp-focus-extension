# Native transient surfaces: side control bar

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
