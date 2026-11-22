/**
 * «Мерей» — Қыз ұзату тойы
 * Production server: serves the static site + persists RSVP submissions.
 * Zero dependencies — Node.js built-in http/fetch.
 *
 * Env:
 *   PORT (default 3000)
 *   DATA_DIR (default ./data)
 *   GOOGLE_SHEETS_WEBHOOK_URL — optional Google Apps Script web app URL;
 *     each accepted submission is also forwarded there (fire-and-forget).
 */
import http from 'node:http';
import { readFile, mkdir, appendFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const PORT = Number(process.env.PORT) || 3000;
const WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || '';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "img-src 'self'",
    "media-src 'self'",
    "font-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; '),
};

function send(res, status, body, { contentType = 'application/json', headers = {} } = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
    ...headers,
  });
  res.end(payload);
}

function sendJson(res, status, obj, headers = {}) {
  send(res, status, JSON.stringify(obj), { headers });
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) throw new Error('payload_too_large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw || '{}'); } catch { throw new Error('invalid_json'); }
}

/* simple in-memory rate limiter for RSVP posts: 6 requests per minute per IP */
const rateBuckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const bucket = rateBuckets.get(ip) || { start: now, count: 0 };
  if (now - bucket.start > windowMs) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  return bucket.count > 6;
}

function sanitizeText(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\x00-\x1f\x7f<>&"']/g, '').trim().slice(0, maxLen);
}

function validateRsvp(body) {
  const name = sanitizeText(body?.name, 80);
  const guests = Number(body?.guests);
  const coming = body?.coming;
  if (name.length < 2) return { ok: false, error: 'Қонақтың аты-жөнін дұрыс көрсетіңіз (кемінде 2 таңба).', field: 'name' };
  if (!Number.isInteger(guests) || guests < 1 || guests > 30) return { ok: false, error: 'Қонақтар саны 1-ден 30-ға дейін болуы керек.', field: 'guests' };
  if (coming !== 'yes' && coming !== 'no') return { ok: false, error: 'Тойға келу туралы жауабыңызды көрсетіңіз.', field: 'coming' };
  return { ok: true, data: { name, guests, coming } };
}

async function writeRsvp(data) {
  await mkdir(DATA_DIR, { recursive: true });
  const entry = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  await appendFile(path.join(DATA_DIR, 'rsvps.jsonl'), JSON.stringify(entry) + '\n', 'utf8');
  return entry;
}

async function forwardToWebhook(entry) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'rsvp', name: entry.name, guests: entry.guests, coming: entry.coming, createdAt: entry.createdAt }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.warn('webhook forward failed (non-fatal):', err.message);
  }
}

async function handleRsvp(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  if (rateLimited(ip)) {
    return sendJson(res, 429, { ok: false, error: 'Ықшамдап жатыр. Қайталап көріңіз.' });
  }
  let body;
  try { body = await readBody(req); } catch { return sendJson(res, 400, { ok: false, error: 'Мүмкіндіктер дұрыс емес.' }); }
  const result = validateRsvp(body);
  if (!result.ok) return sendJson(res, 400, { ok: false, error: result.error, field: result.field });
  try {
    const entry = await writeRsvp(result.data);
    forwardToWebhook(entry).catch(() => {});
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('RSVP persist failed:', err);
    return sendJson(res, 500, { ok: false, error: 'Жүйе сақтау жүйесімен қосыла алмады. Қайталап көріңіз.' });
  }
}

async function serveStatic(req, res, urlPath) {
  const clean = decodeURIComponent(urlPath).replace(/^\/+/, '').replace(/\.\./g, '');
  const safePath = path.join(PUBLIC, clean === '' ? 'index.html' : clean);
  if (!safePath.startsWith(PUBLIC)) return sendJson(res, 403, { error: 'forbidden' });
  try {
    const s = await stat(safePath);
    if (s.isDirectory()) return sendJson(res, 404, { error: 'not_found' });
    const type = CONTENT_TYPES[path.extname(safePath).toLowerCase()] || 'application/octet-stream';
    const data = await readFile(safePath);
    const headers = { 'Content-Type': type };
    if (safePath.endsWith('.html')) headers['Cache-Control'] = 'no-cache';
    else headers['Cache-Control'] = 'public, max-age=604800';
    return send(res, 200, data, { contentType: type, headers });
  } catch {
    return sendJson(res, 404, { error: 'not_found' });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const { pathname } = url;

    if (req.method === 'GET' && (pathname === '/health')) {
      return sendJson(res, 200, { ok: true, service: 'merey' });
    }
    if (pathname === '/api/rsvp') {
      if (req.method === 'POST') return await handleRsvp(req, res);
      return sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
    }
    if (req.method === 'GET' || req.method === 'HEAD') return await serveStatic(req, res, pathname);
    return sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { ok: false, error: 'internal_error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`«Мерей» site is running on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
