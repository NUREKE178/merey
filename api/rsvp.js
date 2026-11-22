/**
 * Vercel serverless function: POST /api/rsvp
 * Validates the submission, forwards it to the Google Sheets webhook
 * (GOOGLE_SHEETS_WEBHOOK_URL) so the guest list lives in the sheet.
 * Local development: server.mjs runs the same logic (JSON Lines fallback).
 */
import { rateLimited, validateRsvp, buildEntry, readJsonBody, persistSubmission } from './core.mjs';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    if (rateLimited(ip)) {
      return res.status(429).json({ ok: false, error: 'Ықшамдап жатыр. Қайталап көріңіз.' });
    }
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }
    let body;
    try { body = await readJsonBody(req); } catch {
      return res.status(400).json({ ok: false, error: 'Мүмкіндіктер дұрыс емес.' });
    }
    const result = validateRsvp(body);
    if (!result.ok) {
      return res.status(400).json({ ok: false, error: result.error, field: result.field });
    }
    const entry = buildEntry(result.data);
    try {
      await persistSubmission(entry);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('RSVP persist failed:', err);
      if (err?.message === 'sheets_unconfigured') {
        return res.status(503).json({
          ok: false,
          error: 'Жауапты сақтау үшін GOOGLE_SHEETS_WEBHOOK_URL орнатылуы керек (қойынды → Vercel қоршауы).',
        });
      }
      return res.status(503).json({ ok: false, error: 'Жүйе сақтау жүйесімен қосыла алмады. Қайталап көріңіз.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}
