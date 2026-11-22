# «Мерей» — Қыз ұзату тойы

Мерейдің қыз ұзату тойы — қазақтың дәстүрлі сән-салтанатымен безендірілген, терең қоңыр, алтын және айқын ақ түсті қазақ шақыру сайты.

A luxurious Kazakh *Kyz Uzatu* (daughter-giving) wedding invitation website — deep burgundy, antique gold, cream — with a real RSVP backend.

## Quick start

```bash
npm install        # fonts (self-hosted, copied into public/assets/fonts)
npm start          # → http://localhost:3000
npm test           # backend smoke tests (RSVP validation, headers, static)
```

No build step. Node.js ≥ 20 only (zero runtime dependencies).

## Sections

Hero → invitation («Құрметті қонақтар!») → music player (Алтынай Жорабаева — «Қызыма тілек») → event details (Өмірзақ – Алия, 12 желтоқсан 2026, 19:00) → December 2026 calendar (12 highlighted) → location (Жетісай қаласы «Мұрагер» тойханасы + Google Maps) → live countdown → «Анкета» RSVP form → photo gallery carousel → closing message.

## Music

Music starts **only after the visitor presses play** (no autoplay). Until the licensed MP3 is added, the player shows a polite note instead of failing.

To add the track:

1. Copy the MP3 (licensed) into `public/assets/audio/`
2. Name it `qyzima-tilek.mp3`
3. Restart the server (or just refresh — the file is served from `/assets/audio/`)

## RSVP backend

`POST /api/rsvp` persists every accepted submission to `data/rsvps.jsonl` (JSON Lines, append-only) with a basic in-memory rate limit (6 requests/min/IP) and validation:

- `name` — 2–80 chars
- `guests` — integer 1–30
- `coming` — `'yes'` | `'no'`

Success is only shown after the server confirms. Errors surface the server message in Kazakh.

### Optional Google Sheets integration

If you deploy this with an **Google Apps Script web app**, point the server at it:

```bash
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec npm start
```

Every accepted submission is then forwarded there (fire-and-forget, non-blocking). The site works fully without it.

## Google Maps

The location section links to Google Maps (`?api=1&query=Жетісай қаласы «Мұрагер» тойханасы`) — a working button that opens Maps on the user's device.

## Structure

```
server.mjs             node:http server — static files + /api/rsvp + security headers
public/
  index.html           single-page site (semantic, mobile-first)
  assets/css/styles.css  design system (CSS vars: burgundy / wine / gold / cream)
  assets/js/script.js    player, calendar, countdown, RSVP, gallery, reveal animations
  assets/fonts.css      self-hosted fonts (Bad Script, Cormorant Garamond, Inter)
  assets/fonts/         woff2 (with cyrillic + cyrillic-ext subsets for Kazakh)
  assets/images/        processed authentic Kazakh photography
  assets/audio/         <- drop the licensed MP3 here
tests/server.test.mjs   backend smoke tests
```

Fonts: Bad Script (calligraphy headings), Cormorant Garamond (elegant serif info), Inter (clean readable body). All cover Kazakh Cyrillic letters (Ә, Ғ, Қ, Ң, Ө, Ү, Ұ, …).

## Deployment

Any Node.js host works (Render, Railway, Fly, VPS…): run `npm start`, expose the port. The site is fully self-contained (fonts and images are self-hosted) and needs no external services. Google Fonts is not used.
