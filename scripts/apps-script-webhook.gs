/**
 * «Мерей» — Қыз ұзату тойы — RSVP Google Sheets webhook.
 *
 * One-time setup (see README → "RSVP via Google Sheets"):
 *   1. Open script.google.com → New project → paste this entire file.
 *   2. Deploy → New deployment → type "Web app":
 *      - Execute as: Me
 *      - Who has access: Anyone (the wedding site is public; this only appends a row)
 *   3. Copy the deployed web app URL into Vercel → Project → Settings → Environment Variables
 *      as GOOGLE_SHEETS_WEBHOOK_URL.
 *   4. Redeploy the site.
 *
 * The site forwards validated submissions here as JSON:
 *   { type: 'rsvp', name, guests, coming, createdAt }
 */
var SPREADSHEET_ID = '1_WZrS0wo9eLDySO_HqIEn1l2uQ3q0oAuXx11ozvtZew';
var SHEET_NAME = 'Қонақтар';

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var name = String(payload.name || '').slice(0, 120);
    var guests = Number(payload.guests) || 1;
    var coming = payload.coming === 'yes' ? 'Әрине, келемін!' : 'Өкінішке орай, келе алмаймын.';
    if (!name) throw new Error('missing name');

    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(SHEET_NAME);
    }
    sheet.appendRow([name, guests, coming, new Date()]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'merey-rsvp' })).setMimeType(ContentService.MimeType.JSON);
}
