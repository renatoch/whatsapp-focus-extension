# Local browser investigation (Windows Chrome)

Use a dedicated Chrome profile for DOM/event investigation; never copy the real
profile, cookies or credentials. This setup does not resume DS6 or authorize
release/merge/deployment.

## Start

Run `tools/start-debug-browser.ps1` in Windows PowerShell. It opens Chrome's
extensions page using `%LOCALAPPDATA%\MirrorWhatsAppFocusDebug`, enables CDP on
port 9222, and verifies that the listener is loopback-only. It refuses to reuse
an occupied port. Do not add wildcard origins, remote network bindings, firewall
exceptions or tunnels. No machine-wide execution-policy change is needed.

In the separate browser window:

1. On `chrome://extensions`, enable Developer mode and choose **Load unpacked**.
2. Select the stable extension folder:
   `E:\renato\mirror\focus-lab\whatsapp-focus-extension`.
   Do not select the `whatsapp-focus-extension-ds6` worktree.
3. Open `https://web.whatsapp.com` and link it via WhatsApp's Linked devices / QR
   workflow. This is a separate linked session; Google/Chrome sign-in is not needed.
4. Let the assistant know the window is ready. For the current investigation,
   navigate to Archived and leave the problematic row available. No screenshots
   of QR codes, credentials, names, message previews or conversation contents are
   required.

## Scope and limitations

CDP grants broad access to this profile; loopback is not an authentication
boundary against other local processes. Only keep this profile/session available
while investigating. The agent must limit evaluations to reviewed structural
counts, selector provenance and equality booleans. Do not export raw HTML,
conversation titles, message content, phone numbers, JIDs, cookies or screenshots
of private content. No message sending or account changes are authorized by this
setup. Opening conversations can mark messages read; any active reproduction
beyond inspecting the user-selected state should be agreed explicitly.

A separate profile may behave differently from the normal installation. If the
fault cannot be reproduced there, do not claim the original instance is fixed.
The normal Chrome profile and installed stable extension remain untouched.

## Stop

Close all windows belonging to this dedicated profile. Verify port 9222 is no
longer listening. If desired, unlink this test session under WhatsApp Linked
devices. The profile retains its login between investigations; do not back it up,
commit it or copy it into the repository. Removing the profile is optional and
must be explicit, with this Chrome instance fully closed.

## Current investigation

Intermittent session-recents capture appears correlated with Archived. Captures
using `frameChildTitle` have succeeded, while reported failures used `frameTitle`.
Latest pointer evidence showed the same row and equal extracted titles between
mousedown and click, so that event-window mutation did not occur in that example.
The title still failed to match the header across six observations; broadening
matching or timing remains unsupported. Compare the real title structure inside
and outside Archived before changing extraction policy.
