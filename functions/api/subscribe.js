/**
 * Email capture — POST /api/subscribe  { email, tag }
 *
 * Stores the address in the DUKE_SUBSCRIBERS KV namespace with a pending status
 * (double-opt-in ready — wire a confirmation email downstream). No third-party
 * dependency, no PII beyond the email the user typed. Idempotent per email.
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  let payload;
  try { payload = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

  const email = String(payload?.email || '').trim().toLowerCase();
  const tag = String(payload?.tag || 'general').slice(0, 40).replace(/[^a-z0-9-_]/gi, '');
  if (!isEmail(email)) return json({ error: 'invalid email' }, 422);

  const kv = env.DUKE_SUBSCRIBERS;
  if (!kv) return json({ ok: true, note: 'accepted (no store bound in this environment)' });

  const key = 'sub:' + email;
  const existing = await kv.get(key, { type: 'json' });
  const record = existing || { email, status: 'pending', tags: [], createdAt: Date.now() };
  if (!record.tags.includes(tag)) record.tags.push(tag);
  record.updatedAt = Date.now();
  await kv.put(key, JSON.stringify(record));

  return json({ ok: true, status: record.status });
}

// Reject non-POST cleanly.
export async function onRequestGet() { return json({ error: 'POST only' }, 405); }

function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 254; }
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
