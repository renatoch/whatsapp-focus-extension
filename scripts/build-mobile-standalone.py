#!/usr/bin/env python3
"""Build a single-file mobile conversation launcher for file-manager testing."""

from __future__ import annotations

import re
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "mobile-conversation-launcher"
OUTPUT = ROOT / "releases" / "mobile-conversation-launcher-standalone.html"


def main() -> None:
    html = (SOURCE / "index.html").read_text()
    css = (SOURCE / "styles.css").read_text()
    js = (SOURCE / "app.js").read_text()
    svg = (SOURCE / "icon.svg").read_text()

    icon_uri = "data:image/svg+xml," + urllib.parse.quote(svg)
    html = re.sub(r'<link rel="manifest" href="manifest\.webmanifest">\n\s*', "", html)
    html = html.replace(
        '<link rel="icon" href="icon.svg" type="image/svg+xml">',
        f'<link rel="icon" href="{icon_uri}" type="image/svg+xml">',
    )
    html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")
    html = html.replace('  <script src="app.js" defer></script>', f"  <script>\n{js}\n  </script>")
    html = html.replace(
        "if ('serviceWorker' in navigator && location.protocol !== 'file:') {\n"
        "  navigator.serviceWorker.register('./service-worker.js').catch(() => {});\n"
        "}\n\n"
        "render();",
        "// Standalone build: service worker disabled intentionally.\n\nrender();",
    )
    html = "<!-- Standalone build generated from mobile-conversation-launcher/. Do not edit manually. -->\n" + html

    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(html)
    print(OUTPUT)


if __name__ == "__main__":
    main()
