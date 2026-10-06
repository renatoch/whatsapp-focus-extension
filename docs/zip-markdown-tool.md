# Explicit ZIP → Markdown tool

Navigator approved a standalone extension popup, separate from DS6: select an
exported ZIP, extract its existing chat.md and save using the ZIP basename. Keep
the original ZIP; no deletion or filesystem/download monitoring permissions.

Implementation: action popup export-popup.html/css/js; pure/injected ZIP extractor
zip-markdown.js. No content-script changes and no access to page conversations.
ZIP bytes/Markdown/object URLs exist only in popup memory. URLs are revoked on
replacement or pagehide. Download needs a deliberate Save click; success wording
means requested, not confirmed disk write. No backend, content telemetry, storage
migration or new permissions. Files are not exposed as web-accessible resources.

Extraction checks central/local header identity, compression flags, single match,
CRC32, exact output length, entry count and size caps. It supports stored/Deflate,
including data-descriptor ZIPs, and rejects encrypted, multi-disk and ZIP64 formats.
Streaming native DecompressionStream bounds inflated output before aggregation.
No private samples are in tests. Filename cleanup prevents path/illegal-character
output; Chrome may further normalize names or add a suffix on existing files.

Live Chrome acceptance remains pending: reload extension, click its toolbar action,
choose real ZIP, Save Markdown, verify basename/content and original preservation.
Try a second file and an invalid ZIP; errors should expose no message content.
User reports native Web exporter; implementation does not depend on verifying or
modifying that exporter. Normal focus UI and DS6 remain separate.

Main receives this explicitly authorized feature; DS6 has not been synchronized
with it yet. Reconcile independent popup files/manifest deliberately before eventual
DS6 merge; do not drop either branch's load-order changes.
