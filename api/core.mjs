/**
 * «Мерей» — shared RSVP logic (Vercel serverless + local Node server).
 * Validates submissions, persists locally (JSON Lines) or forwards to a
 * Google Sheets Apps Script webhook (production).
 */
import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const RATE_LIMIT = 6;
export const RATE_WINDOW_MS = 60_000;

const rateBuckets = new Map();
export function rateLimited(ip, max = RATE_LIMIT, windowMs = RATE_WINDOW_MS) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || { start: now, count: 0 };
  if (now - bucket.start > windowMs) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  return bucket.count > max;
}

export function sanitizeText(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\x00-\x1f\x7f<>&"']/g, '').trim().slice(0, maxLen);
}

export function validateRsvp(body) {
  const name = sanitizeText(body?.name, 80);
  const guests = Number(body?.guests);
  const coming = body?.coming;
  if (name.length < 2) return { ok: false, error: 'Қонақтың аты-жөнін дұрыс көрсетіңіз (кемінде 2 таңба).', field: 'name' };
  if (!Number.isInteger(guests) || guests < 1 || guests > 30) return { ok: false, error: 'Қонақтар саны 1-ден 30-ға дейін болуы керек.', field: 'guests' };
  if (coming !== 'yes' && coming !== 'no') return { ok: false, error: 'Тойға келу туралы жауабыңызды көрсетіңіз.', field: 'coming' };
  return { ok: true, data: { name, guests, coming } };
}

export function buildEntry(validationData) {
  return { ...validationData, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
}

export async function readJsonBody(req, maxBytes = 16384) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('payload_too_large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw || '{}'); } catch { throw new Error('invalid_json'); }
}

/**
 * Persist a validated RSVP.
 *  - If GOOGLE_SHEETS_WEBHOOK_URL (passed in opts or via env) is set:
 *    forward the submission to the Sheets Apps Script webhook (durable).
 *  - Otherwise (local dev): append to a JSON Lines file.
 *  - Otherwise (Vercel, no durable storage): throw so the caller can answer 503
 *    instead of silently dropping the submission.
 *
 * Returns { backend: 'sheets' | 'jsonl' }.
 */
export async function persistSubmission(entry, opts = {}) {
  const webhookUrl = opts.webhookUrl ?? process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (webhookUrl) {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'rsvp', name: entry.name, guests: entry.guests, coming: entry.coming, createdAt: entry.createdAt }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`webhook_failed: ${res.status}`);
    return { backend: 'sheets' };
  }
  if (process.env.VERCEL) {
    throw new Error('sheets_unconfigured');
  }
  const dataDir = opts.dataDir ?? process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
  await mkdir(dataDir, { recursive: true });
  await appendFile(path.join(dataDir, 'rsvps.jsonl'), JSON.stringify(entry) + '\n', 'utf8');
  return { backend: 'jsonl' };
}
