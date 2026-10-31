# Login/linking surface protection

## State

Implemented on main after Navigator authorization. Fresh unlinked Chrome profile
setup was separately approved. Existing regular and linked debug profiles were
not reused, copied, logged out, unlinked or removed. No DS6 work or release.
The fresh unlinked browser was closed gracefully after probes; port 9222 verified
closed. The new profile was not deleted or linked.

223/223 Node tests pass; JS syntax, manifest/load-order and diff checks pass.
Initial QR/phone-entry behavior and protective transitions were checked in Chrome
using the actual manifest JS sources + CSS in a CDP isolated world. This is not an
installed-extension acceptance test or an actual account-linking handshake.

## Observed native evidence

A fresh logged-out session exposed visible `[data-testid="link-device-qr-code"]`,
with no #side or #main. The phone-link action (generic native UI control) exposed
`[data-testid="link-device-phone-number-entry-screen"]`, again without #side/#main.
No number was entered. No QR payload, image, code, token, names, messages, HTML or
input values were read/exported. Collected evidence is limited to marker names,
visibility/presence booleans and extension computed display state.

These are the only accepted native login markers. Absence of #side by itself,
translated text, timers and arbitrary loading screens never grant an exemption.
Later number/code screens were not exercised and have no invented selectors;
unrecognized stages remain protected until independently evidenced.

## Architecture and safeguards

- `auth-surface.js` owns an independent observer and ephemeral boolean. It checks
  the evidenced visible markers and rejects auth exemption whenever #side or #main
  exists, even when our own blind CSS makes the authenticated node invisible.
- `resetForAuthTransition` invalidates obsolete recent navigation and calls the
  existing `setActive({showOverlay:true})` on both entry and exit. This cancels old
  expiry/continuation, countdown and capture work; it never resumes a prior bypass.
- Blind root state remains set UNDER the login exemption. A proof-scoped CSS rule
  hides only extension-owned UI and restores body scrolling while the auth class,
  a known marker and absence of #side/#main all agree. Removing the marker or adding
  authenticated DOM makes the overlay visible before the JS observer callback.
- Observation starts before asynchronous collection/storage initialization.
  Watching class/style/hidden handles native visibility-only transitions. This
  observer calls ONLY auth refresh, not general native/UI inspection; identical
  states do not write classes, avoiding another root-class feedback loop.
- Mode shortcuts are ignored during recognized login. No new storage, logging,
  awareness fields, permission, network API or clipboard use.
- Status/channel policy and document.hasFocus() expiry policy remain unchanged.

## Executed checks

Node coverage: QR/phone proof, hidden/absent markers, stale login + authenticated
DOM, unknown loading, direct authenticated transition, bypass cancellation via the
actual composition callback, stale navigation invalidation, stable observer,
single start/disposal/reentrancy, fresh loading reset, CSS guards/load order and
login shortcut suppression. Existing full suite remains green.

Chrome/156 fresh-profile source-composition probes:

| State | Auth exemption | Blind root | Overlay display |
| --- | --- | --- | --- |
| Native phone entry | true | true | none |
| Phone marker temporarily hidden (unknown loading simulation) | false | true | flex |
| Marker restored | true | true | none |
| Synthetic #side inserted, before JS observer | true | true | flex |
| Same synthetic #side, after observer | false | true | flex |
| Reload to native QR, reinject current manifest sources | true | true | none |

QR and phone entry both had zero visible extension-owned UI nodes. Event-loop
response was checked after startup. Native style changes were restored, synthetic
#side removed, and the browser reloaded between source-injection runs; no native
account state was changed. Full authenticated linking was not tested, deliberately.

## User route and remaining acceptance

Reload extension and WhatsApp tab once for the added script/manifest. On an already
linked tab, blind startup and normal focus behavior must remain unchanged. At the
next naturally needed linking, QR/observed phone-entry should be usable without
disabling the extension. Do not log out a working account solely to validate this.
Installed-runtime confirmation and actual login completion remain pending.
