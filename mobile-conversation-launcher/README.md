# Mobile Conversation Launcher

Prototype PWA/static page for opening WhatsApp mobile directly in an intended conversation, without entering through the WhatsApp home/list.

This is a separate experiment inside the WhatsApp Focus journey. It does not change the Chrome extension.

## What it tests

Can a small local-first launcher reduce WhatsApp mobile distraction by making the entry point a searched/favorited contact instead of the default WhatsApp app surface?

## How to try locally

1. Edit contacts in the UI, or import a JSON list. See `contacts.example.json` for the format.
2. Open `index.html` in a browser, or serve this folder locally.
3. Search a contact and tap **Abrir no WhatsApp**.

The app opens links like:

```text
https://wa.me/5511999999999
```

On Android, this should open WhatsApp directly in that conversation when the number is valid and available on WhatsApp.

## PWA mode

To install as an app-like launcher, the page must be served from a secure origin (`https://`) or localhost. Options:

- temporary local test: serve from a computer and open from the phone on the same network;
- later: private/static hosting if privacy trade-offs are acceptable;
- later: package as a tiny Android app/WebView if hosting is undesirable.

## Standalone file for Android file managers

If serving over Wi-Fi is blocked, generate a single HTML file with CSS and JavaScript embedded:

```bash
./scripts/build-mobile-standalone.py
```

Output:

```text
releases/mobile-conversation-launcher-standalone.html
```

Copy/open that file on Android. This is not PWA-installable, but it should avoid `content://` path issues with separate CSS/JS files.

## Privacy notes

Contacts are stored only in the browser `localStorage` of the device/browser that opens this page. There is no backend and no network request except when opening WhatsApp links.

Still, a curated list of names/phones is sensitive. For safer testing:

- use nicknames instead of full names;
- keep only a few focus contacts;
- do not host publicly with real contacts in source files;
- prefer importing contacts manually on-device rather than committing them.

## JSON import format

```json
[
  {
    "name": "Pessoa Exemplo",
    "phone": "5511999999999",
    "tags": ["trabalho"],
    "favorite": true
  }
]
```

Phone numbers should include country code and digits only if possible. The UI normalizes common punctuation before creating the WhatsApp link.
