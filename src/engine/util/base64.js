/**
 * Pure, cross-environment base64url for encoding the share permalink payload.
 * Avoids btoa/atob/Buffer branching so browser and Node produce identical
 * strings. URL-safe alphabet, no padding.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const LOOKUP = (() => {
  const t = new Int16Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) t[ALPHABET.charCodeAt(i)] = i;
  return t;
})();

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Encode a UTF-8 string to base64url (no padding). */
export function b64urlEncode(str) {
  const bytes = enc.encode(String(str));
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += ALPHABET[(n >>> 18) & 63] + ALPHABET[(n >>> 12) & 63] + ALPHABET[(n >>> 6) & 63] + ALPHABET[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += ALPHABET[(n >>> 18) & 63] + ALPHABET[(n >>> 12) & 63];
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += ALPHABET[(n >>> 18) & 63] + ALPHABET[(n >>> 12) & 63] + ALPHABET[(n >>> 6) & 63];
  }
  return out;
}

/** Decode base64url back to a UTF-8 string. Throws on malformed input. */
export function b64urlDecode(str) {
  const s = String(str);
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const v = c < 128 ? LOOKUP[c] : -1;
    if (v < 0) throw new Error('base64url: invalid character at ' + i);
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >>> bits) & 0xff);
    }
  }
  return dec.decode(new Uint8Array(bytes));
}
