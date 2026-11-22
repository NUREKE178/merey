import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { rm } from 'node:fs/promises';

const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}`;
let server;

before(async () => {
  server = spawn(process.execPath, ['server.mjs'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: './data-test' },
    stdio: 'ignore',
  });
  // wait for server to listen
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
});

after(async () => {
  server.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 300));
  await rm('./data-test', { recursive: true, force: true });
});

test('GET /health returns ok', async () => {
  const res = await fetch(`${BASE}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, service: 'merey' });
});

test('GET / serves the site', async () => {
  const res = await fetch(`${BASE}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Мерей/);
  assert.match(html, /Қыз ұзату тойы/);
  assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
});

test('static assets are served with types', async () => {
  const css = await fetch(`${BASE}/assets/css/styles.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
  const js = await fetch(`${BASE}/assets/js/script.js`);
  assert.equal(js.status, 200);
});

test('security headers are set', async () => {
  const res = await fetch(`${BASE}/health`);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('content-security-policy') || '', /default-src 'self'/);
  assert.match(res.headers.get('content-security-policy') || '', /script-src 'self'/);
});

test('path traversal is blocked', async () => {
  const res = await fetch(`${BASE}/..%2F..%2Fpackage.json`);
  assert.ok([403, 404].includes(res.status));
});

test('RSVP: valid submission is stored', async () => {
  const res = await fetch(`${BASE}/api/rsvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Айдана Жарылғазықызы', guests: 3, coming: 'yes' }),
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test('RSVP: validation rejects bad input', async () => {
  const cases = [
    { name: '', guests: 2, coming: 'yes' },
    { name: 'А', guests: 2, coming: 'yes' },
    { name: 'Ақсүйек', guests: 0, coming: 'yes' },
    { name: 'Ақсүйек', guests: 2, coming: 'maybe' },
    { name: 'Ақсүйек', guests: 'abc', coming: 'yes' },
  ];
  for (const body of cases) {
    const res = await fetch(`${BASE}/api/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(res.status, 400, JSON.stringify(body));
  }
});

test('RSVP: GET is not allowed', async () => {
  const res = await fetch(`${BASE}/api/rsvp`);
  assert.equal(res.status, 405);
});
