/**
 * Cryptographic helpers for the commit-reveal fairness protocol.
 *
 * Uses the Web Crypto API (`globalThis.crypto`), which is present in modern
 * browsers AND Node >= 20 — so the exact same code produces the exact same
 * commitment in the tests and in the group chat. No Node-only imports.
 */

const enc = new TextEncoder();

function requireCrypto() {
  const c = globalThis.crypto;
  if (!c || !c.subtle || typeof c.getRandomValues !== 'function') {
    throw new Error('Web Crypto (globalThis.crypto.subtle) is unavailable in this environment.');
  }
  return c;
}

/** Lowercase hex string of a Uint8Array. */
export function toHex(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Generate a cryptographically-random seed as a lowercase hex string.
 * Default 16 bytes (128 bits) — plenty of entropy, compact enough for a
 * shareable permalink.
 */
export function generateSeed(bytes = 16) {
  const c = requireCrypto();
  const buf = new Uint8Array(bytes);
  c.getRandomValues(buf);
  return toHex(buf);
}

/** SHA-256 of a UTF-8 string, returned as a lowercase hex digest. Async. */
export async function sha256Hex(message) {
  const c = requireCrypto();
  const digest = await c.subtle.digest('SHA-256', enc.encode(String(message)));
  return toHex(new Uint8Array(digest));
}

/**
 * Constant-ish-time hex string comparison. Draft-order verification is not a
 * high-value timing-attack target, but comparing digests without early-exit is
 * cheap and correct, so we do it.
 */
export function hexEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
