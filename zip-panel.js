// Best-effort chooser on entry. Some Chrome versions require the explicit file-input click.
// The visible file input remains available; this screen never reads the clipboard.
try { document.getElementById('archive').click(); } catch (_) { /* User can select the ZIP explicitly. */ }
