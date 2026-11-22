# «Мерей» — Қыз ұзату тойы

Мерейдің қыз ұзату тойы — қазақтың дәстүрлі сән-салтанатымен безендірілген, терең қоңыр, алтын және айқын ақ түсті қазақ шақыру сайты.

A luxurious Kazakh *Kyz Uzatu* (daughter-giving) wedding invitation website — deep burgundy, antique gold, cream — with a real RSVP backend.

## Quick start

```bash
npm start          # → http://localhost:3000
npm test           # backend smoke tests (RSVP validation, headers, static)
```

Zero dependencies — no build step, no install. Fonts, images and the audio track slot are self-hosted and committed in `public/`. Node.js ≥ 20 only.

## Sections

Hero → invitation («Құрметті қонақтар!») → music player (Алтынай Жорабаева — «Қызыма тілек») → event details (Өмірзақ – Алия, 12 желтоқсан 2026, 19:00) → December 2026 calendar (12 highlighted) → location (Жетісай қаласы «Мұрагер» тойханасы + Google Maps) → live countdown → «Анкета» RSVP form → photo gallery carousel → closing message.

## Music

Music starts **only after the visitor presses play** (no autoplay). Until the licensed MP3 is added, the player shows a polite note instead of failing.

To add the track:

1. Copy the MP3 (licensed) into `public/assets/audio/`
2. Name it `qyzima-tilek.mp3`
3. Restart the server (or just refresh — the file is served from `/assets/audio/`)

## RSVP backend

`POST /api/rsvp` validates every submission (name 2–80 chars, guests 1–30, coming=`yes|no`) and persists it — success is only shown after the server confirms. Errors surface the server message in Kazakh.

**Local development** (`npm start`) writes submissions to `data/rsvps.jsonl` (JSON Lines, append-only).

**Production (Vercel)** forwards every accepted submission to a **Google Sheets Apps Script webhook** (see below). The dataset lives in your spreadsheet, not in the read-only Vercel filesystem. If the webhook env var is not set, `POST /api/rsvp` honestly answers `503` instead of silently dropping the submission.

### RSVP via Google Sheets

A spreadsheet is already created for this project:

- **Sheet**: `Мерей — Қыз ұзату тойы (RSVP)` — open [this link](https://docs.google.com/spreadsheets/d/1_WZrS0wo9eLDySO_HqIEn1l2uQ3q0oAuXx11ozvtZew/edit)
- **Tab**: `Қонақтар` — headers: Аты-жөні · Қонақтар саны · Келеді? · Жауап берген уақыт
- **Webhook code**: [`scripts/apps-script-webhook.gs`](scripts/apps-script-webhook.gs) (already contains this spreadsheet's ID)

Set it up once:

1. Open [script.google.com](https://script.google.com) → new project → paste the entire contents of `scripts/apps-script-webhook.gs`
2. Deploy → New deployment → type **Web app** → Execute as **Me** → Access **Anyone** (the sheet is for the wedding guest list; the webhook only appends a row)
3. Copy the web app URL
4. In Vercel → Project → Settings → Environment Variables: add `GOOGLE_SHEETS_WEBHOOK_URL` with that URL → redeploy

The site now writes every accepted RSVP into the `Қонақтар` sheet. That's the only manual step — everything else is wired and tested.

## Google Maps

The location section links to Google Maps (`?api=1&query=Жетісай қаласы «Мұрагер» тойханасы`) — a working button that opens Maps on the user's device.

## Structure

```
server.mjs             local dev server (node:http) — serves public/ + POST /api/rsvp
api/
  core.mjs             shared RSVP logic: validation, rate limit, persistence/webhook
  rsvp.js              Vercel serverless function (POST /api/rsvp)
public/
  index.html           single-page site (semantic, mobile-first)
  assets/css/styles.css  design system (CSS vars: burgundy / wine / gold / cream)
  assets/js/script.js    player, calendar, countdown, RSVP, gallery, reveal animations
  assets/fonts.css      self-hosted fonts (Bad Script, Cormorant Garamond, Inter)
  assets/fonts/         woff2 (with cyrillic + cyrillic-ext subsets for Kazakh)
  assets/images/        processed authentic Kazakh photography
  assets/audio/         <- drop the licensed MP3 here
scripts/apps-script-webhook.gs
                        Google Apps Script that appends RSVP rows to the sheet
tests/server.test.mjs   backend smoke tests
vercel.json           Vercel config: static public/ + security/caching headers
```

Fonts: Bad Script (calligraphy headings), Cormorant Garamond (elegant serif info), Inter (clean readable body). All cover Kazakh Cyrillic letters (Ә, Ғ, Қ, Ң, Ө, Ү, Ұ, …).

## Deploying on Vercel

The repo is Vercel-ready out of the box:

- Vercel serves `public/` as the static site (`vercel.json` pins `framework: null` + `outputDirectory: "public"` + the security headers and long-cache headers for `/assets/*`)
- `api/rsvp.js` is auto-detected as the `/api/rsvp` serverless function (local dev uses the same logic via `server.mjs`)
- A production deploy requires the site to live on the branch Vercel deploys (the default production branch). Vercel serves `main` for production by default — the 404 you saw is the production `main` branch, which (before this change) contained only the initial README.

Local development still works as before: `npm start` serves the site at `http://localhost:3000`.

## Deployment

Any Node.js host works for local serving (Render, Railway, Fly, VPS…): run `npm start`. On Vercel, deploy from GitHub — the repository auto-deploys on push, serving `public/` + the `/api/rsvp` function.
